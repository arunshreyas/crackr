import 'server-only';
import { prisma } from '@/lib/server/db';
import { QuestionSubject, RevisionStatus } from '@prisma/client';
import { buildConceptKey, parseConceptKey } from '@/lib/server/concepts/metadata';
import { getUserConceptDiagnostics, AnalyzedConcept } from '@/lib/server/concepts/analysis';
import { RevisionItem, RevisionIncorrectQuestion, RevisionLinkedNote } from './types';
import { calculateRevisionPriority } from './prioritization';
import { isItemDueForReview } from './scheduling';

export interface GetRevisionQueueFilters {
  subject?: QuestionSubject | 'ALL';
  priorityTier?: RevisionItem['priorityTier'] | 'ALL';
  status?: RevisionStatus | 'ALL';
  dueOnly?: boolean;
}

/**
 * Builds the personalised, prioritized Smart Revision queue for an authenticated user.
 * Integrates Weak Concept Analysis, missed practice questions, saved revision notes,
 * and deterministic spaced repetition review schedules.
 */
export async function getUserRevisionQueue(
  userId: string,
  filters?: GetRevisionQueueFilters
): Promise<RevisionItem[]> {
  if (!userId) {
    throw new Error('UNAUTHORIZED: userId is required to generate revision queue');
  }

  const now = new Date();

  // 1. Fetch practice diagnostics, incorrect answers, saved notes, and revision records concurrently
  const [diagnosticsResult, incorrectAnswers, savedNotes, revisionRecords] = await Promise.all([
    getUserConceptDiagnostics(userId).catch(() => null),
    prisma.quizAnswer.findMany({
      where: { userId, isCorrect: false },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            subject: true,
            chapter: true,
            topic: true,
            difficulty: true,
            correctOption: true,
            explanation: true,
            options: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                label: true,
                text: true,
                position: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    }),
    prisma.revisionNote.findMany({
      where: { userId },
      select: {
        id: true,
        questionId: true,
        conceptKey: true,
        userNote: true,
        tags: true,
        keyTakeaway: true,
        createdAt: true,
        updatedAt: true,
      },
    }).catch(() => []), // Safely fallback if notes table is unavailable
    prisma.revisionRecord.findMany({
      where: { userId },
    }),
  ]);

  // If user has zero diagnostics, zero incorrect answers, zero notes, and zero revision records:
  // Strictly return empty queue (no fabricated data)
  const hasDiagnosticData = diagnosticsResult && diagnosticsResult.totalConceptsAttempted > 0;
  if (!hasDiagnosticData && incorrectAnswers.length === 0 && savedNotes.length === 0 && revisionRecords.length === 0) {
    return [];
  }

  // 2. Index revision records by conceptKey
  const revisionRecordMap = new Map<string, typeof revisionRecords[number]>();
  for (const rec of revisionRecords) {
    revisionRecordMap.set(rec.conceptKey, rec);
  }

  // 3. Index saved notes by conceptKey
  const notesByConcept = new Map<string, RevisionLinkedNote[]>();
  for (const n of savedNotes) {
    const list = notesByConcept.get(n.conceptKey) || [];
    list.push({
      id: n.id,
      questionId: n.questionId,
      userNote: n.userNote,
      tags: n.tags || [],
      keyTakeaway: n.keyTakeaway,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    });
    notesByConcept.set(n.conceptKey, list);
  }

  // 4. Index incorrect answers by conceptKey
  const incorrectByConcept = new Map<string, RevisionIncorrectQuestion[]>();
  for (const a of incorrectAnswers) {
    if (!a.question) continue;
    const cKey = buildConceptKey(a.question.subject, a.question.chapter, a.question.topic);
    const list = incorrectByConcept.get(cKey) || [];
    list.push({
      id: a.id,
      questionId: a.questionId,
      text: a.question.text,
      selectedOption: a.selectedOption,
      correctOption: a.question.correctOption,
      isCorrect: a.isCorrect,
      timeTakenSeconds: a.timeTakenSeconds,
      createdAt: a.createdAt.toISOString(),
      explanation: a.question.explanation,
      difficulty: a.question.difficulty,
      options: a.question.options || [],
    });
    incorrectByConcept.set(cKey, list);
  }

  // 5. Index diagnostics by conceptKey
  const diagnosticsByConcept = new Map<string, AnalyzedConcept>();
  if (diagnosticsResult) {
    diagnosticsResult.topWeakConcepts.forEach((c) => diagnosticsByConcept.set(c.conceptKey, c));
    Object.values(diagnosticsResult.conceptsBySubject).flat().forEach((c) => {
      if (!diagnosticsByConcept.has(c.conceptKey)) {
        diagnosticsByConcept.set(c.conceptKey, c);
      }
    });
  }

  // 6. Gather all unique candidate concept keys
  const candidateKeys = new Set<string>();

  // Add from diagnostics
  for (const [cKey, diag] of diagnosticsByConcept.entries()) {
    // Only queue items that need review: CRITICAL, NEEDS_ATTENTION, DEVELOPING, or have errors
    if (diag.weaknessLevel !== 'MASTERED' || diag.urgencyScore > 20) {
      candidateKeys.add(cKey);
    }
  }

  // Add from incorrect answers
  for (const cKey of incorrectByConcept.keys()) {
    candidateKeys.add(cKey);
  }

  // Add from saved notes
  for (const cKey of notesByConcept.keys()) {
    candidateKeys.add(cKey);
  }

  // Add from revision records
  for (const cKey of revisionRecordMap.keys()) {
    candidateKeys.add(cKey);
  }

  // 7. Assemble and evaluate each revision item
  const queueItems: RevisionItem[] = [];

  for (const conceptKey of candidateKeys) {
    const meta = parseConceptKey(conceptKey);
    const diag = diagnosticsByConcept.get(conceptKey);
    const rec = revisionRecordMap.get(conceptKey);
    const incorrectList = incorrectByConcept.get(conceptKey) || [];
    const notesList = notesByConcept.get(conceptKey) || [];

    const status: RevisionStatus = rec ? rec.status : RevisionStatus.NOT_REVIEWED;
    const reviewCount: number = rec ? rec.reviewCount : 0;
    const lastReviewedAt = rec?.lastReviewedAt ? rec.lastReviewedAt.toISOString() : null;
    const nextReviewDue = rec?.nextReviewDue ? rec.nextReviewDue.toISOString() : null;
    const isDue = isItemDueForReview(rec?.nextReviewDue, now);

    const totalAttempts = diag ? diag.totalAttempts : incorrectList.length;
    const incorrectAttempts = diag ? (diag.totalAttempts - diag.correctAttempts) : incorrectList.length;
    const accuracy = diag ? diag.accuracy : (totalAttempts > 0 ? 0 : null);
    const avgTimeSeconds = diag ? diag.avgTimeSeconds : null;
    const weaknessLevel = diag ? diag.weaknessLevel : 'UNCLASSIFIED';
    const trend = diag ? diag.trend : 'STABLE';
    const diagnosticTags = diag ? diag.diagnosticTags : [];
    const urgencyScore = diag ? diag.urgencyScore : (incorrectAttempts > 0 ? 60 : 20);

    const priorityInfo = calculateRevisionPriority({
      weaknessLevel,
      accuracy,
      totalAttempts,
      incorrectAttempts,
      trend,
      diagnosticTags,
      status,
      reviewCount,
      lastReviewedAt,
      nextReviewDue,
      savedNotesCount: notesList.length,
      now,
    });

    const item: RevisionItem = {
      conceptKey,
      subject: meta.subject,
      chapter: meta.chapter,
      topic: meta.topic,
      weaknessLevel,
      accuracy,
      totalAttempts,
      incorrectAttempts,
      avgTimeSeconds,
      diagnosticTags,
      urgencyScore,
      trend,
      status,
      reviewCount,
      lastReviewedAt,
      nextReviewDue,
      isDue,
      notes: rec?.notes || null,
      lastFeedback: rec?.lastFeedback || null,
      priorityScore: priorityInfo.priorityScore,
      priorityTier: priorityInfo.priorityTier,
      priorityReasons: priorityInfo.priorityReasons,
      recommendedAction: priorityInfo.recommendedAction,
      incorrectQuestionsCount: incorrectList.length,
      savedNotesCount: notesList.length,
    };

    queueItems.push(item);
  }

  // 8. Apply Optional Filters
  let filtered = queueItems;

  if (filters?.subject && filters.subject !== 'ALL') {
    filtered = filtered.filter((i) => i.subject === filters.subject);
  }

  if (filters?.priorityTier && filters.priorityTier !== 'ALL') {
    filtered = filtered.filter((i) => i.priorityTier === filters.priorityTier);
  }

  if (filters?.status && filters.status !== 'ALL') {
    filtered = filtered.filter((i) => i.status === filters.status);
  }

  if (filters?.dueOnly) {
    filtered = filtered.filter((i) => i.isDue);
  }

  // 9. Deterministic Sort:
  // Primary: Priority Score DESC
  // Secondary: isDue DESC (due items first within same priority band)
  // Tertiary: Incorrect Attempts DESC
  // Quaternary: Urgency Score DESC
  filtered.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    if (a.isDue !== b.isDue) {
      return a.isDue ? -1 : 1;
    }
    if (b.incorrectAttempts !== a.incorrectAttempts) {
      return b.incorrectAttempts - a.incorrectAttempts;
    }
    return b.urgencyScore - a.urgencyScore;
  });

  return filtered;
}

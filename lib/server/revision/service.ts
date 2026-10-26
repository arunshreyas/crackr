import 'server-only';
import { prisma } from '@/lib/server/db';
import { QuestionSubject, RevisionStatus } from '@prisma/client';
import { parseConceptKey } from '@/lib/server/concepts/metadata';
import { getUserConceptDiagnostics } from '@/lib/server/concepts/analysis';
import {
  RevisionDashboardPayload,
  RevisionProgressSummary,
  MarkReviewedInput,
  RevisionIncorrectQuestion,
  RevisionLinkedNote,
} from './types';
import { getUserRevisionQueue } from './queue';
import { calculateNextReviewDue, isItemDueForReview } from './scheduling';

/**
 * Loads the complete Smart Revision dashboard payload for an authenticated user.
 * Guarantees zero fabricated data when a user has no prior activity.
 */
export async function getRevisionDashboardData(userId: string): Promise<RevisionDashboardPayload> {
  if (!userId) {
    throw new Error('UNAUTHORIZED: userId is required to fetch revision dashboard');
  }

  const queue = await getUserRevisionQueue(userId);

  // If user has no revision items in queue, return clean empty state
  if (queue.length === 0) {
    return {
      queue: [],
      progress: {
        totalQueueItems: 0,
        dueTodayCount: 0,
        reviewedCount: 0,
        needsPracticeCount: 0,
        notReviewedCount: 0,
        overallMasteryPercent: 0,
        revisionStreakDays: 0,
        subjectDistribution: {
          PHYSICS: { total: 0, due: 0, reviewed: 0 },
          CHEMISTRY: { total: 0, due: 0, reviewed: 0 },
          MATHEMATICS: { total: 0, due: 0, reviewed: 0 },
        },
      },
      recentIncorrectQuestions: [],
      savedNotesSummary: {
        totalNotes: 0,
        notes: [],
      },
      hasHistory: false,
    };
  }

  // 1. Compute Progress Summary
  let dueTodayCount = 0;
  let reviewedCount = 0;
  let needsPracticeCount = 0;
  let notReviewedCount = 0;
  let accuracySum = 0;
  let accuracyCount = 0;

  const subjectDistribution: Record<QuestionSubject, { total: number; due: number; reviewed: number }> = {
    PHYSICS: { total: 0, due: 0, reviewed: 0 },
    CHEMISTRY: { total: 0, due: 0, reviewed: 0 },
    MATHEMATICS: { total: 0, due: 0, reviewed: 0 },
  };

  for (const item of queue) {
    if (item.isDue) dueTodayCount++;
    if (item.status === RevisionStatus.REVIEWED) reviewedCount++;
    else if (item.status === RevisionStatus.NEEDS_PRACTICE) needsPracticeCount++;
    else notReviewedCount++;

    if (item.accuracy !== null) {
      accuracySum += item.accuracy;
      accuracyCount++;
    }

    if (subjectDistribution[item.subject]) {
      subjectDistribution[item.subject].total++;
      if (item.isDue) subjectDistribution[item.subject].due++;
      if (item.status === RevisionStatus.REVIEWED) subjectDistribution[item.subject].reviewed++;
    }
  }

  const overallMasteryPercent = accuracyCount > 0 ? Math.round(accuracySum / accuracyCount) : 0;

  // 2. Compute Revision Activity Streak (consecutive days with reviews)
  const recentRecords = await prisma.revisionRecord.findMany({
    where: {
      userId,
      lastReviewedAt: { not: null },
    },
    select: { lastReviewedAt: true },
    orderBy: { lastReviewedAt: 'desc' },
  });

  let revisionStreakDays = 0;
  if (recentRecords.length > 0) {
    const dates = new Set<string>();
    for (const r of recentRecords) {
      if (r.lastReviewedAt) {
        dates.add(r.lastReviewedAt.toISOString().slice(0, 10));
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // If active today or yesterday, count backwards
    let checkDate = new Date();
    if (!dates.has(todayStr) && dates.has(yesterdayStr)) {
      checkDate = new Date(Date.now() - 86400000);
    }

    while (dates.has(checkDate.toISOString().slice(0, 10))) {
      revisionStreakDays++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    }
  }

  const progress: RevisionProgressSummary = {
    totalQueueItems: queue.length,
    dueTodayCount,
    reviewedCount,
    needsPracticeCount,
    notReviewedCount,
    overallMasteryPercent,
    revisionStreakDays,
    subjectDistribution,
  };

  // 3. Fetch Recent Incorrect Questions (take 8 for quick review panel)
  const rawIncorrect = await prisma.quizAnswer.findMany({
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
    take: 8,
  });

  const recentIncorrectQuestions: RevisionIncorrectQuestion[] = rawIncorrect
    .filter((a) => a.question !== null)
    .map((a) => ({
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
    }));

  // 4. Fetch Saved Notes Summary
  const savedNotes = await prisma.revisionNote.findMany({
    where: { userId },
    select: {
      id: true,
      questionId: true,
      userNote: true,
      tags: true,
      keyTakeaway: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  }).catch(() => []);

  const notesList: RevisionLinkedNote[] = savedNotes.map((n) => ({
    id: n.id,
    questionId: n.questionId,
    userNote: n.userNote,
    tags: n.tags || [],
    keyTakeaway: n.keyTakeaway,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));

  return {
    queue,
    progress,
    recentIncorrectQuestions,
    savedNotesSummary: {
      totalNotes: savedNotes.length,
      notes: notesList,
    },
    hasHistory: true,
  };
}

/**
 * Retrieves detailed context for an individual concept revision item.
 * Includes all incorrect questions, saved notes, diagnostic history, and available practice question count.
 */
export async function getRevisionItemDetail(userId: string, conceptKey: string) {
  if (!userId || !conceptKey) {
    throw new Error('UNAUTHORIZED: userId and conceptKey are required');
  }

  const meta = parseConceptKey(conceptKey);
  const now = new Date();

  const [diagnosticsResult, revisionRecord, rawIncorrect, savedNotes, availableQuestionCount] =
    await Promise.all([
      getUserConceptDiagnostics(userId).catch(() => null),
      prisma.revisionRecord.findUnique({
        where: {
          userId_conceptKey: { userId, conceptKey },
        },
      }),
      prisma.quizAnswer.findMany({
        where: {
          userId,
          isCorrect: false,
          question: {
            subject: meta.subject,
            chapter: meta.chapter,
            ...(meta.topic && meta.topic !== meta.chapter ? { topic: meta.topic } : {}),
          },
        },
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
        take: 20,
      }),
      prisma.revisionNote.findMany({
        where: {
          userId,
          conceptKey,
        },
        include: {
          question: {
            include: {
              options: {
                orderBy: { position: 'asc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      prisma.question.count({
        where: {
          type: 'MCQ',
          subject: meta.subject,
          chapter: meta.chapter,
          ...(meta.topic && meta.topic !== meta.chapter ? { topic: meta.topic } : {}),
        },
      }),
    ]);

  // Find specific diagnostics for this concept
  let diag = diagnosticsResult?.topWeakConcepts.find((c) => c.conceptKey === conceptKey);
  if (!diag && diagnosticsResult) {
    const list = diagnosticsResult.conceptsBySubject[meta.subject] || [];
    diag = list.find((c) => c.conceptKey === conceptKey);
  }

  const incorrectQuestions: RevisionIncorrectQuestion[] = rawIncorrect
    .filter((a) => a.question !== null)
    .map((a) => ({
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
    }));

  return {
    conceptKey,
    subject: meta.subject,
    chapter: meta.chapter,
    topic: meta.topic,
    diagnostics: diag || null,
    revisionRecord: revisionRecord
      ? {
          id: revisionRecord.id,
          status: revisionRecord.status,
          reviewCount: revisionRecord.reviewCount,
          lastReviewedAt: revisionRecord.lastReviewedAt?.toISOString() || null,
          nextReviewDue: revisionRecord.nextReviewDue?.toISOString() || null,
          isDue: isItemDueForReview(revisionRecord.nextReviewDue, now),
          notes: revisionRecord.notes,
          lastFeedback: revisionRecord.lastFeedback,
        }
      : null,
    incorrectQuestions,
    savedNotes,
    availablePracticeCount: availableQuestionCount,
  };
}

/**
 * Authoritatively marks a revision item as reviewed, needs practice, or not reviewed.
 * Enforces ownership, server-side validation, and idempotency against repeated button clicks.
 * Does NOT mark the student as having mastered the concept.
 */
export async function markConceptReviewed(input: MarkReviewedInput) {
  const { userId, conceptKey, status, notes, feedback } = input;

  if (!userId) {
    throw new Error('UNAUTHORIZED: userId is required');
  }
  if (!conceptKey || typeof conceptKey !== 'string') {
    throw new Error('INVALID_INPUT: conceptKey is required');
  }
  if (!Object.values(RevisionStatus).includes(status)) {
    throw new Error('INVALID_INPUT: status must be a valid RevisionStatus');
  }

  const meta = parseConceptKey(conceptKey);
  const now = new Date();

  // 1. Fetch existing revision record to check review count and prevent duplicate rapid clicks
  const existing = await prisma.revisionRecord.findUnique({
    where: {
      userId_conceptKey: { userId, conceptKey },
    },
  });

  // Idempotency: If review was completed within the last 5 seconds with the same status,
  // return existing record without double-incrementing review count
  if (
    existing &&
    existing.status === status &&
    existing.lastReviewedAt &&
    now.getTime() - existing.lastReviewedAt.getTime() < 5000
  ) {
    return existing;
  }

  // Calculate new review count
  const newReviewCount = existing ? existing.reviewCount + 1 : 1;

  // Calculate next scheduled due date deterministically
  const nextReviewDue = calculateNextReviewDue(status, newReviewCount, now);

  // Upsert record atomically
  const updated = await prisma.revisionRecord.upsert({
    where: {
      userId_conceptKey: { userId, conceptKey },
    },
    create: {
      userId,
      conceptKey,
      subject: meta.subject,
      chapter: meta.chapter,
      topic: meta.topic,
      status,
      reviewCount: newReviewCount,
      lastReviewedAt: now,
      nextReviewDue,
      notes: notes?.trim() || null,
      lastFeedback: feedback?.trim() || null,
    },
    update: {
      status,
      reviewCount: newReviewCount,
      lastReviewedAt: now,
      nextReviewDue,
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      ...(feedback !== undefined ? { lastFeedback: feedback?.trim() || null } : {}),
    },
  });

  return updated;
}

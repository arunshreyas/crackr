import 'server-only';
import { prisma } from '@/lib/server/db';
import { QuestionSubject, OptionLabel, Prisma, QuestionOption } from '@prisma/client';
import { buildConceptKey } from '@/lib/server/concepts/metadata';
import { getUserConceptDiagnostics, AnalyzedConcept } from '@/lib/server/concepts/analysis';

type DbNoteWithQuestion = Prisma.RevisionNoteGetPayload<{
  include: {
    question: {
      include: {
        options: true;
      };
    };
  };
}>;

export interface SaveNoteInput {
  userId: string;
  questionId: string;
  userNote?: string | null;
  tags?: string[];
  keyTakeaway?: string | null;
}

export interface UpdateNoteInput {
  userNote?: string | null;
  tags?: string[];
  keyTakeaway?: string | null;
}

export interface NoteQuestionOption {
  id: string;
  label: OptionLabel;
  text: string;
  position: number;
}

export interface EnrichedRevisionNote {
  id: string;
  userId: string;
  questionId: string;
  userNote: string | null;
  tags: string[];
  subject: QuestionSubject;
  chapter: string;
  topic: string | null;
  conceptKey: string;
  keyTakeaway: string | null;
  createdAt: string;
  updatedAt: string;
  question: {
    id: string;
    text: string;
    subject: QuestionSubject;
    chapter: string;
    topic: string | null;
    year: number | null;
    paperTitle: string | null;
    difficulty: string | null;
    correctOption: OptionLabel;
    explanation: string | null;
    options: NoteQuestionOption[];
  };
  conceptDiagnostic?: {
    weaknessLevel: AnalyzedConcept['weaknessLevel'];
    accuracy: number;
    urgencyScore: number;
    recommendedAction: string;
    diagnosticTags: string[];
  };
}

export interface RevisionNotesSummary {
  totalNotes: number;
  subjectCounts: Record<QuestionSubject, number>;
  weakConceptNotesCount: number;
  distinctChaptersCount: number;
  distinctConceptsCount: number;
  recentNotes: EnrichedRevisionNote[];
}

/**
 * Saves a question as a revision note for the authenticated user.
 * Idempotent: If note already exists, updates userNote, tags, and keyTakeaway.
 */
export async function saveRevisionNote(input: SaveNoteInput): Promise<EnrichedRevisionNote> {
  const { userId, questionId, userNote, tags = [], keyTakeaway } = input;

  // 1. Fetch question to retrieve official topic & explanation
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      options: {
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!question) {
    throw new Error('Question not found');
  }

  const conceptKey = buildConceptKey(question.subject, question.chapter, question.topic);

  // 2. Derive key takeaway if none provided
  const derivedTakeaway = keyTakeaway?.trim() || deriveConceptTakeaway(question.text, question.explanation, question.chapter, question.topic);

  // 3. Upsert note
  const note = await prisma.revisionNote.upsert({
    where: {
      userId_questionId: {
        userId,
        questionId,
      },
    },
    create: {
      userId,
      questionId,
      userNote: userNote?.trim() || null,
      tags: tags.map((t) => t.trim()).filter(Boolean),
      subject: question.subject,
      chapter: question.chapter,
      topic: question.topic,
      conceptKey,
      keyTakeaway: derivedTakeaway,
    },
    update: {
      ...(userNote !== undefined ? { userNote: userNote?.trim() || null } : {}),
      ...(tags !== undefined ? { tags: tags.map((t) => t.trim()).filter(Boolean) } : {}),
      ...(keyTakeaway !== undefined ? { keyTakeaway: derivedTakeaway } : {}),
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
  });

  return formatEnrichedNote(note);
}

/**
 * Retrieves saved revision notes for a user with optional filtering by subject, conceptKey, or search.
 * Enforces ownership check by filtering by userId.
 */
export async function getUserRevisionNotes(
  userId: string,
  filters?: {
    subject?: QuestionSubject | 'ALL';
    conceptKey?: string;
    chapter?: string;
    search?: string;
    weakOnly?: boolean;
    tag?: string;
  }
): Promise<EnrichedRevisionNote[]> {
  const whereClause: Prisma.RevisionNoteWhereInput = { userId };

  if (filters?.subject && filters.subject !== 'ALL') {
    whereClause.subject = filters.subject;
  }

  if (filters?.conceptKey) {
    whereClause.conceptKey = filters.conceptKey;
  }

  if (filters?.chapter && filters.chapter !== 'ALL') {
    whereClause.chapter = filters.chapter;
  }

  if (filters?.tag) {
    whereClause.tags = { has: filters.tag };
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim();
    whereClause.OR = [
      { chapter: { contains: q, mode: 'insensitive' } },
      { topic: { contains: q, mode: 'insensitive' } },
      { userNote: { contains: q, mode: 'insensitive' } },
      { keyTakeaway: { contains: q, mode: 'insensitive' } },
      { question: { text: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [notes, diagnostics] = await Promise.all([
    prisma.revisionNote.findMany({
      where: whereClause,
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
    }),
    getUserConceptDiagnostics(userId).catch(() => null),
  ]);

  // Build diagnostics lookup by conceptKey
  const diagMap = new Map<string, AnalyzedConcept>();
  if (diagnostics) {
    diagnostics.topWeakConcepts.forEach((c) => diagMap.set(c.conceptKey, c));
    Object.values(diagnostics.conceptsBySubject).flat().forEach((c) => {
      if (!diagMap.has(c.conceptKey)) diagMap.set(c.conceptKey, c);
    });
  }

  let enriched = notes.map((n) => {
    const diag = diagMap.get(n.conceptKey);
    return formatEnrichedNote(n, diag);
  });

  if (filters?.weakOnly) {
    enriched = enriched.filter((n) => {
      const level = n.conceptDiagnostic?.weaknessLevel;
      return level === 'CRITICAL_WEAKNESS' || level === 'NEEDS_ATTENTION';
    });
  }

  return enriched;
}

/**
 * Retrieves a single revision note by ID, enforcing user ownership.
 */
export async function getRevisionNoteById(userId: string, noteId: string): Promise<EnrichedRevisionNote | null> {
  const note = await prisma.revisionNote.findFirst({
    where: { id: noteId, userId },
    include: {
      question: {
        include: {
          options: {
            orderBy: { position: 'asc' },
          },
        },
      },
    },
  });

  if (!note) return null;

  const diagnostics = await getUserConceptDiagnostics(userId).catch(() => null);
  const diag = diagnostics?.topWeakConcepts.find((c) => c.conceptKey === note.conceptKey);

  return formatEnrichedNote(note, diag);
}

/**
 * Updates a revision note's custom user annotations or tags with ownership enforcement.
 */
export async function updateRevisionNote(
  userId: string,
  noteId: string,
  updates: UpdateNoteInput
): Promise<EnrichedRevisionNote> {
  const existing = await prisma.revisionNote.findFirst({
    where: { id: noteId, userId },
  });

  if (!existing) {
    throw new Error('Revision note not found or unauthorized');
  }

  const updated = await prisma.revisionNote.update({
    where: { id: noteId },
    data: {
      ...(updates.userNote !== undefined ? { userNote: updates.userNote?.trim() || null } : {}),
      ...(updates.tags !== undefined ? { tags: updates.tags.map((t) => t.trim()).filter(Boolean) } : {}),
      ...(updates.keyTakeaway !== undefined ? { keyTakeaway: updates.keyTakeaway?.trim() || null } : {}),
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
  });

  return formatEnrichedNote(updated);
}

/**
 * Deletes a revision note with ownership enforcement.
 */
export async function deleteRevisionNote(userId: string, noteId: string): Promise<boolean> {
  const existing = await prisma.revisionNote.findFirst({
    where: { id: noteId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error('Revision note not found or unauthorized');
  }

  await prisma.revisionNote.delete({
    where: { id: noteId },
  });

  return true;
}

/**
 * Returns a list of questionIds that have been saved by the user.
 * Fast, lightweight query for showing bookmark states in practice sessions.
 */
export async function getSavedQuestionIdsForUser(userId: string): Promise<string[]> {
  const notes = await prisma.revisionNote.findMany({
    where: { userId },
    select: { questionId: true },
  });

  return notes.map((n) => n.questionId);
}

/**
 * Aggregates diagnostic statistics for the user's saved notes.
 */
export async function getNotesSummary(userId: string): Promise<RevisionNotesSummary> {
  const notes = await getUserRevisionNotes(userId);

  const subjectCounts: Record<QuestionSubject, number> = {
    PHYSICS: 0,
    CHEMISTRY: 0,
    MATHEMATICS: 0,
  };

  const chaptersSet = new Set<string>();
  const conceptsSet = new Set<string>();
  let weakConceptNotesCount = 0;

  for (const n of notes) {
    if (subjectCounts[n.subject] !== undefined) {
      subjectCounts[n.subject]++;
    }
    chaptersSet.add(n.chapter);
    conceptsSet.add(n.conceptKey);
    const level = n.conceptDiagnostic?.weaknessLevel;
    if (level === 'CRITICAL_WEAKNESS' || level === 'NEEDS_ATTENTION') {
      weakConceptNotesCount++;
    }
  }

  return {
    totalNotes: notes.length,
    subjectCounts,
    weakConceptNotesCount,
    distinctChaptersCount: chaptersSet.size,
    distinctConceptsCount: conceptsSet.size,
    recentNotes: notes.slice(0, 5),
  };
}

/**
 * Helper to derive a concise core takeaway from the question context and explanation.
 */
function deriveConceptTakeaway(
  _questionText: string,
  explanation: string | null,
  chapter: string,
  topic: string | null
): string {
  const topicLabel = topic || chapter;
  if (!explanation) {
    return `Core concept: ${topicLabel} (${chapter}). Focus on fundamental formulas and standard problem patterns.`;
  }

  // Extract first meaningful sentence or theorem statement from explanation
  const cleaned = explanation
    .replace(/<source[\s\S]*?>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .trim();

  const lines = cleaned.split('\n').map((l) => l.trim()).filter((l) => l.length > 10 && !l.startsWith('<'));
  const firstInsight = lines.find((l) => !l.startsWith('$$') && !l.startsWith('Given') && !l.startsWith('Digits ='));

  if (firstInsight && firstInsight.length <= 160) {
    return firstInsight;
  }

  return `Key principle in ${topicLabel}: Review standard relations in ${chapter} and avoid common calculation traps.`;
}

function formatEnrichedNote(note: DbNoteWithQuestion, diag?: AnalyzedConcept): EnrichedRevisionNote {
  return {
    id: note.id,
    userId: note.userId,
    questionId: note.questionId,
    userNote: note.userNote,
    tags: note.tags || [],
    subject: note.subject,
    chapter: note.chapter,
    topic: note.topic,
    conceptKey: note.conceptKey,
    keyTakeaway: note.keyTakeaway,
    createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : String(note.createdAt),
    updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : String(note.updatedAt),
    question: {
      id: note.question.id,
      text: note.question.text,
      subject: note.question.subject,
      chapter: note.question.chapter,
      topic: note.question.topic,
      year: note.question.year,
      paperTitle: note.question.paperTitle,
      difficulty: note.question.difficulty,
      correctOption: note.question.correctOption,
      explanation: note.question.explanation,
      options: (note.question.options || []).map((o: QuestionOption) => ({
        id: o.id,
        label: o.label,
        text: o.text,
        position: o.position,
      })),
    },
    conceptDiagnostic: diag
      ? {
          weaknessLevel: diag.weaknessLevel,
          accuracy: diag.accuracy,
          urgencyScore: diag.urgencyScore,
          recommendedAction: diag.recommendedAction,
          diagnosticTags: diag.diagnosticTags,
        }
      : undefined,
  };
}

import 'server-only';
import { prisma } from '@/lib/server/db';
import { QuestionSubject, OptionLabel } from '@prisma/client';

export interface ChapterCatalogItem {
  name: string;
  questionCount: number;
}

export interface SubjectCatalog {
  PHYSICS: ChapterCatalogItem[];
  CHEMISTRY: ChapterCatalogItem[];
  MATHEMATICS: ChapterCatalogItem[];
}

export interface ClientSafeOption {
  id: string;
  label: OptionLabel;
  text: string;
  position: number;
}

export interface ClientSafeQuestion {
  id: string;
  text: string;
  subject: QuestionSubject;
  chapter: string;
  topic: string | null;
  year: number | null;
  paperTitle: string | null;
  difficulty: string | null;
  options: ClientSafeOption[];
  // NOTE: correctOption and explanation are NEVER returned here
}

/**
 * Returns available chapters and question counts grouped by subject.
 */
export async function getSubjectChapterCatalog(): Promise<SubjectCatalog> {
  const groups = await prisma.question.groupBy({
    by: ['subject', 'chapter'],
    where: { type: 'MCQ' },
    _count: { id: true },
    orderBy: { chapter: 'asc' },
  });

  const catalog: SubjectCatalog = {
    PHYSICS: [],
    CHEMISTRY: [],
    MATHEMATICS: [],
  };

  for (const g of groups) {
    if (g.subject && catalog[g.subject]) {
      catalog[g.subject].push({
        name: g.chapter,
        questionCount: g._count.id,
      });
    }
  }

  return catalog;
}

export function normalizeDifficulty(diff?: string | null): string | undefined {
  if (!diff) return undefined;
  const upper = diff.trim().toUpperCase();
  if (upper === 'ALL' || upper === 'ANY' || upper === 'MIXED') return undefined;
  if (upper === 'MODERATE' || upper === 'MEDIUM' || upper === 'MED' || upper === 'STANDARD') return 'MEDIUM';
  if (upper === 'EASY' || upper === 'EZ' || upper === 'FOUNDATION') return 'EASY';
  if (upper === 'HARD' || upper === 'DIFFICULT' || upper === 'CHALLENGER' || upper === 'ADVANCED') return 'HARD';
  return undefined;
}

/**
 * Retrieves questions for a practice session with strict answer security.
 */
export async function getQuestionsForPractice(params: {
  subject?: QuestionSubject;
  chapter?: string;
  difficulty?: string;
  count: number;
}): Promise<ClientSafeQuestion[]> {
  const { subject, chapter, difficulty, count = 10 } = params;
  const normalizedDiff = normalizeDifficulty(difficulty);

  const baseWhere: Record<string, unknown> = {
    type: 'MCQ',
  };

  if (subject) baseWhere.subject = subject;
  if (chapter && chapter !== 'ALL') {
    baseWhere.chapter = chapter;
  }

  const whereWithDiff = normalizedDiff
    ? { ...baseWhere, difficulty: normalizedDiff }
    : baseWhere;

  const selectFields = {
    id: true,
    text: true,
    subject: true,
    chapter: true,
    topic: true,
    year: true,
    paperTitle: true,
    difficulty: true,
    options: {
      orderBy: { position: 'asc' as const },
      select: {
        id: true,
        label: true,
        text: true,
        position: true,
      },
    },
  };

  // 1. Fetch candidate questions with difficulty filter (if requested)
  let questions = await prisma.question.findMany({
    where: whereWithDiff,
    take: count * 4,
    select: selectFields,
  });

  // 2. If filtered difficulty returned 0 questions (e.g. rare chapter combo), fallback to base chapter/subject
  if (questions.length === 0 && normalizedDiff) {
    questions = await prisma.question.findMany({
      where: baseWhere,
      take: count * 4,
      select: selectFields,
    });
  }

  // 3. If still 0 (e.g. rare chapter mismatch), fallback to subject
  if (questions.length === 0 && subject) {
    questions = await prisma.question.findMany({
      where: { type: 'MCQ', subject },
      take: count * 4,
      select: selectFields,
    });
  }

  // Shuffle and slice to desired count
  const shuffled = questions.sort(() => 0.5 - Math.random()).slice(0, count);

  return shuffled.map((q) => ({
    id: q.id,
    text: q.text,
    subject: q.subject,
    chapter: q.chapter,
    topic: q.topic,
    year: q.year,
    paperTitle: q.paperTitle,
    difficulty: q.difficulty,
    options: q.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      text: opt.text,
      position: opt.position,
    })),
  }));
}

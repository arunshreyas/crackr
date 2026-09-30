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

  const where: Record<string, unknown> = {
    type: 'MCQ',
  };

  if (subject) where.subject = subject;
  if (chapter && chapter !== 'ALL') {
    where.chapter = chapter;
  }
  if (difficulty && difficulty !== 'ALL') {
    where.difficulty = difficulty.toUpperCase();
  }

  // Fetch candidate questions
  const questions = await prisma.question.findMany({
    where,
    take: count * 3, // Sample pool for pseudo-random selection
    select: {
      id: true,
      text: true,
      subject: true,
      chapter: true,
      topic: true,
      year: true,
      paperTitle: true,
      difficulty: true,
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
  });

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

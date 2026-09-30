import { prisma } from '@/lib/prisma';
import { QuestionSubject, OptionLabel } from '@prisma/client';

export interface PracticeQuestionFilter {
  subject?: 'PHYSICS' | 'CHEMISTRY' | 'MATHEMATICS';
  chapter?: string;
  topic?: string;
  difficulty?: string;
  year?: number;
  count?: number;
  seed?: number;
}

export interface ClientQuestionOption {
  id: string;
  label: OptionLabel;
  text: string;
  position: number;
}

export interface ClientPracticeQuestion {
  id: string;
  text: string;
  subject: QuestionSubject;
  chapter: string;
  topic: string | null;
  year: number | null;
  paperTitle: string | null;
  difficulty: string | null;
  options: ClientQuestionOption[];
  // NOTE: correctOption and explanation are NEVER exposed to client before answer submission
}

export interface QuestionSubmissionResult {
  questionId: string;
  userOption: OptionLabel;
  isCorrect: boolean;
  correctOption: OptionLabel;
  explanation: string | null;
}

/**
 * Server-side retrieval service for practice questions.
 * Enforces strict security: never leaks correct answers in the returned question objects.
 */
export async function getPracticeQuestions(
  filter: PracticeQuestionFilter = {}
): Promise<ClientPracticeQuestion[]> {
  const {
    subject,
    chapter,
    topic,
    difficulty,
    year,
    count = 10,
  } = filter;

  // Build Prisma where conditions
  const where: Record<string, unknown> = {
    type: 'MCQ',
  };

  if (subject) {
    where.subject = subject;
  }
  if (chapter) {
    where.chapter = {
      contains: chapter,
      mode: 'insensitive',
    };
  }
  if (topic) {
    where.topic = {
      contains: topic,
      mode: 'insensitive',
    };
  }
  if (difficulty) {
    where.difficulty = {
      equals: difficulty.toUpperCase(),
      mode: 'insensitive',
    };
  }
  if (year) {
    where.year = year;
  }

  // Fetch canonical questions from PostgreSQL
  const questions = await prisma.question.findMany({
    where,
    take: count,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      options: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  });

  // Strip correct answer and explanation for client safety
  return questions.map((q) => ({
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

/**
 * Validates a user's answer submission securely on the server.
 */
export async function verifyQuestionAnswer(
  questionId: string,
  selectedOption: OptionLabel
): Promise<QuestionSubmissionResult | null> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      correctOption: true,
      explanation: true,
    },
  });

  if (!question) {
    return null;
  }

  const isCorrect = question.correctOption === selectedOption;

  return {
    questionId: question.id,
    userOption: selectedOption,
    isCorrect,
    correctOption: question.correctOption,
    explanation: question.explanation,
  };
}

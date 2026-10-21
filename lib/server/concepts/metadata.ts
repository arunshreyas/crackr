import 'server-only';
import { QuestionSubject } from '@prisma/client';

export interface ConceptMetadata {
  subject: QuestionSubject;
  chapter: string;
  topic: string;
  conceptKey: string;
}

export interface TaxonomyAuditReport {
  totalQuestions: number;
  totalChapters: number;
  totalConcepts: number;
  nullTopicCount: number;
  emptyTopicCount: number;
  subjectBreakdown: Record<
    QuestionSubject,
    {
      questionCount: number;
      chapterCount: number;
      conceptCount: number;
    }
  >;
  difficultyDistribution: Record<string, number>;
}

/**
 * Normalizes a topic string. If null, empty, or whitespace, falls back to the chapter name.
 */
export function normalizeTopicName(topic?: string | null, fallbackChapter: string = 'General'): string {
  if (!topic || typeof topic !== 'string') {
    return fallbackChapter.trim() || 'General';
  }
  const trimmed = topic.trim();
  if (trimmed.length === 0) {
    return fallbackChapter.trim() || 'General';
  }
  return trimmed;
}

/**
 * Produces a stable, canonical concept key for grouping and diagnostics:
 * Format: "SUBJECT::Chapter Name::Topic Name"
 */
export function buildConceptKey(
  subject: QuestionSubject,
  chapter: string,
  topic?: string | null
): string {
  const normChapter = chapter ? chapter.trim() : 'General';
  const normTopic = normalizeTopicName(topic, normChapter);
  return `${subject}::${normChapter}::${normTopic}`;
}

/**
 * Parses a canonical concept key back into its components.
 */
export function parseConceptKey(key: string): ConceptMetadata {
  const parts = key.split('::');
  const subject = (parts[0] || 'PHYSICS') as QuestionSubject;
  const chapter = parts[1] || 'General';
  const topic = parts[2] || chapter;

  return {
    subject,
    chapter,
    topic,
    conceptKey: key,
  };
}

/**
 * Audits the question bank metadata to detect missing or irregular concept fields.
 */
export async function auditConceptTaxonomy(prismaClient: any): Promise<TaxonomyAuditReport> {
  const [totalQuestions, rawRecords] = await Promise.all([
    prismaClient.question.count(),
    prismaClient.question.findMany({
      select: {
        id: true,
        subject: true,
        chapter: true,
        topic: true,
        difficulty: true,
      },
    }),
  ]);

  let nullTopicCount = 0;
  let emptyTopicCount = 0;
  const conceptKeysBySubject: Record<QuestionSubject, Set<string>> = {
    PHYSICS: new Set<string>(),
    CHEMISTRY: new Set<string>(),
    MATHEMATICS: new Set<string>(),
  };
  const chaptersBySubject: Record<QuestionSubject, Set<string>> = {
    PHYSICS: new Set<string>(),
    CHEMISTRY: new Set<string>(),
    MATHEMATICS: new Set<string>(),
  };
  const subjectCounts: Record<QuestionSubject, number> = {
    PHYSICS: 0,
    CHEMISTRY: 0,
    MATHEMATICS: 0,
  };
  const difficultyDistribution: Record<string, number> = {};

  for (const q of rawRecords) {
    if (q.topic === null || q.topic === undefined) {
      nullTopicCount++;
    } else if (typeof q.topic === 'string' && q.topic.trim().length === 0) {
      emptyTopicCount++;
    }

    const subj = q.subject as QuestionSubject;
    if (subjectCounts[subj] !== undefined) {
      subjectCounts[subj]++;
      chaptersBySubject[subj].add(q.chapter.trim());
      const cKey = buildConceptKey(subj, q.chapter, q.topic);
      conceptKeysBySubject[subj].add(cKey);
    }

    const diff = (q.difficulty || 'UNSPECIFIED').toUpperCase();
    difficultyDistribution[diff] = (difficultyDistribution[diff] || 0) + 1;
  }

  const allConceptKeys = new Set<string>([
    ...conceptKeysBySubject.PHYSICS,
    ...conceptKeysBySubject.CHEMISTRY,
    ...conceptKeysBySubject.MATHEMATICS,
  ]);

  const allChapters = new Set<string>([
    ...chaptersBySubject.PHYSICS,
    ...chaptersBySubject.CHEMISTRY,
    ...chaptersBySubject.MATHEMATICS,
  ]);

  return {
    totalQuestions,
    totalChapters: allChapters.size,
    totalConcepts: allConceptKeys.size,
    nullTopicCount,
    emptyTopicCount,
    subjectBreakdown: {
      PHYSICS: {
        questionCount: subjectCounts.PHYSICS,
        chapterCount: chaptersBySubject.PHYSICS.size,
        conceptCount: conceptKeysBySubject.PHYSICS.size,
      },
      CHEMISTRY: {
        questionCount: subjectCounts.CHEMISTRY,
        chapterCount: chaptersBySubject.CHEMISTRY.size,
        conceptCount: conceptKeysBySubject.CHEMISTRY.size,
      },
      MATHEMATICS: {
        questionCount: subjectCounts.MATHEMATICS,
        chapterCount: chaptersBySubject.MATHEMATICS.size,
        conceptCount: conceptKeysBySubject.MATHEMATICS.size,
      },
    },
    difficultyDistribution,
  };
}

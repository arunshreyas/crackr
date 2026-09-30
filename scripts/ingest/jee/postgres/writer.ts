import { PrismaClient } from '@prisma/client';
import { NormalizedQuestion } from '../types';

/**
 * Writes questions and their options to PostgreSQL in batches with idempotent upserts.
 */
export async function writeQuestionsToPostgres(
  prisma: PrismaClient,
  questions: NormalizedQuestion[],
  batchSize = 250,
  onProgress?: (processed: number, total: number) => void
): Promise<{ successCount: number; failedIds: string[] }> {
  let successCount = 0;
  const failedIds: string[] = [];

  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);

    for (const q of batch) {
      try {
        await prisma.question.upsert({
          where: { externalId: q.externalId },
          update: {
            contentHash: q.contentHash,
            text: q.text,
            subject: q.subject,
            chapter: q.chapter,
            topic: q.topic,
            year: q.year,
            paperTitle: q.paperTitle,
            difficulty: q.difficulty,
            type: q.type,
            correctOption: q.correctOption,
            explanation: q.explanation,
            source: q.source,
            options: {
              deleteMany: {},
              create: q.options.map((opt) => ({
                label: opt.label,
                text: opt.text,
                position: opt.position,
              })),
            },
          },
          create: {
            externalId: q.externalId,
            contentHash: q.contentHash,
            text: q.text,
            subject: q.subject,
            chapter: q.chapter,
            topic: q.topic,
            year: q.year,
            paperTitle: q.paperTitle,
            difficulty: q.difficulty,
            type: q.type,
            correctOption: q.correctOption,
            explanation: q.explanation,
            source: q.source,
            options: {
              create: q.options.map((opt) => ({
                label: opt.label,
                text: opt.text,
                position: opt.position,
              })),
            },
          },
        });
        successCount++;
      } catch (err) {
        console.error(`[Postgres] Failed to upsert question ${q.externalId}:`, err);
        failedIds.push(q.externalId);
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, questions.length), questions.length);
    }
  }

  return { successCount, failedIds };
}

import { PrismaClient } from '@prisma/client';
import { NormalizedQuestion } from '../types';

/**
 * Persists vector embeddings and metadata in QuestionVector table.
 */
export async function writeVectorsToPostgres(
  prisma: PrismaClient,
  questions: NormalizedQuestion[],
  embeddingsMap: Map<string, number[]>,
  batchSize = 250,
  onProgress?: (processed: number, total: number) => void
): Promise<{ successCount: number; failedIds: string[] }> {
  let successCount = 0;
  const failedIds: string[] = [];

  // Fetch internal question IDs mapped by externalId
  const externalIds = questions.map((q) => q.externalId);
  const dbQuestions = await prisma.question.findMany({
    where: { externalId: { in: externalIds } },
    select: { id: true, externalId: true },
  });

  const idMap = new Map<string, string>();
  for (const dbQ of dbQuestions) {
    idMap.set(dbQ.externalId, dbQ.id);
  }

  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);

    for (const q of batch) {
      const questionId = idMap.get(q.externalId);
      const embedding = embeddingsMap.get(q.externalId);

      if (!questionId || !embedding) {
        failedIds.push(q.externalId);
        continue;
      }

      const metadata = {
        questionId,
        externalId: q.externalId,
        subject: q.subject,
        chapter: q.chapter,
        topic: q.topic,
        year: q.year,
        difficulty: q.difficulty,
        type: q.type,
      };

      try {
        await prisma.questionVector.upsert({
          where: { questionId },
          update: {
            embedding,
            metadata,
          },
          create: {
            questionId,
            embedding,
            metadata,
          },
        });
        successCount++;
      } catch (err) {
        console.error(`[Vector] Failed to write vector for question ${q.externalId}:`, err);
        failedIds.push(q.externalId);
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, questions.length), questions.length);
    }
  }

  return { successCount, failedIds };
}

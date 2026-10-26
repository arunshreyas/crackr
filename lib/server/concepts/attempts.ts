import 'server-only';
import { prisma } from '@/lib/server/db';
import { QuestionSubject } from '@prisma/client';
import { buildConceptKey, normalizeTopicName } from './metadata';

export interface ConceptDifficultyBreakdown {
  total: number;
  correct: number;
  accuracy: number | null;
}

export interface ConceptAttemptGroup {
  conceptKey: string;
  subject: QuestionSubject;
  chapter: string;
  topic: string;
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  accuracy: number;
  avgTimeSeconds: number;
  fastIncorrectCount: number; // Answered incorrectly in < 15s (rushing/careless)
  slowAttemptCount: number; // Answered taking > 120s (struggling with concepts)
  recentAttempts: boolean[]; // Last 5 attempts in chronological order (true = correct)
  difficultyStats: Record<'EASY' | 'MEDIUM' | 'HARD', ConceptDifficultyBreakdown>;
  lastAttemptedAt: Date;
  firstAttemptedAt: Date;
}

/**
 * Retrieves and groups all verified question attempts for a specific user into concept buckets.
 * Scoped authoritatively to the provided userId.
 */
export async function getUserConceptAttempts(userId: string): Promise<ConceptAttemptGroup[]> {
  if (!userId) {
    throw new Error('UNAUTHORIZED: userId is required for attempt tracking');
  }

  const answers = await prisma.quizAnswer.findMany({
    where: { userId },
    select: {
      id: true,
      isCorrect: true,
      timeTakenSeconds: true,
      createdAt: true,
      question: {
        select: {
          id: true,
          subject: true,
          chapter: true,
          topic: true,
          difficulty: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const groupMap = new Map<
    string,
    {
      subject: QuestionSubject;
      chapter: string;
      topic: string;
      totalAttempts: number;
      correctAttempts: number;
      times: number[];
      fastIncorrectCount: number;
      slowAttemptCount: number;
      recentAttempts: boolean[];
      difficultyMap: Record<'EASY' | 'MEDIUM' | 'HARD', { total: number; correct: number }>;
      lastAttemptedAt: Date;
      firstAttemptedAt: Date;
    }
  >();

  for (const ans of answers) {
    if (!ans.question) continue;

    const { subject, chapter, topic, difficulty } = ans.question;
    const normTopic = normalizeTopicName(topic, chapter);
    const conceptKey = buildConceptKey(subject, chapter, normTopic);

    let group = groupMap.get(conceptKey);
    if (!group) {
      group = {
        subject,
        chapter,
        topic: normTopic,
        totalAttempts: 0,
        correctAttempts: 0,
        times: [],
        fastIncorrectCount: 0,
        slowAttemptCount: 0,
        recentAttempts: [],
        difficultyMap: {
          EASY: { total: 0, correct: 0 },
          MEDIUM: { total: 0, correct: 0 },
          HARD: { total: 0, correct: 0 },
        },
        firstAttemptedAt: ans.createdAt,
        lastAttemptedAt: ans.createdAt,
      };
      groupMap.set(conceptKey, group);
    }

    group.totalAttempts++;
    if (ans.isCorrect) {
      group.correctAttempts++;
    }

    const time = ans.timeTakenSeconds ?? 45;
    group.times.push(time);

    // Behavioral flags
    if (!ans.isCorrect && time < 15) {
      group.fastIncorrectCount++;
    }
    if (time > 120) {
      group.slowAttemptCount++;
    }

    // Keep chronological recent attempts (max 5)
    group.recentAttempts.push(ans.isCorrect);
    if (group.recentAttempts.length > 5) {
      group.recentAttempts.shift();
    }

    // Difficulty breakdown
    const diffNorm = (difficulty || 'MEDIUM').toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD';
    if (group.difficultyMap[diffNorm]) {
      group.difficultyMap[diffNorm].total++;
      if (ans.isCorrect) {
        group.difficultyMap[diffNorm].correct++;
      }
    }

    group.lastAttemptedAt = ans.createdAt;
  }

  const results: ConceptAttemptGroup[] = [];

  for (const [conceptKey, data] of groupMap.entries()) {
    const accuracy = data.totalAttempts > 0 ? Math.round((data.correctAttempts / data.totalAttempts) * 100) : 0;
    const avgTimeSeconds =
      data.times.length > 0
        ? Math.round(data.times.reduce((sum, t) => sum + t, 0) / data.times.length)
        : 45;

    const computeDiffStats = (diff: 'EASY' | 'MEDIUM' | 'HARD'): ConceptDifficultyBreakdown => {
      const d = data.difficultyMap[diff];
      return {
        total: d.total,
        correct: d.correct,
        accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : null,
      };
    };

    results.push({
      conceptKey,
      subject: data.subject,
      chapter: data.chapter,
      topic: data.topic,
      totalAttempts: data.totalAttempts,
      correctAttempts: data.correctAttempts,
      incorrectAttempts: data.totalAttempts - data.correctAttempts,
      accuracy,
      avgTimeSeconds,
      fastIncorrectCount: data.fastIncorrectCount,
      slowAttemptCount: data.slowAttemptCount,
      recentAttempts: data.recentAttempts,
      difficultyStats: {
        EASY: computeDiffStats('EASY'),
        MEDIUM: computeDiffStats('MEDIUM'),
        HARD: computeDiffStats('HARD'),
      },
      lastAttemptedAt: data.lastAttemptedAt,
      firstAttemptedAt: data.firstAttemptedAt,
    });
  }

  return results;
}

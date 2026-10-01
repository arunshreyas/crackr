import 'server-only';
import { prisma } from '@/lib/server/db';
import { QuestionSubject, OptionLabel } from '@prisma/client';
import { requireAuthenticatedUser } from '@/lib/server/auth';
import { getQuestionsForPractice, ClientSafeQuestion } from '@/lib/server/questions/service';
import {
  awardXp,
  updateStreakOnPractice,
  checkAndUnlockAchievements,
  UnlockedAchievementInfo,
} from '@/lib/server/gamification/service';
import { XP_CONFIG, calculateLevel } from '@/lib/server/gamification/config';

export interface StartPracticeResult {
  sessionId: string;
  questions: ClientSafeQuestion[];
  subject: QuestionSubject | null;
  chapter: string | null;
  totalQuestions: number;
}

export interface AnswerSubmissionResult {
  isCorrect: boolean;
  correctOption: OptionLabel;
  explanation: string | null;
  topic: string | null;
  chapter: string;
  subject: QuestionSubject;
  xpEarned: number;
  newTotalXp: number;
  newLevel: number;
  leveledUp: boolean;
  streak: number;
}

export interface TopicPerformance {
  topic: string;
  chapter: string;
  subject: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface PracticeSessionSummary {
  id: string;
  subject: string;
  chapter: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  xpEarned: number;
  durationSeconds: number;
  completedAt: string;
  newAchievements: UnlockedAchievementInfo[];
  topicDiagnostics: {
    weakTopics: TopicPerformance[];
    strongTopics: TopicPerformance[];
  };
  questionsBreakdown: Array<{
    questionId: string;
    text: string;
    topic: string | null;
    chapter: string;
    selectedOption: OptionLabel;
    correctOption: OptionLabel;
    isCorrect: boolean;
    explanation: string | null;
  }>;
}

/**
 * Initiates a new verified practice session for the current user.
 */
export async function startPracticeSession(params: {
  subject?: QuestionSubject;
  chapter?: string;
  difficulty?: string;
  questionCount?: number;
}): Promise<StartPracticeResult> {
  const count = params.questionCount && params.questionCount > 0 ? params.questionCount : 10;

  // Retrieve auth profile and questions concurrently to minimize startup latency
  const [{ profile }, questions] = await Promise.all([
    requireAuthenticatedUser(),
    getQuestionsForPractice({
      subject: params.subject,
      chapter: params.chapter,
      difficulty: params.difficulty,
      count,
    }),
  ]);

  if (questions.length === 0) {
    throw new Error('NO_QUESTIONS_FOUND: No matching questions in question bank.');
  }

  // Create session in PostgreSQL
  const session = await prisma.quizSession.create({
    data: {
      userId: profile.id,
      subject: params.subject,
      chapter: params.chapter && params.chapter !== 'ALL' ? params.chapter : 'Mixed Practice',
      totalQuestions: questions.length,
      durationSeconds: 0,
    },
  });

  return {
    sessionId: session.id,
    questions,
    subject: params.subject || null,
    chapter: params.chapter || null,
    totalQuestions: questions.length,
  };
}

/**
 * Authoritatively validates an answer submission on the server.
 */
export async function submitPracticeAnswer(params: {
  sessionId: string;
  questionId: string;
  selectedOption: OptionLabel;
  timeTakenSeconds?: number;
}): Promise<AnswerSubmissionResult> {
  const { profile } = await requireAuthenticatedUser();
  const { sessionId, questionId, selectedOption, timeTakenSeconds = 30 } = params;

  // 1, 2, 3: Fetch session, duplicate check, and question in parallel to minimize latency
  const [session, existingAnswer, question] = await Promise.all([
    prisma.quizSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        completedAt: true,
      },
    }),
    prisma.quizAnswer.findFirst({
      where: {
        sessionId,
        questionId,
      },
      include: {
        question: {
          select: {
            id: true,
            subject: true,
            chapter: true,
            topic: true,
            correctOption: true,
            explanation: true,
          },
        },
      },
    }),
    prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        subject: true,
        chapter: true,
        topic: true,
        correctOption: true,
        explanation: true,
      },
    }),
  ]);

  if (!session || session.userId !== profile.id) {
    throw new Error('FORBIDDEN: Session not found or unauthorized.');
  }

  if (session.completedAt) {
    throw new Error('SESSION_COMPLETED: This session has already ended.');
  }

  // Idempotent return if already answered
  if (existingAnswer && existingAnswer.question) {
    const isCorrect = existingAnswer.isCorrect;
    const xpAmount =
      XP_CONFIG.QUESTION_ANSWERED + (isCorrect ? XP_CONFIG.QUESTION_CORRECT_BONUS : 0);
    return {
      isCorrect,
      correctOption: existingAnswer.question.correctOption,
      explanation: existingAnswer.question.explanation,
      topic: existingAnswer.question.topic || existingAnswer.question.chapter,
      chapter: existingAnswer.question.chapter,
      subject: existingAnswer.question.subject,
      xpEarned: xpAmount,
      newTotalXp: profile.xp,
      newLevel: profile.level,
      leveledUp: false,
      streak: profile.currentStreak,
    };
  }

  if (!question) {
    throw new Error('QUESTION_NOT_FOUND: Question does not exist.');
  }

  const isCorrect = question.correctOption === selectedOption;

  // 4. Calculate XP
  const xpAmount =
    XP_CONFIG.QUESTION_ANSWERED + (isCorrect ? XP_CONFIG.QUESTION_CORRECT_BONUS : 0);

  const now = new Date();

  // 5. Execute atomic transaction with concurrent writes
  const { newTotalXp, newLevel, leveledUp, streak } = await prisma.$transaction(async (tx) => {
    // Fetch fresh profile state
    const currentProfile = await tx.userProfile.findUniqueOrThrow({
      where: { id: profile.id },
      select: {
        xp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        lastPracticeAt: true,
        questionsAnswered: true,
        questionsCorrect: true,
      },
    });

    const totalXp = currentProfile.xp + xpAmount;
    const { level: calculatedLevel } = calculateLevel(totalXp);
    const didLevelUp = calculatedLevel > currentProfile.level;

    // Calculate Streak
    let currentStreak = currentProfile.currentStreak;
    let longestStreak = currentProfile.longestStreak;

    if (!currentProfile.lastPracticeAt) {
      currentStreak = 1;
    } else {
      const lastDate = new Date(currentProfile.lastPracticeAt);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfLast = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());

      const diffDays = Math.round(
        (startOfToday.getTime() - startOfLast.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        // Already practiced today, keep current streak
      } else if (diffDays === 1) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    // Parallelize writes inside transaction connection
    await Promise.all([
      tx.quizAnswer.create({
        data: {
          sessionId,
          userId: profile.id,
          questionId,
          selectedOption,
          isCorrect,
          timeTakenSeconds,
        },
      }),
      tx.xPTransaction.create({
        data: {
          userId: profile.id,
          amount: xpAmount,
          reason: isCorrect ? 'QUESTION_CORRECT' : 'QUESTION_ATTEMPT',
          sessionId,
        },
      }),
      tx.userProfile.update({
        where: { id: profile.id },
        data: {
          questionsAnswered: currentProfile.questionsAnswered + 1,
          questionsCorrect: isCorrect ? currentProfile.questionsCorrect + 1 : currentProfile.questionsCorrect,
          xp: totalXp,
          level: calculatedLevel,
          currentStreak,
          longestStreak,
          lastPracticeAt: now,
        },
      }),
    ]);

    return {
      newTotalXp: totalXp,
      newLevel: calculatedLevel,
      leveledUp: didLevelUp,
      streak: currentStreak,
    };
  });

  return {
    isCorrect,
    correctOption: question.correctOption,
    explanation: question.explanation,
    topic: question.topic || question.chapter,
    chapter: question.chapter,
    subject: question.subject,
    xpEarned: xpAmount,
    newTotalXp,
    newLevel,
    leveledUp,
    streak,
  };
}

/**
 * Completes a practice session and generates the final results breakdown.
 */
export async function completePracticeSession(params: {
  sessionId: string;
  durationSeconds: number;
}): Promise<PracticeSessionSummary> {
  const { profile } = await requireAuthenticatedUser();
  const { sessionId, durationSeconds } = params;

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      answers: {
        include: {
          question: {
            select: {
              id: true,
              text: true,
              subject: true,
              chapter: true,
              topic: true,
              correctOption: true,
              explanation: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.userId !== profile.id) {
    throw new Error('FORBIDDEN: Session not found or unauthorized.');
  }

  const answers = session.answers;
  const totalQuestions = answers.length > 0 ? answers.length : session.totalQuestions;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  let sessionXpEarned = answers.reduce((acc, a) => {
    return acc + XP_CONFIG.QUESTION_ANSWERED + (a.isCorrect ? XP_CONFIG.QUESTION_CORRECT_BONUS : 0);
  }, 0);

  // Bonus XP for perfect sessions (min 5 questions)
  if (totalQuestions >= 5 && accuracy === 100) {
    sessionXpEarned += XP_CONFIG.PERFECT_SESSION_BONUS;
    await awardXp(profile.id, XP_CONFIG.PERFECT_SESSION_BONUS, 'PERFECT_SESSION_BONUS', sessionId);
  }

  // Update session record
  const completedAt = new Date();
  await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      completedAt,
      totalQuestions,
      correctAnswers: correctCount,
      accuracy,
      durationSeconds: Math.max(durationSeconds, 1),
      xpEarned: sessionXpEarned,
    },
  });

  // Evaluate and unlock achievements
  const newAchievements = await checkAndUnlockAchievements(profile.id, {
    sessionId,
    sessionAccuracy: accuracy,
    sessionQuestions: totalQuestions,
  });

  // Calculate topic-level diagnostic performance
  const topicMap = new Map<string, { topic: string; chapter: string; subject: string; total: number; correct: number }>();

  for (const a of answers) {
    const topicKey = a.question.topic || a.question.chapter;
    const existing = topicMap.get(topicKey) || {
      topic: topicKey,
      chapter: a.question.chapter,
      subject: a.question.subject,
      total: 0,
      correct: 0,
    };
    existing.total += 1;
    if (a.isCorrect) existing.correct += 1;
    topicMap.set(topicKey, existing);
  }

  const weakTopics: TopicPerformance[] = [];
  const strongTopics: TopicPerformance[] = [];

  for (const item of topicMap.values()) {
    const acc = Math.round((item.correct / item.total) * 100);
    const perf: TopicPerformance = {
      ...item,
      accuracy: acc,
    };
    if (acc < 100) {
      weakTopics.push(perf);
    } else {
      strongTopics.push(perf);
    }
  }

  const questionsBreakdown = answers.map((a) => ({
    questionId: a.questionId,
    text: a.question.text,
    topic: a.question.topic,
    chapter: a.question.chapter,
    selectedOption: a.selectedOption,
    correctOption: a.question.correctOption,
    isCorrect: a.isCorrect,
    explanation: a.question.explanation,
  }));

  const subjName = session.subject
    ? session.subject.charAt(0) + session.subject.slice(1).toLowerCase()
    : 'JEE Main';

  return {
    id: session.id,
    subject: subjName,
    chapter: session.chapter || 'Mixed Practice',
    totalQuestions,
    correctAnswers: correctCount,
    accuracy,
    xpEarned: sessionXpEarned,
    durationSeconds: Math.max(durationSeconds, 1),
    completedAt: completedAt.toISOString(),
    newAchievements,
    topicDiagnostics: {
      weakTopics,
      strongTopics,
    },
    questionsBreakdown,
  };
}

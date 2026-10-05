import 'server-only';
import { prisma } from '@/lib/server/db';
import { QuestionSubject, OptionLabel, SessionStatus } from '@prisma/client';
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
  difficulty: string | null;
  totalQuestions: number;
}

export interface ActiveSessionAnswerState {
  questionId: string;
  selectedOption: OptionLabel;
  isCorrect: boolean;
  correctOption: OptionLabel;
  explanation: string | null;
  timeTakenSeconds: number | null;
}

export interface ActiveSessionState {
  sessionId: string;
  subject: QuestionSubject | null;
  chapter: string | null;
  difficulty: string | null;
  totalQuestions: number;
  currentQuestionIndex: number;
  answeredCount: number;
  durationSeconds: number;
  questions: ClientSafeQuestion[];
  answeredQuestions: Record<string, ActiveSessionAnswerState>;
  lastActivityAt: string;
  startedAt: string;
}

export interface ActiveSessionSummaryItem {
  sessionId: string;
  subject: QuestionSubject | null;
  chapter: string | null;
  difficulty: string | null;
  totalQuestions: number;
  answeredCount: number;
  currentQuestionIndex: number;
  durationSeconds: number;
  lastActivityAt: string;
  startedAt: string;
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
 * Retrieves all active (in-progress) practice sessions for the current user.
 * Allows users to see and resume any of their ongoing sessions (e.g. Physics, Chemistry, Math).
 */
export async function getActivePracticeSessions(): Promise<ActiveSessionSummaryItem[]> {
  const { profile } = await requireAuthenticatedUser();

  const sessions = await prisma.quizSession.findMany({
    where: {
      userId: profile.id,
      status: SessionStatus.ACTIVE,
      completedAt: null,
    },
    orderBy: { lastActivityAt: 'desc' },
    include: {
      _count: {
        select: { answers: true },
      },
    },
  });

  return sessions
    .filter((s) => s.questionIds && s.questionIds.length > 0)
    .map((s) => ({
      sessionId: s.id,
      subject: s.subject,
      chapter: s.chapter,
      difficulty: s.difficulty,
      totalQuestions: s.totalQuestions || s.questionIds.length,
      answeredCount: s._count.answers,
      currentQuestionIndex: s.currentQuestionIndex,
      durationSeconds: s.durationSeconds,
      lastActivityAt: s.lastActivityAt.toISOString(),
      startedAt: s.createdAt.toISOString(),
    }));
}

/**
 * Loads the full active state for a specific session by its unique ID.
 */
export async function getPracticeSessionById(sessionId: string): Promise<ActiveSessionState | null> {
  const { profile } = await requireAuthenticatedUser();

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      answers: {
        include: {
          question: {
            select: {
              id: true,
              correctOption: true,
              explanation: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.userId !== profile.id || session.status !== SessionStatus.ACTIVE || session.completedAt) {
    return null;
  }

  if (!session.questionIds || session.questionIds.length === 0) {
    return null;
  }

  // Fetch the session's exact questions
  const rawQuestions = await prisma.question.findMany({
    where: {
      id: { in: session.questionIds },
    },
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

  // Preserve the exact question order stored on the session record
  const qMap = new Map(rawQuestions.map((q) => [q.id, q]));
  const orderedQuestions: ClientSafeQuestion[] = [];
  for (const qId of session.questionIds) {
    const q = qMap.get(qId);
    if (q) {
      orderedQuestions.push({
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
      });
    }
  }

  if (orderedQuestions.length === 0) {
    await prisma.quizSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.ABANDONED, completedAt: new Date() },
    });
    return null;
  }

  // Map answered questions state
  const answeredQuestions: Record<string, ActiveSessionAnswerState> = {};
  for (const ans of session.answers) {
    if (ans.question) {
      answeredQuestions[ans.questionId] = {
        questionId: ans.questionId,
        selectedOption: ans.selectedOption,
        isCorrect: ans.isCorrect,
        correctOption: ans.question.correctOption,
        explanation: ans.question.explanation,
        timeTakenSeconds: ans.timeTakenSeconds,
      };
    }
  }

  const answeredCount = Object.keys(answeredQuestions).length;

  // Determine current question index (first unanswered question)
  let currentQuestionIndex = 0;
  let foundUnanswered = false;
  for (let i = 0; i < orderedQuestions.length; i++) {
    if (!answeredQuestions[orderedQuestions[i].id]) {
      currentQuestionIndex = i;
      foundUnanswered = true;
      break;
    }
  }

  if (!foundUnanswered) {
    currentQuestionIndex = Math.max(0, orderedQuestions.length - 1);
  }

  return {
    sessionId: session.id,
    subject: session.subject,
    chapter: session.chapter,
    difficulty: session.difficulty,
    totalQuestions: orderedQuestions.length,
    currentQuestionIndex,
    answeredCount,
    durationSeconds: session.durationSeconds,
    questions: orderedQuestions,
    answeredQuestions,
    lastActivityAt: session.lastActivityAt.toISOString(),
    startedAt: session.createdAt.toISOString(),
  };
}

/**
 * Retrieves the user's single most recent active practice session.
 */
export async function getActivePracticeSession(): Promise<ActiveSessionState | null> {
  const { profile } = await requireAuthenticatedUser();

  const session = await prisma.quizSession.findFirst({
    where: {
      userId: profile.id,
      status: SessionStatus.ACTIVE,
      completedAt: null,
    },
    orderBy: { lastActivityAt: 'desc' },
    select: { id: true },
  });

  if (!session) return null;
  return getPracticeSessionById(session.id);
}

/**
 * Initiates a new verified practice session for the current user.
 * Supports concurrent active sessions across different subjects/chapters.
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

  const questionIds = questions.map((q) => q.id);
  const now = new Date();

  const session = await prisma.quizSession.create({
    data: {
      userId: profile.id,
      subject: params.subject,
      chapter: params.chapter && params.chapter !== 'ALL' ? params.chapter : 'Mixed Practice',
      difficulty: params.difficulty || 'ALL',
      status: SessionStatus.ACTIVE,
      questionIds,
      currentQuestionIndex: 0,
      totalQuestions: questions.length,
      durationSeconds: 0,
      lastActivityAt: now,
    },
  });

  return {
    sessionId: session.id,
    questions,
    subject: params.subject || null,
    chapter: params.chapter || null,
    difficulty: params.difficulty || null,
    totalQuestions: questions.length,
  };
}

/**
 * Authoritatively validates an answer submission on the server.
 * Fully idempotent against double-clicks, concurrent tabs, and retries.
 */
export async function submitPracticeAnswer(params: {
  sessionId: string;
  questionId: string;
  selectedOption: OptionLabel;
  timeTakenSeconds?: number;
}): Promise<AnswerSubmissionResult> {
  const { profile } = await requireAuthenticatedUser();
  const { sessionId, questionId, selectedOption, timeTakenSeconds = 30 } = params;

  // Fetch session, existing answer, and question concurrently
  const [session, existingAnswer, question] = await Promise.all([
    prisma.quizSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        status: true,
        completedAt: true,
        questionIds: true,
        currentQuestionIndex: true,
        durationSeconds: true,
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

  if (session.completedAt || session.status === SessionStatus.COMPLETED) {
    throw new Error('SESSION_COMPLETED: This session has already ended.');
  }

  // Idempotent return if this question was already answered
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

  // Calculate XP
  const xpAmount =
    XP_CONFIG.QUESTION_ANSWERED + (isCorrect ? XP_CONFIG.QUESTION_CORRECT_BONUS : 0);

  const now = new Date();

  // Next question index calculation
  const qIdx = session.questionIds.indexOf(questionId);
  const nextQuestionIndex =
    qIdx >= 0 ? Math.min(session.questionIds.length - 1, qIdx + 1) : session.currentQuestionIndex;

  // Atomic database transaction with unique constraint protection
  const { newTotalXp, newLevel, leveledUp, streak } = await prisma.$transaction(async (tx) => {
    // Fetch fresh profile state inside transaction
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
      tx.quizSession.update({
        where: { id: sessionId },
        data: {
          currentQuestionIndex: nextQuestionIndex,
          durationSeconds: session.durationSeconds + timeTakenSeconds,
          lastActivityAt: now,
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
 * Prevents the session from ever being resumed afterward.
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
  if (totalQuestions >= 5 && accuracy === 100 && session.status !== SessionStatus.COMPLETED) {
    sessionXpEarned += XP_CONFIG.PERFECT_SESSION_BONUS;
    await awardXp(profile.id, XP_CONFIG.PERFECT_SESSION_BONUS, 'PERFECT_SESSION_BONUS', sessionId);
  }

  // Update session record to COMPLETED
  const completedAt = session.completedAt || new Date();
  await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.COMPLETED,
      completedAt,
      totalQuestions,
      correctAnswers: correctCount,
      accuracy,
      durationSeconds: Math.max(durationSeconds, session.durationSeconds, 1),
      xpEarned: sessionXpEarned,
      lastActivityAt: completedAt,
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
    durationSeconds: Math.max(durationSeconds, session.durationSeconds, 1),
    completedAt: completedAt.toISOString(),
    newAchievements,
    topicDiagnostics: {
      weakTopics,
      strongTopics,
    },
    questionsBreakdown,
  };
}

/**
 * Explicitly abandons an active practice session so the user can clean up their list.
 */
export async function abandonPracticeSession(params: {
  sessionId: string;
}): Promise<{ success: boolean }> {
  const { profile } = await requireAuthenticatedUser();
  const { sessionId } = params;

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true },
  });

  if (!session || session.userId !== profile.id) {
    throw new Error('FORBIDDEN: Session not found or unauthorized.');
  }

  await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.ABANDONED,
      completedAt: new Date(),
    },
  });

  return { success: true };
}

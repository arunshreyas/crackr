import { prisma } from '@/lib/prisma';
import { QuestionSubject } from '@prisma/client';
import { calculateLevel, calculateRank } from '@/lib/server/gamification/config';

export interface DashboardData {
  profile: {
    name: string;
    username: string;
    school: string;
    grade: string;
    stream: string;
    dailyGoal: number;
    preferredDifficulty: string | null;
    level: number;
    levelInfo: {
      level: number;
      currentLevelXp: number;
      nextLevelXp: number;
      progressPercentage: number;
    };
    rankInfo: {
      rank: string;
      badge: string;
      tier: number;
      nextRank: string | null;
      xpToNextRank: number | null;
    };
  };
  greeting: {
    headline: string;
    subline: string;
  };
  today: {
    solved: number;
    target: number;
    remaining: number;
    progressPercentage: number;
    isCompleted: boolean;
    accuracy: number | null;
    minutesPracticed: number;
    xpEarned: number;
  };
  overview: {
    questionsSolved: number;
    questionsSolvedChange: { value: number; label: string } | null;
    accuracy: number | null;
    accuracyChange: { value: number; label: string } | null;
    currentStreak: number;
    longestStreak: number;
    totalXp: number;
    xpThisWeek: number;
  };
  charts: {
    days7: {
      questions: Array<{ date: string; label: string; count: number }>;
      accuracy: Array<{ date: string; label: string; accuracy: number; total: number }>;
    };
    days30: {
      questions: Array<{ date: string; label: string; count: number }>;
      accuracy: Array<{ date: string; label: string; accuracy: number; total: number }>;
    };
    days90: {
      questions: Array<{ date: string; label: string; count: number }>;
      accuracy: Array<{ date: string; label: string; accuracy: number; total: number }>;
    };
  };
  consistency: {
    currentStreak: number;
    longestStreak: number;
    daysPracticedThisWeek: number;
    weekDays: Array<{
      dayName: string;
      dateStr: string;
      practiced: boolean;
      count: number;
      isToday: boolean;
    }>;
  };
  subjectPerformance: Array<{
    subject: string;
    rawSubject: QuestionSubject;
    questionsSolved: number;
    accuracy: number | null;
    status: 'Strong' | 'Improving' | 'Needs attention' | 'Starting' | 'Not started';
  }>;
  recentSessions: Array<{
    id: string;
    subject: string;
    chapter: string;
    questionsCount: number;
    accuracy: number;
    timeAgo: string;
    createdAt: string;
  }>;
  recommendation: {
    actionText: string;
    targetSubject: QuestionSubject;
    targetChapter: string | null;
  };
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardData(clerkUserId: string): Promise<DashboardData | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { clerkId: clerkUserId },
  });

  if (!profile) return null;

  const now = new Date();
  const startOfToday = getStartOfDay(now);

  // Time boundary for 90 days ago
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  ninetyDaysAgo.setHours(0, 0, 0, 0);

  // 1. Fetch user's answers in last 90 days
  const answers = await prisma.quizAnswer.findMany({
    where: {
      userId: profile.id,
      createdAt: { gte: ninetyDaysAgo },
    },
    select: {
      id: true,
      isCorrect: true,
      timeTakenSeconds: true,
      createdAt: true,
      question: {
        select: {
          subject: true,
          chapter: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // 2. Fetch user's recent sessions
  const recentSessionsData = await prisma.quizSession.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Group answers by Date string (YYYY-MM-DD)
  const answersByDate = new Map<string, { total: number; correct: number; timeSecs: number }>();
  let todaySolved = 0;
  let todayCorrect = 0;
  let todayTimeSecs = 0;

  const todayStr = startOfToday.toISOString().slice(0, 10);

  for (const ans of answers) {
    const dStr = getStartOfDay(ans.createdAt).toISOString().slice(0, 10);
    const existing = answersByDate.get(dStr) || { total: 0, correct: 0, timeSecs: 0 };
    existing.total += 1;
    if (ans.isCorrect) existing.correct += 1;
    existing.timeSecs += ans.timeTakenSeconds || 45;
    answersByDate.set(dStr, existing);

    if (ans.createdAt >= startOfToday) {
      todaySolved += 1;
      if (ans.isCorrect) todayCorrect += 1;
      todayTimeSecs += ans.timeTakenSeconds || 45;
    }
  }

  // Today calculations
  const todayTarget = profile.dailyGoal || 10;
  const todayRemaining = Math.max(0, todayTarget - todaySolved);
  const progressPercentage = Math.min(100, Math.round((todaySolved / todayTarget) * 100));
  const isCompleted = todaySolved >= todayTarget;
  const todayAccuracy = todaySolved > 0 ? Math.round((todayCorrect / todaySolved) * 100) : null;
  const todayMinutes = Math.max(1, Math.round(todayTimeSecs / 60));
  const todayXp = todayCorrect * 15 + todaySolved * 5;

  // Overview stats & Period comparisons (Last 7d vs Prev 7d)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  let thisWeekSolved = 0;
  let thisWeekCorrect = 0;
  let prevWeekSolved = 0;
  let prevWeekCorrect = 0;

  for (const ans of answers) {
    if (ans.createdAt >= sevenDaysAgo) {
      thisWeekSolved += 1;
      if (ans.isCorrect) thisWeekCorrect += 1;
    } else if (ans.createdAt >= fourteenDaysAgo) {
      prevWeekSolved += 1;
      if (ans.isCorrect) prevWeekCorrect += 1;
    }
  }

  const totalQuestionsSolved = profile.questionsAnswered || answers.length;
  const totalQuestionsCorrect = profile.questionsCorrect || answers.filter((a) => a.isCorrect).length;
  const overallAccuracy =
    totalQuestionsSolved > 0
      ? Math.round((totalQuestionsCorrect / totalQuestionsSolved) * 100)
      : null;

  // Changes this week
  let questionsSolvedChange: { value: number; label: string } | null = null;
  if (prevWeekSolved > 0) {
    const pct = Math.round(((thisWeekSolved - prevWeekSolved) / prevWeekSolved) * 100);
    questionsSolvedChange = {
      value: pct,
      label: `${pct >= 0 ? '+' : ''}${pct}% this week`,
    };
  } else if (thisWeekSolved > 0) {
    questionsSolvedChange = { value: 100, label: 'First week' };
  }

  let accuracyChange: { value: number; label: string } | null = null;
  if (prevWeekSolved >= 5 && thisWeekSolved >= 5) {
    const accThis = Math.round((thisWeekCorrect / thisWeekSolved) * 100);
    const accPrev = Math.round((prevWeekCorrect / prevWeekSolved) * 100);
    const diff = accThis - accPrev;
    accuracyChange = {
      value: diff,
      label: `${diff >= 0 ? '+' : ''}${diff}% this week`,
    };
  }

  // Chart data generation helper
  function buildRangeData(days: number) {
    const questionsArr: Array<{ date: string; label: string; count: number }> = [];
    const accuracyArr: Array<{ date: string; label: string; accuracy: number; total: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dKey = getStartOfDay(d).toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dayData = answersByDate.get(dKey);
      const count = dayData?.total || 0;
      questionsArr.push({ date: dKey, label, count });

      if (dayData && dayData.total > 0) {
        const acc = Math.round((dayData.correct / dayData.total) * 100);
        accuracyArr.push({ date: dKey, label, accuracy: acc, total: dayData.total });
      }
    }

    return { questions: questionsArr, accuracy: accuracyArr };
  }

  // Weekly consistency (Monday -> Sunday of current week)
  const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const monday = new Date(now);
  monday.setDate(monday.getDate() - currentDayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDays: Array<{
    dayName: string;
    dateStr: string;
    practiced: boolean;
    count: number;
    isToday: boolean;
  }> = [];

  let daysPracticedThisWeek = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dKey = d.toISOString().slice(0, 10);
    const dayData = answersByDate.get(dKey);
    const count = dayData?.total || 0;
    const practiced = count > 0;
    if (practiced) daysPracticedThisWeek++;

    weekDays.push({
      dayName: dayNames[i],
      dateStr: dKey,
      practiced,
      count,
      isToday: dKey === todayStr,
    });
  }

  // Subject Performance
  const subjectStats: Record<QuestionSubject, { total: number; correct: number }> = {
    PHYSICS: { total: 0, correct: 0 },
    CHEMISTRY: { total: 0, correct: 0 },
    MATHEMATICS: { total: 0, correct: 0 },
  };

  for (const ans of answers) {
    const s = ans.question?.subject;
    if (s && subjectStats[s]) {
      subjectStats[s].total += 1;
      if (ans.isCorrect) subjectStats[s].correct += 1;
    }
  }

  const subjectPerformance = (['PHYSICS', 'CHEMISTRY', 'MATHEMATICS'] as QuestionSubject[]).map(
    (subj) => {
      const stats = subjectStats[subj];
      const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;
      let status: 'Strong' | 'Improving' | 'Needs attention' | 'Starting' | 'Not started' = 'Not started';

      if (stats.total === 0) {
        status = 'Not started';
      } else if (stats.total < 10) {
        status = 'Starting';
      } else if (accuracy !== null && accuracy >= 75) {
        status = 'Strong';
      } else if (accuracy !== null && accuracy >= 50) {
        status = 'Improving';
      } else {
        status = 'Needs attention';
      }

      const nameMap: Record<QuestionSubject, string> = {
        PHYSICS: 'Physics',
        CHEMISTRY: 'Chemistry',
        MATHEMATICS: 'Mathematics',
      };

      return {
        subject: nameMap[subj],
        rawSubject: subj,
        questionsSolved: stats.total,
        accuracy,
        status,
      };
    }
  );

  // Dynamic greeting headline and subline
  const currentHour = now.getHours();
  let timeGreeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 17) {
    timeGreeting = 'Good afternoon';
  } else if (currentHour >= 17) {
    timeGreeting = 'Good evening';
  }

  let subline = '';
  if (isCompleted) {
    subline = `You've hit today's goal of ${todayTarget} questions. Outstanding work.`;
  } else if (todaySolved > 0) {
    subline = `${todayRemaining} ${todayRemaining === 1 ? 'question' : 'questions'} left to hit today's goal.`;
  } else if (profile.currentStreak > 0) {
    subline = `You're on a ${profile.currentStreak} day streak. Keep it going.`;
  } else if (totalQuestionsSolved === 0) {
    subline = 'Complete your first practice session to start tracking your progress.';
  } else {
    subline = `${todayTarget} questions to hit today's goal.`;
  }

  // Recent practice sessions formatted
  const formattedSessions = recentSessionsData.map((s) => ({
    id: s.id,
    subject: s.subject ? s.subject.charAt(0) + s.subject.slice(1).toLowerCase() : 'JEE Main',
    chapter: s.chapter || 'Mixed Practice',
    questionsCount: s.totalQuestions,
    accuracy: Math.round(s.accuracy),
    timeAgo: formatTimeAgo(s.createdAt),
    createdAt: s.createdAt.toISOString(),
  }));

  // Recommended practice target (strictly dynamic from user history)
  const mostRecentSession = recentSessionsData[0];
  let actionText = 'Start practicing';
  let targetSubject: QuestionSubject = 'PHYSICS';
  let targetChapter: string | null = null;

  if (mostRecentSession) {
    targetSubject = mostRecentSession.subject || 'PHYSICS';
    targetChapter = mostRecentSession.chapter || null;
    if (mostRecentSession.subject) {
      const sName = mostRecentSession.subject.charAt(0) + mostRecentSession.subject.slice(1).toLowerCase();
      actionText = `Continue ${sName}`;
    } else {
      actionText = 'Continue practicing';
    }
  }

  const levelInfo = calculateLevel(profile.xp || 0);
  const rankInfo = calculateRank(profile.xp || 0);

  return {
    profile: {
      name: profile.name,
      username: profile.username,
      school: profile.school,
      grade: profile.grade,
      stream: profile.stream,
      dailyGoal: profile.dailyGoal,
      preferredDifficulty: profile.preferredDifficulty,
      level: profile.level,
      levelInfo,
      rankInfo,
    },
    greeting: {
      headline: `${timeGreeting}, ${profile.name.split(' ')[0]}.`,
      subline,
    },
    today: {
      solved: todaySolved,
      target: todayTarget,
      remaining: todayRemaining,
      progressPercentage,
      isCompleted,
      accuracy: todayAccuracy,
      minutesPracticed: todayMinutes,
      xpEarned: todayXp,
    },
    overview: {
      questionsSolved: totalQuestionsSolved,
      questionsSolvedChange,
      accuracy: overallAccuracy,
      accuracyChange,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      totalXp: profile.xp,
      xpThisWeek: thisWeekCorrect * 15 + thisWeekSolved * 5,
    },
    charts: {
      days7: buildRangeData(7),
      days30: buildRangeData(30),
      days90: buildRangeData(90),
    },
    consistency: {
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      daysPracticedThisWeek,
      weekDays,
    },
    subjectPerformance,
    recentSessions: formattedSessions,
    recommendation: {
      actionText,
      targetSubject,
      targetChapter,
    },
  };
}

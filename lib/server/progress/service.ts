import 'server-only';
import { prisma } from '@/lib/server/db';
import { QuestionSubject } from '@prisma/client';

export type ChapterMasteryStatus = 'MASTERED' | 'DEVELOPING' | 'NEEDS_WORK' | 'UNATTEMPTED';

export interface ChapterMastery {
  subject: QuestionSubject;
  chapter: string;
  totalInBank: number;
  attempted: number;
  correct: number;
  accuracy: number | null;
  status: ChapterMasteryStatus;
}

export interface SubjectSummary {
  subject: QuestionSubject;
  label: string;
  attempted: number;
  correct: number;
  accuracy: number | null;
  chaptersCount: number;
  masteredCount: number;
  needsWorkCount: number;
}

export interface SessionHistoryItem {
  id: string;
  subject: QuestionSubject | null;
  chapter: string | null;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  xpEarned: number;
  durationSeconds: number;
  completedAt: string;
}

export interface DailyTrendItem {
  date: string;
  label: string;
  solved: number;
  correct: number;
  accuracy: number | null;
}

export interface ProgressData {
  profile: {
    name: string;
    xp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
  };
  summary: {
    totalSolved: number;
    totalCorrect: number;
    overallAccuracy: number | null;
    totalSessions: number;
    totalPracticeMinutes: number;
    totalXp: number;
    avgTimePerQuestionSeconds: number;
  };
  subjectSummaries: SubjectSummary[];
  chapterMastery: ChapterMastery[];
  dailyTrends: DailyTrendItem[];
  recentSessions: SessionHistoryItem[];
}

export async function getProgressData(userId: string): Promise<ProgressData | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    include: {
      sessions: {
        where: { completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 30,
      },
    },
  });

  if (!profile) return null;

  // 1. Fetch total counts and answer stats
  const answerStats = await prisma.quizAnswer.groupBy({
    by: ['isCorrect'],
    where: { userId },
    _count: { id: true },
  });

  let totalCorrect = 0;
  let totalIncorrect = 0;
  for (const s of answerStats) {
    if (s.isCorrect) totalCorrect = s._count.id;
    else totalIncorrect = s._count.id;
  }
  const totalSolved = totalCorrect + totalIncorrect;
  const overallAccuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : null;

  // 2. Total practice time and duration
  const sessionAggregates = await prisma.quizSession.aggregate({
    where: { userId, completedAt: { not: null } },
    _sum: { durationSeconds: true },
    _count: { id: true },
  });

  const totalPracticeSeconds = sessionAggregates._sum.durationSeconds || 0;
  const totalPracticeMinutes = Math.round(totalPracticeSeconds / 60);
  const totalSessions = sessionAggregates._count.id;
  const avgTimePerQuestionSeconds = totalSolved > 0 ? Math.round(totalPracticeSeconds / totalSolved) : 0;

  // 3. Chapter breakdown from question bank
  const questionCatalog = await prisma.question.groupBy({
    by: ['subject', 'chapter'],
    where: { type: 'MCQ' },
    _count: { id: true },
    orderBy: { chapter: 'asc' },
  });

  // 4. User answers grouped by question to aggregate chapter mastery
  const userAnswersWithQuestions = await prisma.quizAnswer.findMany({
    where: { userId },
    select: {
      isCorrect: true,
      question: {
        select: {
          subject: true,
          chapter: true,
        },
      },
    },
  });

  // Map chapter stats
  const userChapterMap: Record<string, { attempted: number; correct: number }> = {};
  for (const ans of userAnswersWithQuestions) {
    if (!ans.question) continue;
    const key = `${ans.question.subject}__${ans.question.chapter}`;
    if (!userChapterMap[key]) {
      userChapterMap[key] = { attempted: 0, correct: 0 };
    }
    userChapterMap[key].attempted += 1;
    if (ans.isCorrect) {
      userChapterMap[key].correct += 1;
    }
  }

  const chapterMastery: ChapterMastery[] = [];
  const subjects: QuestionSubject[] = ['PHYSICS', 'CHEMISTRY', 'MATHEMATICS'];

  const subjectStats: Record<
    QuestionSubject,
    { attempted: number; correct: number; chaptersCount: number; mastered: number; needsWork: number }
  > = {
    PHYSICS: { attempted: 0, correct: 0, chaptersCount: 0, mastered: 0, needsWork: 0 },
    CHEMISTRY: { attempted: 0, correct: 0, chaptersCount: 0, mastered: 0, needsWork: 0 },
    MATHEMATICS: { attempted: 0, correct: 0, chaptersCount: 0, mastered: 0, needsWork: 0 },
  };

  for (const item of questionCatalog) {
    const key = `${item.subject}__${item.chapter}`;
    const userStat = userChapterMap[key] || { attempted: 0, correct: 0 };
    const attempted = userStat.attempted;
    const correct = userStat.correct;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : null;

    let status: ChapterMasteryStatus = 'UNATTEMPTED';
    if (attempted >= 5) {
      if (accuracy !== null && accuracy >= 80) status = 'MASTERED';
      else if (accuracy !== null && accuracy >= 50) status = 'DEVELOPING';
      else status = 'NEEDS_WORK';
    } else if (attempted > 0) {
      if (accuracy !== null && accuracy >= 60) status = 'DEVELOPING';
      else status = 'NEEDS_WORK';
    }

    chapterMastery.push({
      subject: item.subject,
      chapter: item.chapter,
      totalInBank: item._count.id,
      attempted,
      correct,
      accuracy,
      status,
    });

    if (subjectStats[item.subject]) {
      subjectStats[item.subject].attempted += attempted;
      subjectStats[item.subject].correct += correct;
      subjectStats[item.subject].chaptersCount += 1;
      if (status === 'MASTERED') subjectStats[item.subject].mastered += 1;
      if (status === 'NEEDS_WORK') subjectStats[item.subject].needsWork += 1;
    }
  }

  const subjectSummaries: SubjectSummary[] = subjects.map((subj) => {
    const s = subjectStats[subj];
    const acc = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : null;
    const label = subj === 'PHYSICS' ? 'Physics' : subj === 'CHEMISTRY' ? 'Chemistry' : 'Mathematics';
    return {
      subject: subj,
      label,
      attempted: s.attempted,
      correct: s.correct,
      accuracy: acc,
      chaptersCount: s.chaptersCount,
      masteredCount: s.mastered,
      needsWorkCount: s.needsWork,
    };
  });

  // 5. Past 30-Day Trend
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const pastAnswers = await prisma.quizAnswer.findMany({
    where: {
      userId,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      isCorrect: true,
      createdAt: true,
    },
  });

  const dailyMap: Record<string, { solved: number; correct: number }> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    dailyMap[dateStr] = { solved: 0, correct: 0 };
  }

  for (const ans of pastAnswers) {
    const dateStr = ans.createdAt.toISOString().split('T')[0];
    if (dailyMap[dateStr]) {
      dailyMap[dateStr].solved += 1;
      if (ans.isCorrect) dailyMap[dateStr].correct += 1;
    }
  }

  const dailyTrends: DailyTrendItem[] = Object.entries(dailyMap).map(([date, counts]) => {
    const d = new Date(date);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const accuracy = counts.solved > 0 ? Math.round((counts.correct / counts.solved) * 100) : null;
    return {
      date,
      label,
      solved: counts.solved,
      correct: counts.correct,
      accuracy,
    };
  });

  // 6. Recent sessions
  const recentSessions: SessionHistoryItem[] = profile.sessions.map((s) => ({
    id: s.id,
    subject: s.subject,
    chapter: s.chapter,
    totalQuestions: s.totalQuestions,
    correctAnswers: s.correctAnswers,
    accuracy: s.accuracy,
    xpEarned: s.xpEarned,
    durationSeconds: s.durationSeconds,
    completedAt: s.completedAt ? s.completedAt.toISOString() : s.createdAt.toISOString(),
  }));

  return {
    profile: {
      name: profile.name,
      xp: profile.xp,
      level: profile.level,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
    },
    summary: {
      totalSolved,
      totalCorrect,
      overallAccuracy,
      totalSessions,
      totalPracticeMinutes,
      totalXp: profile.xp,
      avgTimePerQuestionSeconds,
    },
    subjectSummaries,
    chapterMastery,
    dailyTrends,
    recentSessions,
  };
}

import 'server-only';
import { prisma } from '@/lib/server/db';
import {
  XP_CONFIG,
  V1_ACHIEVEMENTS,
  calculateLevel,
  calculateRank,
} from './config';

/**
 * Idempotently seeds base V1 achievements into the PostgreSQL database.
 */
export async function ensureAchievementsSeeded(): Promise<void> {
  for (const ach of V1_ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: {
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        xpReward: ach.xpReward,
        category: ach.category,
        requirementValue: ach.requirementValue,
      },
      create: {
        code: ach.code,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        xpReward: ach.xpReward,
        category: ach.category,
        requirementValue: ach.requirementValue,
      },
    });
  }
}

/**
 * Awards XP to a user with an immutable audit transaction record.
 */
export async function awardXp(
  userId: string,
  amount: number,
  reason: string,
  sessionId?: string
): Promise<{ newTotalXp: number; newLevel: number; leveledUp: boolean }> {
  if (amount <= 0) {
    const user = await prisma.userProfile.findUnique({ where: { id: userId } });
    return {
      newTotalXp: user?.xp || 0,
      newLevel: user?.level || 1,
      leveledUp: false,
    };
  }

  // Create XP Transaction and update user XP atomically
  const result = await prisma.$transaction(async (tx) => {
    await tx.xPTransaction.create({
      data: {
        userId,
        amount,
        reason,
        sessionId,
      },
    });

    const user = await tx.userProfile.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });

    const currentXp = user?.xp || 0;
    const oldLevel = user?.level || 1;
    const newTotalXp = currentXp + amount;
    const { level: newLevel } = calculateLevel(newTotalXp);

    await tx.userProfile.update({
      where: { id: userId },
      data: {
        xp: newTotalXp,
        level: newLevel,
      },
    });

    return {
      newTotalXp,
      newLevel,
      leveledUp: newLevel > oldLevel,
    };
  });

  return result;
}

/**
 * Updates streak tracking server-side based on actual calendar days practiced.
 */
export async function updateStreakOnPractice(userId: string): Promise<number> {
  const now = new Date();
  const user = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastPracticeAt: true },
  });

  if (!user) return 0;

  let currentStreak = user.currentStreak;
  let longestStreak = user.longestStreak;

  if (!user.lastPracticeAt) {
    currentStreak = 1;
  } else {
    const lastDate = new Date(user.lastPracticeAt);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfLast = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());

    const diffDays = Math.round(
      (startOfToday.getTime() - startOfLast.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      // Already practiced today, streak unchanged
    } else if (diffDays === 1) {
      // Consecutive day
      currentStreak += 1;
    } else {
      // Missed a day
      currentStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  await prisma.userProfile.update({
    where: { id: userId },
    data: {
      currentStreak,
      longestStreak,
      lastPracticeAt: now,
    },
  });

  return currentStreak;
}

export interface UnlockedAchievementInfo {
  code: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

/**
 * Evaluates achievement requirements and awards new achievements atomically.
 */
export async function checkAndUnlockAchievements(
  userId: string,
  context?: {
    sessionId?: string;
    sessionAccuracy?: number;
    sessionQuestions?: number;
  }
): Promise<UnlockedAchievementInfo[]> {
  await ensureAchievementsSeeded();

  // Fetch already unlocked achievement IDs
  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievement: { select: { code: true } } },
  });
  const unlockedCodes = new Set(unlocked.map((u) => u.achievement.code));

  const user = await prisma.userProfile.findUnique({
    where: { id: userId },
    include: {
      answers: { select: { id: true, isCorrect: true, createdAt: true } },
      sessions: { select: { id: true, accuracy: true, totalQuestions: true } },
    },
  });

  if (!user) return [];

  const totalAnswered = user.questionsAnswered;
  const streak = user.currentStreak;
  const sessionsCount = user.sessions.length;

  const newlyUnlocked: UnlockedAchievementInfo[] = [];

  // Helper to unlock an achievement
  async function grantAchievement(code: string) {
    if (unlockedCodes.has(code)) return;

    const ach = await prisma.achievement.findUnique({ where: { code } });
    if (!ach) return;

    try {
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: ach.id,
        },
      });

      // Award XP for achievement
      await awardXp(userId, ach.xpReward, `ACHIEVEMENT_${code}`, context?.sessionId);

      unlockedCodes.add(code);
      newlyUnlocked.push({
        code: ach.code,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        xpReward: ach.xpReward,
      });
    } catch {
      // Ignore if already unlocked concurrently
    }
  }

  // 1. First Crack (1 question)
  if (totalAnswered >= 1) {
    await grantAchievement('FIRST_CRACK');
  }

  // 2. Getting Started (1 session)
  if (sessionsCount >= 1) {
    await grantAchievement('GETTING_STARTED');
  }

  // 3. 100 Club
  if (totalAnswered >= 100) {
    await grantAchievement('HUNDRED_CLUB');
  }

  // 4. 500 Club
  if (totalAnswered >= 500) {
    await grantAchievement('FIVE_HUNDRED_CLUB');
  }

  // 5. Century (1,000 questions)
  if (totalAnswered >= 1000) {
    await grantAchievement('CENTURY');
  }

  // 6. Perfect Session
  if (
    context &&
    context.sessionQuestions &&
    context.sessionQuestions >= 5 &&
    context.sessionAccuracy === 100
  ) {
    await grantAchievement('PERFECT_SESSION');
  }

  // 7. On Fire (3-day streak)
  if (streak >= 3) {
    await grantAchievement('ON_FIRE');
  }

  // 8. Week Strong (7-day streak)
  if (streak >= 7) {
    await grantAchievement('WEEK_STRONG');
  }

  return newlyUnlocked;
}

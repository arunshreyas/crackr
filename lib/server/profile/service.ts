import 'server-only';
import { prisma } from '@/lib/server/db';
import {
  calculateLevel,
  calculateRank,
  V1_ACHIEVEMENTS,
} from '@/lib/server/gamification/config';

export interface ProfileAchievementItem {
  code: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  category: string;
  requirementValue: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

export interface ProfileData {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    school: string;
    grade: string;
    stream: string;
    targetExam: string;
    dailyGoal: number;
    preferredDifficulty: string | null;
    createdAt: string;
  };
  gamification: {
    xp: number;
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
    streakInfo: {
      currentStreak: number;
      longestStreak: number;
      lastPracticeAt: string | null;
    };
  };
  achievements: ProfileAchievementItem[];
  stats: {
    questionsAnswered: number;
    questionsCorrect: number;
    accuracy: number | null;
    totalSessions: number;
  };
}

export async function getProfileData(userId: string): Promise<ProfileData | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    include: {
      achievements: {
        include: { achievement: true },
      },
      _count: {
        select: { sessions: true },
      },
    },
  });

  if (!profile) return null;

  // Level & Rank calculations
  const levelInfo = calculateLevel(profile.xp);
  const rankInfo = calculateRank(profile.xp);

  // Map unlocked achievement codes
  const unlockedMap = new Map<string, Date>();
  for (const ua of profile.achievements) {
    if (ua.achievement) {
      unlockedMap.set(ua.achievement.code, ua.unlockedAt);
    }
  }

  // Combine canonical V1 achievements with user's unlocked status
  const achievements: ProfileAchievementItem[] = V1_ACHIEVEMENTS.map((ach) => {
    const isUnlocked = unlockedMap.has(ach.code);
    const unlockedDate = unlockedMap.get(ach.code);
    return {
      code: ach.code,
      title: ach.title,
      description: ach.description,
      icon: ach.icon,
      xpReward: ach.xpReward,
      category: ach.category,
      requirementValue: ach.requirementValue,
      isUnlocked,
      unlockedAt: unlockedDate ? unlockedDate.toISOString() : null,
    };
  });

  const accuracy =
    profile.questionsAnswered > 0
      ? Math.round((profile.questionsCorrect / profile.questionsAnswered) * 100)
      : null;

  return {
    user: {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      email: profile.email,
      school: profile.school,
      grade: profile.grade,
      stream: profile.stream,
      targetExam: 'JEE Main',
      dailyGoal: profile.dailyGoal,
      preferredDifficulty: profile.preferredDifficulty,
      createdAt: profile.createdAt.toISOString(),
    },
    gamification: {
      xp: profile.xp,
      levelInfo,
      rankInfo,
      streakInfo: {
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        lastPracticeAt: profile.lastPracticeAt ? profile.lastPracticeAt.toISOString() : null,
      },
    },
    achievements,
    stats: {
      questionsAnswered: profile.questionsAnswered,
      questionsCorrect: profile.questionsCorrect,
      accuracy,
      totalSessions: profile._count.sessions,
    },
  };
}

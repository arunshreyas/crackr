import 'server-only';
import { prisma } from '@/lib/server/db';
import {
  calculateLevel,
  calculateRank,
  calculateAccuracyRank,
  calculateStreakRank,
  calculateVolumeRank,
  V1_ACHIEVEMENTS,
  RANKS,
  ACCURACY_RANKS,
  STREAK_RANKS,
  VOLUME_RANKS,
  LEVEL_THRESHOLDS,
  RankTier,
  AccuracyRankTier,
  StreakRankTier,
  VolumeRankTier,
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

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  username: string;
  school: string;
  grade: string;
  stream: string;
  badge: string;
  rankTitle: string;
  primaryValue: string;
  secondaryValue: string;
  isCurrentUser: boolean;
}

export interface CategoryLeaderboards {
  accuracy: {
    title: string;
    description: string;
    userRank: number;
    totalParticipants: number;
    entries: LeaderboardEntry[];
  };
  xp: {
    title: string;
    description: string;
    userRank: number;
    totalParticipants: number;
    entries: LeaderboardEntry[];
  };
  streak: {
    title: string;
    description: string;
    userRank: number;
    totalParticipants: number;
    entries: LeaderboardEntry[];
  };
  volume: {
    title: string;
    description: string;
    userRank: number;
    totalParticipants: number;
    entries: LeaderboardEntry[];
  };
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
    categoryRanks: {
      mastery: {
        rank: string;
        badge: string;
        tier: number;
        nextRank: string | null;
        neededForNext: number | null;
        allTiers: RankTier[];
      };
      accuracy: {
        rank: string;
        badge: string;
        tier: number;
        nextRank: string | null;
        neededForNext: number | null;
        allTiers: AccuracyRankTier[];
      };
      streak: {
        rank: string;
        badge: string;
        tier: number;
        nextRank: string | null;
        neededForNext: number | null;
        allTiers: StreakRankTier[];
      };
      volume: {
        rank: string;
        badge: string;
        tier: number;
        nextRank: string | null;
        neededForNext: number | null;
        allTiers: VolumeRankTier[];
      };
    };
    streakInfo: {
      currentStreak: number;
      longestStreak: number;
      lastPracticeAt: string | null;
    };
    allRanks: RankTier[];
    levelThresholds: number[];
  };
  leaderboards: CategoryLeaderboards;
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

  // Level & Multi-dimensional Rank calculations
  const levelInfo = calculateLevel(profile.xp);
  const rankInfo = calculateRank(profile.xp);
  const accuracyRank = calculateAccuracyRank(profile.questionsCorrect);
  const streakRank = calculateStreakRank(profile.currentStreak);
  const volumeRank = calculateVolumeRank(profile.questionsAnswered);

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

  // Fetch Live Multi-Category Leaderboards Concurrently
  const [
    totalUsersCount,
    topAccuracyUsers,
    topXpUsers,
    topStreakUsers,
    topVolumeUsers,
    accuracyRankCount,
    xpRankCount,
    streakRankCount,
    volumeRankCount,
  ] = await Promise.all([
    prisma.userProfile.count(),
    prisma.userProfile.findMany({
      where: { questionsCorrect: { gt: 0 } },
      orderBy: [{ questionsCorrect: 'desc' }, { questionsAnswered: 'asc' }],
      take: 20,
      select: {
        id: true,
        name: true,
        username: true,
        school: true,
        grade: true,
        stream: true,
        xp: true,
        questionsCorrect: true,
        questionsAnswered: true,
        currentStreak: true,
        longestStreak: true,
      },
    }),
    prisma.userProfile.findMany({
      orderBy: { xp: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        username: true,
        school: true,
        grade: true,
        stream: true,
        xp: true,
        questionsCorrect: true,
        questionsAnswered: true,
        currentStreak: true,
        longestStreak: true,
      },
    }),
    prisma.userProfile.findMany({
      where: { longestStreak: { gt: 0 } },
      orderBy: [{ currentStreak: 'desc' }, { longestStreak: 'desc' }],
      take: 20,
      select: {
        id: true,
        name: true,
        username: true,
        school: true,
        grade: true,
        stream: true,
        xp: true,
        questionsCorrect: true,
        questionsAnswered: true,
        currentStreak: true,
        longestStreak: true,
      },
    }),
    prisma.userProfile.findMany({
      where: { questionsAnswered: { gt: 0 } },
      orderBy: { questionsAnswered: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        username: true,
        school: true,
        grade: true,
        stream: true,
        xp: true,
        questionsCorrect: true,
        questionsAnswered: true,
        currentStreak: true,
        longestStreak: true,
      },
    }),
    prisma.userProfile.count({
      where: { questionsCorrect: { gt: profile.questionsCorrect } },
    }),
    prisma.userProfile.count({
      where: { xp: { gt: profile.xp } },
    }),
    prisma.userProfile.count({
      where: { currentStreak: { gt: profile.currentStreak } },
    }),
    prisma.userProfile.count({
      where: { questionsAnswered: { gt: profile.questionsAnswered } },
    }),
  ]);

  const mapAccuracyEntries: LeaderboardEntry[] = topAccuracyUsers.map((u, idx) => {
    const acc = u.questionsAnswered > 0 ? Math.round((u.questionsCorrect / u.questionsAnswered) * 100) : 0;
    const rInfo = calculateAccuracyRank(u.questionsCorrect);
    return {
      rank: idx + 1,
      userId: u.id,
      name: u.name,
      username: u.username,
      school: u.school,
      grade: u.grade,
      stream: u.stream,
      badge: rInfo.badge,
      rankTitle: rInfo.rank,
      primaryValue: `${u.questionsCorrect.toLocaleString()} Correct`,
      secondaryValue: `${acc}% accuracy (${u.questionsAnswered} attempted)`,
      isCurrentUser: u.id === profile.id,
    };
  });

  const mapXpEntries: LeaderboardEntry[] = topXpUsers.map((u, idx) => {
    const rInfo = calculateRank(u.xp);
    return {
      rank: idx + 1,
      userId: u.id,
      name: u.name,
      username: u.username,
      school: u.school,
      grade: u.grade,
      stream: u.stream,
      badge: rInfo.badge,
      rankTitle: rInfo.rank,
      primaryValue: `${u.xp.toLocaleString()} XP`,
      secondaryValue: `${u.questionsCorrect} solved · ${u.currentStreak}d streak`,
      isCurrentUser: u.id === profile.id,
    };
  });

  const mapStreakEntries: LeaderboardEntry[] = topStreakUsers.map((u, idx) => {
    const rInfo = calculateStreakRank(u.currentStreak);
    return {
      rank: idx + 1,
      userId: u.id,
      name: u.name,
      username: u.username,
      school: u.school,
      grade: u.grade,
      stream: u.stream,
      badge: rInfo.badge,
      rankTitle: rInfo.rank,
      primaryValue: `${u.currentStreak} Days`,
      secondaryValue: `Best: ${u.longestStreak}d streak`,
      isCurrentUser: u.id === profile.id,
    };
  });

  const mapVolumeEntries: LeaderboardEntry[] = topVolumeUsers.map((u, idx) => {
    const rInfo = calculateVolumeRank(u.questionsAnswered);
    const acc = u.questionsAnswered > 0 ? Math.round((u.questionsCorrect / u.questionsAnswered) * 100) : 0;
    return {
      rank: idx + 1,
      userId: u.id,
      name: u.name,
      username: u.username,
      school: u.school,
      grade: u.grade,
      stream: u.stream,
      badge: rInfo.badge,
      rankTitle: rInfo.rank,
      primaryValue: `${u.questionsAnswered.toLocaleString()} Solved`,
      secondaryValue: `${u.questionsCorrect} correct (${acc}%)`,
      isCurrentUser: u.id === profile.id,
    };
  });

  const leaderboards: CategoryLeaderboards = {
    accuracy: {
      title: 'Most Answers Correct',
      description: 'Aspirants with the highest number of correct answers and surgical precision',
      userRank: accuracyRankCount + 1,
      totalParticipants: totalUsersCount,
      entries: mapAccuracyEntries,
    },
    xp: {
      title: 'Global Mastery XP',
      description: 'All-time accumulated XP across questions, daily goals, and achievements',
      userRank: xpRankCount + 1,
      totalParticipants: totalUsersCount,
      entries: mapXpEntries,
    },
    streak: {
      title: 'Daily Streak Champions',
      description: 'Active consecutive practice days without breaking momentum',
      userRank: streakRankCount + 1,
      totalParticipants: totalUsersCount,
      entries: mapStreakEntries,
    },
    volume: {
      title: 'Practice Volume Grinders',
      description: 'Aspirants who have put in the maximum problem-solving volume',
      userRank: volumeRankCount + 1,
      totalParticipants: totalUsersCount,
      entries: mapVolumeEntries,
    },
  };

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
      categoryRanks: {
        mastery: {
          rank: rankInfo.rank,
          badge: rankInfo.badge,
          tier: rankInfo.tier,
          nextRank: rankInfo.nextRank,
          neededForNext: rankInfo.xpToNextRank,
          allTiers: RANKS,
        },
        accuracy: {
          rank: accuracyRank.rank,
          badge: accuracyRank.badge,
          tier: accuracyRank.tier,
          nextRank: accuracyRank.nextRank,
          neededForNext: accuracyRank.neededForNext,
          allTiers: ACCURACY_RANKS,
        },
        streak: {
          rank: streakRank.rank,
          badge: streakRank.badge,
          tier: streakRank.tier,
          nextRank: streakRank.nextRank,
          neededForNext: streakRank.neededForNext,
          allTiers: STREAK_RANKS,
        },
        volume: {
          rank: volumeRank.rank,
          badge: volumeRank.badge,
          tier: volumeRank.tier,
          nextRank: volumeRank.nextRank,
          neededForNext: volumeRank.neededForNext,
          allTiers: VOLUME_RANKS,
        },
      },
      streakInfo: {
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        lastPracticeAt: profile.lastPracticeAt ? profile.lastPracticeAt.toISOString() : null,
      },
      allRanks: RANKS,
      levelThresholds: LEVEL_THRESHOLDS,
    },
    leaderboards,
    achievements,
    stats: {
      questionsAnswered: profile.questionsAnswered,
      questionsCorrect: profile.questionsCorrect,
      accuracy,
      totalSessions: profile._count.sessions,
    },
  };
}

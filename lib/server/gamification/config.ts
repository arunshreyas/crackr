import 'server-only';

export const XP_CONFIG = {
  QUESTION_ANSWERED: 5,
  QUESTION_CORRECT_BONUS: 15,
  PERFECT_SESSION_BONUS: 40,
  DAILY_GOAL_BONUS: 50,
} as const;

export interface RankTier {
  name: string;
  minXp: number;
  badge: string;
}

export const RANKS: RankTier[] = [
  { name: 'Novice', minXp: 0, badge: '🌱' },
  { name: 'Learner', minXp: 300, badge: '⚡' },
  { name: 'Challenger', minXp: 1000, badge: '🎯' },
  { name: 'Scholar', minXp: 2500, badge: '📚' },
  { name: 'Expert', minXp: 5000, badge: '🔥' },
  { name: 'Master', minXp: 10000, badge: '👑' },
  { name: 'Cracker', minXp: 20000, badge: '💎' },
];

export const LEVEL_THRESHOLDS = [
  0, 150, 350, 600, 900, 1300, 1800, 2400, 3100, 4000,
  5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000, 26000,
  31000, 37000, 44000, 52000, 62000, 75000,
];

export function calculateLevel(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercentage: number;
} {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const baseThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || baseThreshold + 15000;
  const xpInLevel = xp - baseThreshold;
  const xpSpan = nextThreshold - baseThreshold;
  const progressPercentage = Math.min(100, Math.max(0, Math.round((xpInLevel / xpSpan) * 100)));

  return {
    level,
    currentLevelXp: xpInLevel,
    nextLevelXp: xpSpan,
    progressPercentage,
  };
}

export function calculateRank(xp: number): {
  rank: string;
  badge: string;
  tier: number;
  nextRank: string | null;
  xpToNextRank: number | null;
} {
  let currentRank = RANKS[0];
  let tier = 1;
  let nextRankTier: RankTier | null = RANKS[1] || null;

  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) {
      currentRank = RANKS[i];
      tier = i + 1;
      nextRankTier = RANKS[i + 1] || null;
    } else {
      break;
    }
  }

  const xpToNextRank = nextRankTier ? Math.max(0, nextRankTier.minXp - xp) : null;

  return {
    rank: currentRank.name,
    badge: currentRank.badge,
    tier,
    nextRank: nextRankTier ? nextRankTier.name : null,
    xpToNextRank,
  };
}

export interface AccuracyRankTier {
  name: string;
  minCorrect: number;
  badge: string;
  desc: string;
}

export const ACCURACY_RANKS: AccuracyRankTier[] = [
  { name: 'Apprentice Solver', minCorrect: 0, badge: '🎯', desc: 'Starting your question accuracy journey' },
  { name: 'Precision Striker', minCorrect: 25, badge: '🏹', desc: '25+ accurate solutions delivered' },
  { name: 'Master Marksman', minCorrect: 100, badge: '🎖️', desc: '100+ precision solves across JEE topics' },
  { name: 'Bullseye Prodigy', minCorrect: 250, badge: '⚡', desc: '250+ correct answers with high accuracy' },
  { name: 'Grandmaster Sniper', minCorrect: 500, badge: '👑', desc: '500+ elite correct solutions in competitive JEE' },
];

export function calculateAccuracyRank(correct: number): {
  rank: string;
  badge: string;
  tier: number;
  nextRank: string | null;
  neededForNext: number | null;
} {
  let currentRank = ACCURACY_RANKS[0];
  let tier = 1;
  let nextRankTier: AccuracyRankTier | null = ACCURACY_RANKS[1] || null;

  for (let i = 0; i < ACCURACY_RANKS.length; i++) {
    if (correct >= ACCURACY_RANKS[i].minCorrect) {
      currentRank = ACCURACY_RANKS[i];
      tier = i + 1;
      nextRankTier = ACCURACY_RANKS[i + 1] || null;
    } else {
      break;
    }
  }

  const neededForNext = nextRankTier ? Math.max(0, nextRankTier.minCorrect - correct) : null;

  return {
    rank: currentRank.name,
    badge: currentRank.badge,
    tier,
    nextRank: nextRankTier ? nextRankTier.name : null,
    neededForNext,
  };
}

export interface StreakRankTier {
  name: string;
  minStreak: number;
  badge: string;
  desc: string;
}

export const STREAK_RANKS: StreakRankTier[] = [
  { name: 'Spark', minStreak: 0, badge: '🕯️', desc: 'Igniting daily practice' },
  { name: 'Flame', minStreak: 3, badge: '🔥', desc: '3+ consecutive days active' },
  { name: 'Blaze', minStreak: 7, badge: '⚡', desc: '7+ active day streak' },
  { name: 'Inferno', minStreak: 14, badge: '🌋', desc: '14+ unbroken days of practice' },
  { name: 'Immortal', minStreak: 30, badge: '🛡️', desc: '30+ day streak — master discipline' },
];

export function calculateStreakRank(streak: number): {
  rank: string;
  badge: string;
  tier: number;
  nextRank: string | null;
  neededForNext: number | null;
} {
  let currentRank = STREAK_RANKS[0];
  let tier = 1;
  let nextRankTier: StreakRankTier | null = STREAK_RANKS[1] || null;

  for (let i = 0; i < STREAK_RANKS.length; i++) {
    if (streak >= STREAK_RANKS[i].minStreak) {
      currentRank = STREAK_RANKS[i];
      tier = i + 1;
      nextRankTier = STREAK_RANKS[i + 1] || null;
    } else {
      break;
    }
  }

  const neededForNext = nextRankTier ? Math.max(0, nextRankTier.minStreak - streak) : null;

  return {
    rank: currentRank.name,
    badge: currentRank.badge,
    tier,
    nextRank: nextRankTier ? nextRankTier.name : null,
    neededForNext,
  };
}

export interface VolumeRankTier {
  name: string;
  minQuestions: number;
  badge: string;
  desc: string;
}

export const VOLUME_RANKS: VolumeRankTier[] = [
  { name: 'Explorer', minQuestions: 0, badge: '🧭', desc: 'Exploring the question bank' },
  { name: 'Dedicated Aspirant', minQuestions: 50, badge: '📖', desc: '50+ problems tackled' },
  { name: 'High-Output Grinder', minQuestions: 200, badge: '⚙️', desc: '200+ problems in the trenches' },
  { name: 'Marathoner', minQuestions: 500, badge: '🏃', desc: '500+ questions completed' },
  { name: 'Iron Will Titan', minQuestions: 1000, badge: '🏛️', desc: '1,000+ problems conquered' },
];

export function calculateVolumeRank(answered: number): {
  rank: string;
  badge: string;
  tier: number;
  nextRank: string | null;
  neededForNext: number | null;
} {
  let currentRank = VOLUME_RANKS[0];
  let tier = 1;
  let nextRankTier: VolumeRankTier | null = VOLUME_RANKS[1] || null;

  for (let i = 0; i < VOLUME_RANKS.length; i++) {
    if (answered >= VOLUME_RANKS[i].minQuestions) {
      currentRank = VOLUME_RANKS[i];
      tier = i + 1;
      nextRankTier = VOLUME_RANKS[i + 1] || null;
    } else {
      break;
    }
  }

  const neededForNext = nextRankTier ? Math.max(0, nextRankTier.minQuestions - answered) : null;

  return {
    rank: currentRank.name,
    badge: currentRank.badge,
    tier,
    nextRank: nextRankTier ? nextRankTier.name : null,
    neededForNext,
  };
}

export const V1_ACHIEVEMENTS = [
  {
    code: 'FIRST_CRACK',
    title: 'First Crack',
    description: 'Solve your very first practice question.',
    icon: '🎯',
    xpReward: 25,
    category: 'PRACTICE',
    requirementValue: 1,
  },
  {
    code: 'GETTING_STARTED',
    title: 'Getting Started',
    description: 'Complete your first practice session.',
    icon: '🚀',
    xpReward: 50,
    category: 'PRACTICE',
    requirementValue: 1,
  },
  {
    code: 'HUNDRED_CLUB',
    title: '100 Club',
    description: 'Solve 100 total practice questions.',
    icon: '💯',
    xpReward: 100,
    category: 'VOLUME',
    requirementValue: 100,
  },
  {
    code: 'FIVE_HUNDRED_CLUB',
    title: '500 Club',
    description: 'Solve 500 total practice questions.',
    icon: '⚡',
    xpReward: 250,
    category: 'VOLUME',
    requirementValue: 500,
  },
  {
    code: 'CENTURY',
    title: 'Century',
    description: 'Solve 1,000 total questions.',
    icon: '👑',
    xpReward: 500,
    category: 'VOLUME',
    requirementValue: 1000,
  },
  {
    code: 'PERFECT_SESSION',
    title: 'Perfect Session',
    description: 'Complete a practice session with 100% accuracy (min 5 questions).',
    icon: '🌟',
    xpReward: 100,
    category: 'ACCURACY',
    requirementValue: 1,
  },
  {
    code: 'PERFECT_10',
    title: 'Perfect 10',
    description: 'Get 10 consecutive questions correct.',
    icon: '🔥',
    xpReward: 75,
    category: 'ACCURACY',
    requirementValue: 10,
  },
  {
    code: 'ON_FIRE',
    title: 'On Fire',
    description: 'Maintain an active 3-day practice streak.',
    icon: '🔥',
    xpReward: 100,
    category: 'STREAK',
    requirementValue: 3,
  },
  {
    code: 'WEEK_STRONG',
    title: 'Week Strong',
    description: 'Maintain an active 7-day practice streak.',
    icon: '🛡️',
    xpReward: 200,
    category: 'STREAK',
    requirementValue: 7,
  },
  {
    code: 'CONSISTENCY',
    title: 'Consistency',
    description: 'Practice on 14 total calendar days.',
    icon: '📅',
    xpReward: 300,
    category: 'CONSISTENCY',
    requirementValue: 14,
  },
  {
    code: 'SUBJECT_SPECIALIST',
    title: 'Subject Specialist',
    description: 'Complete 100 questions in any single subject.',
    icon: '🔬',
    xpReward: 150,
    category: 'MASTERY',
    requirementValue: 100,
  },
];

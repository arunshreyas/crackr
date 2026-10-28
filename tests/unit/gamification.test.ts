import '../test-helper';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAnswerXp,
  calculateLevel,
  calculateRank,
  calculateAccuracyRank,
  calculateStreakRank,
  calculateVolumeRank,
  DAILY_LOGIN_REWARDS,
  XP_CONFIG,
} from '../../lib/server/gamification/config';

describe('Gamification (XP, Levels, Ranks, Streaks) — Unit Tests', () => {
  describe('Level-Scaled Answer XP & Negative Penalties', () => {
    test('correct answers always award +20 XP across all levels', () => {
      assert.strictEqual(calculateAnswerXp(true, 1), 20);
      assert.strictEqual(calculateAnswerXp(true, 3), 20);
      assert.strictEqual(calculateAnswerXp(true, 5), 20);
      assert.strictEqual(calculateAnswerXp(true, 8), 20);
      assert.strictEqual(calculateAnswerXp(true, 12), 20);
      assert.strictEqual(XP_CONFIG.BASE_CORRECT_XP, 20);
    });

    test('wrong answers award +1 XP for Level 1 novices as participation token', () => {
      assert.strictEqual(calculateAnswerXp(false, 1), 1);
    });

    test('wrong answers award 0 XP for Level 2 and Level 3 learners', () => {
      assert.strictEqual(calculateAnswerXp(false, 2), 0);
      assert.strictEqual(calculateAnswerXp(false, 3), 0);
    });

    test('wrong answers penalize -2 XP for Level 4-6 scholars/challengers', () => {
      assert.strictEqual(calculateAnswerXp(false, 4), -2);
      assert.strictEqual(calculateAnswerXp(false, 5), -2);
      assert.strictEqual(calculateAnswerXp(false, 6), -2);
    });

    test('wrong answers penalize -5 XP for Level 7-10 experts/masters', () => {
      assert.strictEqual(calculateAnswerXp(false, 7), -5);
      assert.strictEqual(calculateAnswerXp(false, 8), -5);
      assert.strictEqual(calculateAnswerXp(false, 10), -5);
    });

    test('wrong answers penalize -10 XP for Level 11+ competitive JEE grandmasters', () => {
      assert.strictEqual(calculateAnswerXp(false, 11), -10);
      assert.strictEqual(calculateAnswerXp(false, 15), -10);
      assert.strictEqual(calculateAnswerXp(false, 25), -10);
    });
  });

  describe('Level Progression Calculations', () => {
    test('computes level 1 at 0 XP', () => {
      const res = calculateLevel(0);
      assert.strictEqual(res.level, 1);
      assert.strictEqual(res.currentLevelXp, 0);
      assert.strictEqual(res.nextLevelXp, 150);
      assert.strictEqual(res.progressPercentage, 0);
    });

    test('computes level 2 at 150 XP and calculates progress percentage accurately', () => {
      const res150 = calculateLevel(150);
      assert.strictEqual(res150.level, 2);
      assert.strictEqual(res150.currentLevelXp, 0);
      assert.strictEqual(res150.nextLevelXp, 200); // 350 - 150 = 200 span

      const res250 = calculateLevel(250);
      assert.strictEqual(res250.level, 2);
      assert.strictEqual(res250.currentLevelXp, 100);
      assert.strictEqual(res250.progressPercentage, 50); // 100 / 200 = 50%
    });

    test('progress percentage is bounded between 0 and 100', () => {
      const res = calculateLevel(100000);
      assert.ok(res.progressPercentage >= 0 && res.progressPercentage <= 100);
    });
  });

  describe('Global XP Rank Calculations', () => {
    test('calculates correct rank names, badges, and next rank distance', () => {
      const novice = calculateRank(100);
      assert.strictEqual(novice.rank, 'Novice');
      assert.strictEqual(novice.badge, '🌱');
      assert.strictEqual(novice.tier, 1);
      assert.strictEqual(novice.nextRank, 'Learner');
      assert.strictEqual(novice.xpToNextRank, 200); // 300 - 100

      const challenger = calculateRank(1500);
      assert.strictEqual(challenger.rank, 'Challenger');
      assert.strictEqual(challenger.badge, '🎯');
      assert.strictEqual(challenger.nextRank, 'Scholar');
      assert.strictEqual(challenger.xpToNextRank, 1000); // 2500 - 1500

      const cracker = calculateRank(25000);
      assert.strictEqual(cracker.rank, 'Cracker');
      assert.strictEqual(cracker.badge, '💎');
      assert.strictEqual(cracker.tier, 7);
      assert.strictEqual(cracker.nextRank, null);
      assert.strictEqual(cracker.xpToNextRank, null);
    });
  });

  describe('Multi-Category Rank Tiers', () => {
    test('Accuracy Rank tiers', () => {
      assert.strictEqual(calculateAccuracyRank(10).rank, 'Apprentice Solver');
      assert.strictEqual(calculateAccuracyRank(50).rank, 'Precision Striker');
      assert.strictEqual(calculateAccuracyRank(150).rank, 'Master Marksman');
      assert.strictEqual(calculateAccuracyRank(300).rank, 'Bullseye Prodigy');
      assert.strictEqual(calculateAccuracyRank(600).rank, 'Grandmaster Sniper');
    });

    test('Streak Rank tiers', () => {
      assert.strictEqual(calculateStreakRank(1).rank, 'Spark');
      assert.strictEqual(calculateStreakRank(5).rank, 'Flame');
      assert.strictEqual(calculateStreakRank(10).rank, 'Blaze');
      assert.strictEqual(calculateStreakRank(20).rank, 'Inferno');
      assert.strictEqual(calculateStreakRank(45).rank, 'Immortal');
    });

    test('Volume Rank tiers', () => {
      assert.strictEqual(calculateVolumeRank(20).rank, 'Explorer');
      assert.strictEqual(calculateVolumeRank(100).rank, 'Dedicated Aspirant');
      assert.strictEqual(calculateVolumeRank(350).rank, 'High-Output Grinder');
      assert.strictEqual(calculateVolumeRank(750).rank, 'Marathoner');
      assert.strictEqual(calculateVolumeRank(1500).rank, 'Iron Will Titan');
    });
  });

  describe('Daily Login Rewards Track', () => {
    test('confirms 7-day reward structure and ascending values', () => {
      assert.strictEqual(DAILY_LOGIN_REWARDS.length, 7);
      assert.strictEqual(DAILY_LOGIN_REWARDS[0].xp, 20);
      assert.strictEqual(DAILY_LOGIN_REWARDS[1].xp, 25);
      assert.strictEqual(DAILY_LOGIN_REWARDS[2].xp, 30);
      assert.strictEqual(DAILY_LOGIN_REWARDS[3].xp, 35);
      assert.strictEqual(DAILY_LOGIN_REWARDS[4].xp, 40);
      assert.strictEqual(DAILY_LOGIN_REWARDS[5].xp, 50);
      assert.strictEqual(DAILY_LOGIN_REWARDS[6].xp, 75);
    });
  });
});

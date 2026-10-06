import 'dotenv/config';
import Module from 'module';

// Polyfill server-only for offline test execution
// @ts-ignore
const originalLoad = Module._load;
// @ts-ignore
Module._load = function (request, parent, isMain) {
  if (request === 'server-only') {
    return {};
  }
  return originalLoad.apply(this, arguments);
};

import { PrismaClient, Stream } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function getGamificationConfig() {
  return await import('../lib/server/gamification/config');
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Database connection string required');

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runRanksAndLeaderboardVerification() {
  console.log('===========================================================');
  console.log('  RUNNING CRACKRR RANKS & LEADERBOARD VERIFICATION TESTS    ');
  console.log('===========================================================\n');

  const {
    calculateRank,
    calculateAccuracyRank,
    calculateStreakRank,
    calculateVolumeRank,
  } = await getGamificationConfig();

  const testBatchTag = `test_rank_${Date.now()}`;
  const createdUserIds: string[] = [];

  try {
    // 1. Test Gamification Config Formulas
    console.log('[Test 1] Testing Rank Tier Calculations and Thresholds...');

    // Accuracy Ranks
    console.log('  - Accuracy tier checks:');
    const acc0 = calculateAccuracyRank(0);
    const acc50 = calculateAccuracyRank(50);
    const acc150 = calculateAccuracyRank(150);
    const acc300 = calculateAccuracyRank(300);
    const acc600 = calculateAccuracyRank(600);

    if (acc0.rank !== 'Apprentice Solver' || acc0.tier !== 1) throw new Error(`Acc 0 failed: ${acc0.rank}`);
    if (acc50.rank !== 'Precision Striker' || acc50.tier !== 2) throw new Error(`Acc 50 failed: ${acc50.rank}`);
    if (acc150.rank !== 'Master Marksman' || acc150.tier !== 3) throw new Error(`Acc 150 failed: ${acc150.rank}`);
    if (acc300.rank !== 'Bullseye Prodigy' || acc300.tier !== 4) throw new Error(`Acc 300 failed: ${acc300.rank}`);
    if (acc600.rank !== 'Grandmaster Sniper' || acc600.tier !== 5) throw new Error(`Acc 600 failed: ${acc600.rank}`);
    console.log('    ✓ Accuracy Rank Tiers computed correctly.');

    // Mastery XP Ranks
    console.log('  - Mastery XP tier checks:');
    const xp0 = calculateRank(0);
    const xp500 = calculateRank(500);
    const xp1500 = calculateRank(1500);
    const xp3000 = calculateRank(3000);
    const xp6000 = calculateRank(6000);
    const xp12000 = calculateRank(12000);
    const xp25000 = calculateRank(25000);

    if (xp0.rank !== 'Novice') throw new Error(`XP 0 failed: ${xp0.rank}`);
    if (xp500.rank !== 'Learner') throw new Error(`XP 500 failed: ${xp500.rank}`);
    if (xp1500.rank !== 'Challenger') throw new Error(`XP 1500 failed: ${xp1500.rank}`);
    if (xp3000.rank !== 'Scholar') throw new Error(`XP 3000 failed: ${xp3000.rank}`);
    if (xp6000.rank !== 'Expert') throw new Error(`XP 6000 failed: ${xp6000.rank}`);
    if (xp12000.rank !== 'Master') throw new Error(`XP 12000 failed: ${xp12000.rank}`);
    if (xp25000.rank !== 'Cracker') throw new Error(`XP 25000 failed: ${xp25000.rank}`);
    console.log('    ✓ Mastery XP Rank Tiers computed correctly.');

    // Streak Ranks
    console.log('  - Streak tier checks:');
    const st0 = calculateStreakRank(0);
    const st5 = calculateStreakRank(5);
    const st10 = calculateStreakRank(10);
    const st20 = calculateStreakRank(20);
    const st35 = calculateStreakRank(35);

    if (st0.rank !== 'Spark') throw new Error(`Streak 0 failed: ${st0.rank}`);
    if (st5.rank !== 'Flame') throw new Error(`Streak 5 failed: ${st5.rank}`);
    if (st10.rank !== 'Blaze') throw new Error(`Streak 10 failed: ${st10.rank}`);
    if (st20.rank !== 'Inferno') throw new Error(`Streak 20 failed: ${st20.rank}`);
    if (st35.rank !== 'Immortal') throw new Error(`Streak 35 failed: ${st35.rank}`);
    console.log('    ✓ Streak Rank Tiers computed correctly.');

    // Volume Ranks
    console.log('  - Volume tier checks:');
    const v10 = calculateVolumeRank(10);
    const v100 = calculateVolumeRank(100);
    const v300 = calculateVolumeRank(300);
    const v700 = calculateVolumeRank(700);
    const v1500 = calculateVolumeRank(1500);

    if (v10.rank !== 'Explorer') throw new Error(`Volume 10 failed: ${v10.rank}`);
    if (v100.rank !== 'Dedicated Aspirant') throw new Error(`Volume 100 failed: ${v100.rank}`);
    if (v300.rank !== 'High-Output Grinder') throw new Error(`Volume 300 failed: ${v300.rank}`);
    if (v700.rank !== 'Marathoner') throw new Error(`Volume 700 failed: ${v700.rank}`);
    if (v1500.rank !== 'Iron Will Titan') throw new Error(`Volume 1500 failed: ${v1500.rank}`);
    console.log('    ✓ Volume Rank Tiers computed correctly.\n');

    // 2. Create 3 Simulated Users with Distinct Stats
    console.log('[Test 2] Creating 3 Test Aspirants with Controlled Metrics...');
    
    // User A: High Accuracy Master (520 correct / 600 answered, 8000 XP, 15d streak)
    const userA = await prisma.userProfile.create({
      data: {
        clerkId: `${testBatchTag}_A`,
        email: `${testBatchTag}_a@crackrr.app`,
        name: 'Alpha Solver',
        username: `${testBatchTag}_alpha`,
        school: 'Apex Academy',
        grade: 'Class 12',
        stream: Stream.PCM,
        onboardingCompleted: true,
        xp: 8000,
        questionsAnswered: 600,
        questionsCorrect: 520,
        currentStreak: 15,
        longestStreak: 20,
      },
    });
    createdUserIds.push(userA.id);

    // User B: High XP & Volume Titan (250 correct / 1200 answered, 22000 XP, 5d streak)
    const userB = await prisma.userProfile.create({
      data: {
        clerkId: `${testBatchTag}_B`,
        email: `${testBatchTag}_b@crackrr.app`,
        name: 'Beta Grinder',
        username: `${testBatchTag}_beta`,
        school: 'Titan Coaching',
        grade: 'Class 12',
        stream: Stream.PCM,
        onboardingCompleted: true,
        xp: 22000,
        questionsAnswered: 1200,
        questionsCorrect: 250,
        currentStreak: 5,
        longestStreak: 10,
      },
    });
    createdUserIds.push(userB.id);

    // User C: Streak Master (100 correct / 120 answered, 3500 XP, 32d streak)
    const userC = await prisma.userProfile.create({
      data: {
        clerkId: `${testBatchTag}_C`,
        email: `${testBatchTag}_c@crackrr.app`,
        name: 'Gamma Streaker',
        username: `${testBatchTag}_gamma`,
        school: 'Focus Institute',
        grade: 'Class 11',
        stream: Stream.PCM,
        onboardingCompleted: true,
        xp: 3500,
        questionsAnswered: 120,
        questionsCorrect: 100,
        currentStreak: 32,
        longestStreak: 32,
      },
    });
    createdUserIds.push(userC.id);

    console.log(`  ✓ User A created (ID: ${userA.id}) - 520 Correct, 8,000 XP, 15d Streak`);
    console.log(`  ✓ User B created (ID: ${userB.id}) - 250 Correct, 22,000 XP, 1,200 Solved`);
    console.log(`  ✓ User C created (ID: ${userC.id}) - 100 Correct, 3,500 XP, 32d Streak\n`);

    // 3. Test Accuracy Leaderboard Sorting & Rank Calculation
    console.log('[Test 3] Verifying Accuracy Leaderboard...');
    const topAccuracy = await prisma.userProfile.findMany({
      where: { id: { in: createdUserIds } },
      orderBy: [{ questionsCorrect: 'desc' }, { questionsAnswered: 'asc' }],
    });

    if (topAccuracy[0].id !== userA.id) throw new Error(`Expected User A to lead accuracy, got ${topAccuracy[0].name}`);
    if (topAccuracy[1].id !== userB.id) throw new Error(`Expected User B to be 2nd in accuracy, got ${topAccuracy[1].name}`);
    if (topAccuracy[2].id !== userC.id) throw new Error(`Expected User C to be 3rd in accuracy, got ${topAccuracy[2].name}`);
    console.log('  ✓ Accuracy Leaderboard correctly ordered: Alpha (#1: 520) > Beta (#2: 250) > Gamma (#3: 100)');

    // 4. Test Global XP Leaderboard Sorting & Rank Calculation
    console.log('[Test 4] Verifying Global XP Leaderboard...');
    const topXp = await prisma.userProfile.findMany({
      where: { id: { in: createdUserIds } },
      orderBy: { xp: 'desc' },
    });

    if (topXp[0].id !== userB.id) throw new Error(`Expected User B to lead XP, got ${topXp[0].name}`);
    if (topXp[1].id !== userA.id) throw new Error(`Expected User A to be 2nd in XP, got ${topXp[1].name}`);
    if (topXp[2].id !== userC.id) throw new Error(`Expected User C to be 3rd in XP, got ${topXp[2].name}`);
    console.log('  ✓ XP Leaderboard correctly ordered: Beta (#1: 22,000 XP) > Alpha (#2: 8,000 XP) > Gamma (#3: 3,500 XP)');

    // 5. Test Streak Leaderboard Sorting & Rank Calculation
    console.log('[Test 5] Verifying Streak Leaderboard...');
    const topStreak = await prisma.userProfile.findMany({
      where: { id: { in: createdUserIds } },
      orderBy: [{ currentStreak: 'desc' }, { longestStreak: 'desc' }],
    });

    if (topStreak[0].id !== userC.id) throw new Error(`Expected User C to lead streak, got ${topStreak[0].name}`);
    if (topStreak[1].id !== userA.id) throw new Error(`Expected User A to be 2nd in streak, got ${topStreak[1].name}`);
    if (topStreak[2].id !== userB.id) throw new Error(`Expected User B to be 3rd in streak, got ${topStreak[2].name}`);
    console.log('  ✓ Streak Leaderboard correctly ordered: Gamma (#1: 32d) > Alpha (#2: 15d) > Beta (#3: 5d)');

    // 6. Test Volume Leaderboard Sorting & Rank Calculation
    console.log('[Test 6] Verifying Volume Leaderboard...');
    const topVolume = await prisma.userProfile.findMany({
      where: { id: { in: createdUserIds } },
      orderBy: { questionsAnswered: 'desc' },
    });

    if (topVolume[0].id !== userB.id) throw new Error(`Expected User B to lead volume, got ${topVolume[0].name}`);
    if (topVolume[1].id !== userA.id) throw new Error(`Expected User A to be 2nd in volume, got ${topVolume[1].name}`);
    if (topVolume[2].id !== userC.id) throw new Error(`Expected User C to be 3rd in volume, got ${topVolume[2].name}`);
    console.log('  ✓ Volume Leaderboard correctly ordered: Beta (#1: 1,200 Qs) > Alpha (#2: 600 Qs) > Gamma (#3: 120 Qs)\n');

    // 7. Test User Exact Relative Rank Computations
    console.log('[Test 7] Testing Database Relative Rank Count Formulas...');
    // User C accuracy relative rank among this test cohort:
    const usersWithMoreCorrectThanC = await prisma.userProfile.count({
      where: {
        id: { in: createdUserIds },
        questionsCorrect: { gt: userC.questionsCorrect },
      },
    });
    const cAccuracyRank = usersWithMoreCorrectThanC + 1;
    if (cAccuracyRank !== 3) throw new Error(`Expected User C accuracy rank 3, got ${cAccuracyRank}`);
    console.log(`  ✓ User C relative accuracy rank computed accurately: #${cAccuracyRank}`);

    // User A streak relative rank among this test cohort:
    const usersWithMoreStreakThanA = await prisma.userProfile.count({
      where: {
        id: { in: createdUserIds },
        currentStreak: { gt: userA.currentStreak },
      },
    });
    const aStreakRank = usersWithMoreStreakThanA + 1;
    if (aStreakRank !== 2) throw new Error(`Expected User A streak rank 2, got ${aStreakRank}`);
    console.log(`  ✓ User A relative streak rank computed accurately: #${aStreakRank}\n`);

  } finally {
    // Clean up test data
    console.log('Cleaning up test users...');
    if (createdUserIds.length > 0) {
      await prisma.userProfile.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      console.log(`✓ Cleaned up ${createdUserIds.length} test user records.`);
    }
  }

  console.log('\n===========================================================');
  console.log('  ALL RANKS & LEADERBOARD VERIFICATION TESTS PASSED (7/7)  ');
  console.log('===========================================================');
}

runRanksAndLeaderboardVerification()
  .catch((e) => {
    console.error('Test failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

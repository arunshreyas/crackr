import 'dotenv/config';
import Module from 'module';

// Polyfill server-only for CLI test execution
// @ts-ignore
const originalLoad = Module._load;
// @ts-ignore
Module._load = function (request, parent, isMain) {
  if (request === 'server-only') {
    return {};
  }
  return originalLoad.apply(this, arguments);
};

async function runTests() {
  const { calculateAnswerXp, DAILY_LOGIN_REWARDS } = await import('../lib/server/gamification/config');
  const { checkAndClaimDailyLoginReward } = await import('../lib/server/gamification/service');
  const { prisma } = await import('../lib/server/db');

  console.log('===========================================================');
  console.log('  TESTING DAILY LOGIN REWARDS & LEVEL-SCALED XP SYSTEM     ');
  console.log('===========================================================\n');

  // Test 1: Level-scaled XP formula verification
  console.log('[Test 1] Testing Level-scaled answer XP calculations...');
  
  // Correct answers across all levels
  for (const lvl of [1, 2, 5, 8, 12]) {
    const correctXp = calculateAnswerXp(true, lvl);
    if (correctXp !== 20) {
      throw new Error(`Expected 20 XP for correct answer at level ${lvl}, got ${correctXp}`);
    }
  }
  console.log('  ✓ Correct answers award consistent +20 XP across all levels.');

  // Wrong answers scaled by level
  const expectedWrongMap: Record<number, number> = {
    1: 1,   // Level 1: +1 XP token
    2: 0,   // Level 2: 0 XP
    3: 0,   // Level 3: 0 XP
    4: -2,  // Level 4: -2 XP
    5: -2,  // Level 5: -2 XP
    6: -2,  // Level 6: -2 XP
    7: -5,  // Level 7: -5 XP
    10: -5, // Level 10: -5 XP
    11: -10,// Level 11: -10 XP
    20: -10,// Level 20: -10 XP
  };

  for (const [lvlStr, expectedXp] of Object.entries(expectedWrongMap)) {
    const lvl = parseInt(lvlStr);
    const wrongXp = calculateAnswerXp(false, lvl);
    if (wrongXp !== expectedXp) {
      throw new Error(`Expected ${expectedXp} XP for wrong answer at level ${lvl}, got ${wrongXp}`);
    }
  }
  console.log('  ✓ Level-scaled wrong answer XP matches requirements:');
  console.log('    - Level 1: +1 XP (Novice participation token)');
  console.log('    - Level 2-3: 0 XP (No reward for wrong answers)');
  console.log('    - Level 4-6: -2 XP (Penalty)');
  console.log('    - Level 7-10: -5 XP (Competitive penalty)');
  console.log('    - Level 11+: -10 XP (Advanced JEE penalty)');

  // Test 2: Daily Login Rewards Config
  console.log('\n[Test 2] Testing Daily Login Rewards structure...');
  if (DAILY_LOGIN_REWARDS.length !== 7) {
    throw new Error(`Expected 7 daily login reward tiers, got ${DAILY_LOGIN_REWARDS.length}`);
  }
  console.log('  ✓ 7-day daily login reward track confirmed:');
  DAILY_LOGIN_REWARDS.forEach((tier) => {
    console.log(`    - Day ${tier.day}: +${tier.xp} XP (${tier.title})`);
  });

  // Test 3: Database Integration for Daily Login Reward Claiming
  console.log('\n[Test 3] Testing Database Daily Login Reward Claiming & Idempotency...');
  const testClerkId = `test_daily_reward_${Date.now()}`;
  const testUser = await prisma.userProfile.create({
    data: {
      clerkId: testClerkId,
      email: `${testClerkId}@crackrr.test`,
      name: 'Daily Reward Tester',
      username: `tester_${Date.now()}`,
      school: 'Test School',
      grade: '12',
      stream: 'PCM',
      onboardingCompleted: true,
      currentStreak: 3,
      xp: 100,
      level: 1,
    },
  });

  try {
    // First claim
    const firstClaim = await checkAndClaimDailyLoginReward(testUser.id);
    console.log(`  ✓ Initial claim succeeded: +${firstClaim.rewardXp} XP on Streak Day ${firstClaim.streakDay}.`);
    if (!firstClaim.newlyClaimed || !firstClaim.claimedToday) {
      throw new Error('Expected first claim to be marked newlyClaimed and claimedToday');
    }
    if (firstClaim.totalXp !== 100 + firstClaim.rewardXp) {
      throw new Error(`Expected total XP to be ${100 + firstClaim.rewardXp}, got ${firstClaim.totalXp}`);
    }

    // Second claim on same day (idempotency check)
    const secondClaim = await checkAndClaimDailyLoginReward(testUser.id);
    console.log(`  ✓ Second call on same day returned idempotent state: claimedToday=${secondClaim.claimedToday}, newlyClaimed=${secondClaim.newlyClaimed}`);
    if (secondClaim.newlyClaimed) {
      throw new Error('Second call on same day should NOT be marked newlyClaimed');
    }
    if (secondClaim.totalXp !== firstClaim.totalXp) {
      throw new Error('Total XP changed on second call! Idempotency failed.');
    }

    // Verify XP transaction recorded in DB
    const txCount = await prisma.xPTransaction.count({
      where: {
        userId: testUser.id,
        reason: { startsWith: 'DAILY_LOGIN' },
      },
    });
    if (txCount !== 1) {
      throw new Error(`Expected exactly 1 DAILY_LOGIN transaction, found ${txCount}`);
    }
    console.log('  ✓ Exactly 1 daily login transaction recorded in database audit ledger.');
  } finally {
    // Cleanup test user
    await prisma.xPTransaction.deleteMany({ where: { userId: testUser.id } });
    await prisma.userProfile.delete({ where: { id: testUser.id } });
    console.log('  ✓ Cleaned up test user data.');
    await prisma.$disconnect();
  }

  console.log('\n===========================================================');
  console.log('  ALL DAILY LOGIN & XP SCALING TESTS PASSED SUCCESSFULLY!  ');
  console.log('===========================================================');
}

runTests()
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });

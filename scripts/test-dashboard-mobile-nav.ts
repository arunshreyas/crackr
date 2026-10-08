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
  const { prisma } = await import('../lib/server/db');
  const { getDashboardData } = await import('../lib/services/dashboard');
  const { startPracticeSession } = await import('../lib/server/practice/service');

  console.log('===========================================================');
  console.log('  TESTING DASHBOARD HERO, RESUME & RETURNING USER FLOW    ');
  console.log('===========================================================\n');

  // Test 1: Returning / Previously Signed-in User Data Preservation
  console.log('[Test 1] Testing Returning User with Existing Progress...');
  const testClerkId = `clerk_returning_user_${Date.now()}`;
  const user = await prisma.userProfile.create({
    data: {
      clerkId: testClerkId,
      email: `${testClerkId}@crackrr.test`,
      name: 'Returning Aspirant',
      username: `returning_${Date.now()}`,
      school: 'Delhi Public School',
      grade: '12',
      stream: 'PCM',
      onboardingCompleted: true,
      currentStreak: 5,
      longestStreak: 12,
      xp: 4500,
      level: 4,
      questionsAnswered: 225,
      questionsCorrect: 180,
    },
  });

  try {
    // 1. Fetch dashboard data when user has NO active session
    const dash1 = await getDashboardData(testClerkId);
    if (!dash1) throw new Error('Dashboard data returned null for valid user');

    if (dash1.profile.name !== 'Returning Aspirant') throw new Error('Profile name mismatch');
    if (dash1.overview.totalXp < 4500) throw new Error('XP was degraded or reset');
    if (dash1.overview.currentStreak !== 5) throw new Error('Streak was degraded or reset');
    if (dash1.activeSession !== null) throw new Error('Expected activeSession to be null initially');

    console.log('  ✓ Returning user profile loaded with 100% data integrity:');
    console.log(`    - XP: ${dash1.overview.totalXp} (Level ${dash1.profile.level})`);
    console.log(`    - Streak: ${dash1.overview.currentStreak} days`);
    console.log(`    - Active session detected: None (Hero shows Start Practice)`);

    // 2. Create an active persistent session
    console.log('\n[Test 2] Testing Dashboard with Active/Resumable Session...');
    const sampleQuestions = await prisma.question.findMany({ take: 5, select: { id: true } });
    if (sampleQuestions.length === 0) throw new Error('No questions found in question bank');

    const activeSession = await prisma.quizSession.create({
      data: {
        userId: user.id,
        subject: 'CHEMISTRY',
        chapter: 'Chemical Bonding',
        difficulty: 'MEDIUM',
        status: 'ACTIVE',
        questionIds: sampleQuestions.map((q) => q.id),
        totalQuestions: 5,
        currentQuestionIndex: 2,
        durationSeconds: 120,
      },
    });

    // Add 2 answered questions to this session
    await prisma.quizAnswer.createMany({
      data: [
        {
          sessionId: activeSession.id,
          userId: user.id,
          questionId: sampleQuestions[0].id,
          selectedOption: 'A',
          isCorrect: true,
          timeTakenSeconds: 45,
        },
        {
          sessionId: activeSession.id,
          userId: user.id,
          questionId: sampleQuestions[1].id,
          selectedOption: 'B',
          isCorrect: false,
          timeTakenSeconds: 50,
        },
      ],
    });

    // Fetch dashboard data with active session
    const dash2 = await getDashboardData(testClerkId);
    if (!dash2) throw new Error('Dashboard data returned null');
    if (!dash2.activeSession) throw new Error('Expected activeSession to be populated');

    if (dash2.activeSession.sessionId !== activeSession.id) {
      throw new Error(`Expected activeSession ID ${activeSession.id}, got ${dash2.activeSession.sessionId}`);
    }
    if (dash2.activeSession.subject !== 'CHEMISTRY') {
      throw new Error(`Expected subject CHEMISTRY, got ${dash2.activeSession.subject}`);
    }
    if (dash2.activeSession.answeredCount !== 2) {
      throw new Error(`Expected 2 answered questions, got ${dash2.activeSession.answeredCount}`);
    }
    if (dash2.activeSession.remainingQuestions !== 3) {
      throw new Error(`Expected 3 remaining questions, got ${dash2.activeSession.remainingQuestions}`);
    }

    console.log('  ✓ Active session correctly detected and prioritized for Hero Resume action:');
    console.log(`    - Session ID: ${dash2.activeSession.sessionId}`);
    console.log(`    - Subject: ${dash2.activeSession.subject} · ${dash2.activeSession.chapter}`);
    console.log(`    - Progress: ${dash2.activeSession.answeredCount} / ${dash2.activeSession.totalQuestions} answered (${dash2.activeSession.remainingQuestions} remaining)`);

    // 3. Verify no duplicate profile was created
    const profileCount = await prisma.userProfile.count({
      where: { clerkId: testClerkId },
    });
    if (profileCount !== 1) {
      throw new Error(`Expected exactly 1 profile, found ${profileCount}`);
    }
    console.log('  ✓ Verified exactly 1 UserProfile record exists (Zero duplicate creation).');

  } finally {
    // Cleanup
    await prisma.quizAnswer.deleteMany({ where: { userId: user.id } });
    await prisma.quizSession.deleteMany({ where: { userId: user.id } });
    await prisma.xPTransaction.deleteMany({ where: { userId: user.id } });
    await prisma.userProfile.delete({ where: { id: user.id } });
    console.log('  ✓ Cleaned up test user data.');
    await prisma.$disconnect();
  }

  console.log('\n===========================================================');
  console.log('  ALL DASHBOARD & RETURNING USER TESTS PASSED!             ');
  console.log('===========================================================');
}

runTests()
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });

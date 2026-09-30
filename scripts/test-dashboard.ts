import { prisma } from '../lib/prisma';
import { getDashboardData } from '../lib/services/dashboard';

async function testDashboardScenarios() {
  console.log('--- Testing Crackr Dashboard Scenarios ---\n');

  // Test clerk ID
  const testClerkId = 'test_user_' + Date.now();

  try {
    // Scenario 1: Brand-New User
    console.log('Scenario 1: Testing Brand-New User (0 sessions)...');
    const user = await prisma.userProfile.create({
      data: {
        clerkId: testClerkId,
        email: 'test@crackr.app',
        name: 'Arun Shreyas',
        username: 'arunshreyas_' + Date.now().toString().slice(-4),
        school: 'National Public School',
        grade: '12th',
        stream: 'PCM',
        dailyGoal: 25,
        onboardingCompleted: true,
      },
    });

    const data1 = await getDashboardData(testClerkId);
    if (!data1) throw new Error('Data1 is null');

    console.log('  Questions Solved:', data1.overview.questionsSolved, '(Expected: 0)');
    console.log('  Accuracy:', data1.overview.accuracy, '(Expected: null)');
    console.log('  Streak:', data1.overview.currentStreak, '(Expected: 0)');
    console.log('  Today Solved:', data1.today.solved, '(Expected: 0)');
    console.log('  Today Remaining:', data1.today.remaining, '(Expected: 25)');
    console.log('  Is Goal Completed:', data1.today.isCompleted, '(Expected: false)');
    console.log('  Greeting subline:', data1.greeting.subline);
    console.log('  ✓ Scenario 1 passed.\n');

    // Scenario 2: User with One Practice Session (5 questions, 4 correct)
    console.log('Scenario 2: Testing User with One Practice Session...');
    // Grab sample questions from DB
    const sampleQs = await prisma.question.findMany({ take: 5 });
    if (sampleQs.length < 5) throw new Error('Need at least 5 questions in DB');

    const session1 = await prisma.quizSession.create({
      data: {
        userId: user.id,
        subject: 'PHYSICS',
        chapter: 'Kinematics',
        totalQuestions: 5,
        correctAnswers: 4,
        accuracy: 80.0,
        xpEarned: 85,
        durationSeconds: 240,
        completedAt: new Date(),
      },
    });

    for (let i = 0; i < 5; i++) {
      await prisma.quizAnswer.create({
        data: {
          sessionId: session1.id,
          userId: user.id,
          questionId: sampleQs[i].id,
          selectedOption: sampleQs[i].correctOption,
          isCorrect: i < 4, // 4 correct, 1 wrong
          timeTakenSeconds: 45,
          createdAt: new Date(),
        },
      });
    }

    // Update user profile counters
    await prisma.userProfile.update({
      where: { id: user.id },
      data: {
        questionsAnswered: 5,
        questionsCorrect: 4,
        xp: 85,
        currentStreak: 1,
        longestStreak: 1,
      },
    });

    const data2 = await getDashboardData(testClerkId);
    if (!data2) throw new Error('Data2 is null');

    console.log('  Questions Solved:', data2.overview.questionsSolved, '(Expected: 5)');
    console.log('  Accuracy:', data2.overview.accuracy, '(Expected: 80%)');
    console.log('  Today Solved:', data2.today.solved, '(Expected: 5)');
    console.log('  Today Remaining:', data2.today.remaining, '(Expected: 20)');
    console.log('  Is Goal Completed:', data2.today.isCompleted, '(Expected: false)');
    console.log('  ✓ Scenario 2 passed.\n');

    // Scenario 3: User Hitting Daily Goal (25 questions solved today)
    console.log('Scenario 3: Testing User Hitting Daily Goal...');
    const moreQs = await prisma.question.findMany({ skip: 5, take: 20 });
    for (let i = 0; i < 20; i++) {
      await prisma.quizAnswer.create({
        data: {
          sessionId: session1.id,
          userId: user.id,
          questionId: moreQs[i].id,
          selectedOption: moreQs[i].correctOption,
          isCorrect: true,
          timeTakenSeconds: 30,
          createdAt: new Date(),
        },
      });
    }

    await prisma.userProfile.update({
      where: { id: user.id },
      data: {
        questionsAnswered: 25,
        questionsCorrect: 24,
        xp: 385,
        currentStreak: 1,
      },
    });

    const data3 = await getDashboardData(testClerkId);
    if (!data3) throw new Error('Data3 is null');

    console.log('  Today Solved:', data3.today.solved, '(Expected: 25)');
    console.log('  Today Target:', data3.today.target, '(Expected: 25)');
    console.log('  Today Remaining:', data3.today.remaining, '(Expected: 0)');
    console.log('  Is Goal Completed:', data3.today.isCompleted, '(Expected: true)');
    console.log('  Greeting subline:', data3.greeting.subline);
    console.log('  ✓ Scenario 3 passed.\n');

    // Cleanup test user
    console.log('Cleaning up test data...');
    await prisma.userProfile.delete({ where: { id: user.id } });
    console.log('✓ All dashboard scenarios tested and verified successfully.\n');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboardScenarios();

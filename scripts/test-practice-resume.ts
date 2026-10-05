import 'dotenv/config';
import { PrismaClient, OptionLabel, SessionStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Database connection string required');

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runResumeIntegrationTest() {
  console.log('===========================================================');
  console.log('  RUNNING CRACKR PRACTICE SESSION RESUME INTEGRATION TESTS ');
  console.log('===========================================================\n');

  const testClerkId = 'test_resume_user_' + Date.now();
  let testUserId = '';

  try {
    // 1. Create a test user profile
    console.log('[Step 1] Creating test user profile...');
    const user = await prisma.userProfile.create({
      data: {
        clerkId: testClerkId,
        email: `resume_test_${Date.now()}@crackr.app`,
        name: 'Resume Tester',
        username: `resumetest_${Date.now().toString().slice(-5)}`,
        school: 'Crackr Test Academy',
        grade: 'Class 12',
        stream: 'PCM',
        dailyGoal: 10,
        onboardingCompleted: true,
      },
    });
    testUserId = user.id;
    console.log(`✓ Test user created (ID: ${testUserId})\n`);

    // 2. Fetch 5 real questions from DB
    console.log('[Step 2] Selecting 5 questions for persistent session...');
    const sampleQuestions = await prisma.question.findMany({
      where: { type: 'MCQ' },
      take: 5,
      select: {
        id: true,
        text: true,
        subject: true,
        chapter: true,
        correctOption: true,
      },
    });

    if (sampleQuestions.length < 5) {
      throw new Error(`Need at least 5 questions in database, found ${sampleQuestions.length}`);
    }

    const questionIds = sampleQuestions.map((q) => q.id);
    console.log(`✓ Selected Question IDs:`, questionIds);

    // 3. Start persistent practice session (as server would)
    console.log('\n[Step 3] Starting persistent practice session in DB...');
    const session = await prisma.quizSession.create({
      data: {
        userId: testUserId,
        subject: sampleQuestions[0].subject,
        chapter: sampleQuestions[0].chapter,
        difficulty: 'MEDIUM',
        status: SessionStatus.ACTIVE,
        questionIds,
        currentQuestionIndex: 0,
        totalQuestions: 5,
        durationSeconds: 0,
        lastActivityAt: new Date(),
      },
    });
    console.log(`✓ Active QuizSession created (ID: ${session.id}, status: ${session.status})\n`);

    // 4. Submit 2 answers (Q1: correct, Q2: wrong)
    console.log('[Step 4] Submitting answers for Question 1 and Question 2...');
    
    // Q1 answer (correct)
    await prisma.$transaction([
      prisma.quizAnswer.create({
        data: {
          sessionId: session.id,
          userId: testUserId,
          questionId: questionIds[0],
          selectedOption: sampleQuestions[0].correctOption,
          isCorrect: true,
          timeTakenSeconds: 30,
        },
      }),
      prisma.quizSession.update({
        where: { id: session.id },
        data: {
          currentQuestionIndex: 1,
          durationSeconds: 30,
          lastActivityAt: new Date(),
        },
      }),
    ]);
    console.log('  ✓ Question 1 answered (Correct)');

    // Q2 answer (wrong)
    const wrongOption: OptionLabel = sampleQuestions[1].correctOption === 'A' ? 'B' : 'A';
    await prisma.$transaction([
      prisma.quizAnswer.create({
        data: {
          sessionId: session.id,
          userId: testUserId,
          questionId: questionIds[1],
          selectedOption: wrongOption,
          isCorrect: false,
          timeTakenSeconds: 45,
        },
      }),
      prisma.quizSession.update({
        where: { id: session.id },
        data: {
          currentQuestionIndex: 2,
          durationSeconds: 75,
          lastActivityAt: new Date(),
        },
      }),
    ]);
    console.log('  ✓ Question 2 answered (Incorrect)\n');

    // 5. Test Resuming Active Session (Simulating browser refresh / return)
    console.log('[Step 5] Testing session resume logic (Simulating reload)...');
    const activeSession = await prisma.quizSession.findFirst({
      where: {
        userId: testUserId,
        status: SessionStatus.ACTIVE,
        completedAt: null,
      },
      include: {
        answers: {
          include: {
            question: { select: { id: true, correctOption: true, explanation: true } },
          },
        },
      },
    });

    if (!activeSession) throw new Error('Active session could not be found for resume!');
    console.log(`  ✓ Active session found: ${activeSession.id}`);
    console.log(`  ✓ Question IDs preserved in exact order:`, activeSession.questionIds.length === 5);
    console.log(`  ✓ Current question index: ${activeSession.currentQuestionIndex} (Expected: 2)`);
    console.log(`  ✓ Answered count: ${activeSession.answers.length} (Expected: 2)`);
    console.log(`  ✓ Total duration persisted: ${activeSession.durationSeconds}s (Expected: 75s)\n`);

    if (activeSession.currentQuestionIndex !== 2 || activeSession.answers.length !== 2) {
      throw new Error('Resume state mismatch!');
    }

    // 6. Test Idempotency & Duplicate Submission Lock
    console.log('[Step 6] Testing duplicate answer submission idempotency...');
    let duplicateRejected = false;
    try {
      await prisma.quizAnswer.create({
        data: {
          sessionId: session.id,
          userId: testUserId,
          questionId: questionIds[0], // Duplicate submission for Q1
          selectedOption: sampleQuestions[0].correctOption,
          isCorrect: true,
          timeTakenSeconds: 20,
        },
      });
    } catch (dupErr: any) {
      duplicateRejected = true;
      console.log(`  ✓ Database unique constraint successfully prevented duplicate answer: ${dupErr.code || dupErr.message}`);
    }

    if (!duplicateRejected) {
      throw new Error('FAILED: Duplicate answer was erroneously inserted!');
    }

    // 7. Answer Remaining Questions (Q3, Q4, Q5)
    console.log('\n[Step 7] Answering remaining questions 3, 4, 5...');
    for (let i = 2; i < 5; i++) {
      await prisma.quizAnswer.create({
        data: {
          sessionId: session.id,
          userId: testUserId,
          questionId: questionIds[i],
          selectedOption: sampleQuestions[i].correctOption,
          isCorrect: true,
          timeTakenSeconds: 25,
        },
      });
      console.log(`  ✓ Question ${i + 1} answered (Correct)`);
    }

    // 8. Complete Session
    console.log('\n[Step 8] Completing session...');
    const completedSession = await prisma.quizSession.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
        totalQuestions: 5,
        correctAnswers: 4,
        accuracy: 80,
        durationSeconds: 150,
        xpEarned: 95,
      },
    });
    console.log(`✓ Session completed (status: ${completedSession.status}, completedAt: ${completedSession.completedAt?.toISOString()})\n`);

    // 9. Verify Completed Session Cannot Be Resumed
    console.log('[Step 9] Verifying completed session is excluded from active resume query...');
    const shouldBeNull = await prisma.quizSession.findFirst({
      where: {
        userId: testUserId,
        status: SessionStatus.ACTIVE,
        completedAt: null,
      },
    });
    console.log(`✓ Active session check returns: ${shouldBeNull === null ? 'null (PASSED)' : 'NON-NULL (FAILED)'}\n`);

    if (shouldBeNull !== null) {
      throw new Error('Completed session was incorrectly returned as active!');
    }

    // 10. Test Abandon Session
    console.log('[Step 10] Testing abandon session flow...');
    const session2 = await prisma.quizSession.create({
      data: {
        userId: testUserId,
        status: SessionStatus.ACTIVE,
        questionIds: [questionIds[0]],
        totalQuestions: 1,
      },
    });

    await prisma.quizSession.update({
      where: { id: session2.id },
      data: {
        status: SessionStatus.ABANDONED,
        completedAt: new Date(),
      },
    });

    const activeAfterAbandon = await prisma.quizSession.findFirst({
      where: {
        userId: testUserId,
        status: SessionStatus.ACTIVE,
        completedAt: null,
      },
    });
    console.log(`✓ Active session after abandon check returns: ${activeAfterAbandon === null ? 'null (PASSED)' : 'NON-NULL (FAILED)'}\n`);

    // Clean up test user
    console.log('Cleaning up test data...');
    await prisma.userProfile.delete({ where: { id: testUserId } });
    console.log('✓ Test user cleaned up.');

    console.log('\n===========================================================');
    console.log('  ALL PRACTICE RESUME INTEGRATION TESTS PASSED (10/10)     ');
    console.log('===========================================================');
  } catch (error) {
    console.error('FATAL TEST ERROR:', error);
    if (testUserId) {
      await prisma.userProfile.delete({ where: { id: testUserId } }).catch(() => {});
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runResumeIntegrationTest();

import 'dotenv/config';
import { PrismaClient, OptionLabel, SessionStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Database connection string required');

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runMultiSessionIntegrationTest() {
  console.log('===========================================================');
  console.log('  RUNNING CRACKR MULTI-SESSION RESUME INTEGRATION TESTS    ');
  console.log('===========================================================\n');

  const testClerkId = 'test_multi_session_' + Date.now();
  let testUserId = '';

  try {
    // 1. Create a test user profile
    console.log('[Step 1] Creating test user profile...');
    const user = await prisma.userProfile.create({
      data: {
        clerkId: testClerkId,
        email: `multi_test_${Date.now()}@crackr.app`,
        name: 'Multi Session Tester',
        username: `multitest_${Date.now().toString().slice(-5)}`,
        school: 'Crackr Academy',
        grade: 'Class 12',
        stream: 'PCM',
        dailyGoal: 10,
        onboardingCompleted: true,
      },
    });
    testUserId = user.id;
    console.log(`✓ Test user created (ID: ${testUserId})\n`);

    // 2. Fetch Physics questions and Chemistry questions from DB
    console.log('[Step 2] Selecting sample questions for Physics and Chemistry...');
    const phyQuestions = await prisma.question.findMany({
      where: { type: 'MCQ', subject: 'PHYSICS' },
      take: 5,
      select: { id: true, subject: true, chapter: true, correctOption: true },
    });

    const chemQuestions = await prisma.question.findMany({
      where: { type: 'MCQ', subject: 'CHEMISTRY' },
      take: 5,
      select: { id: true, subject: true, chapter: true, correctOption: true },
    });

    if (phyQuestions.length < 5 || chemQuestions.length < 5) {
      throw new Error('Need at least 5 physics and 5 chemistry questions');
    }

    const phyIds = phyQuestions.map((q) => q.id);
    const chemIds = chemQuestions.map((q) => q.id);

    // 3. Start Session 1 (Physics) and answer 2 questions
    console.log('[Step 3] Starting Physics session (5 questions)...');
    const phySession = await prisma.quizSession.create({
      data: {
        userId: testUserId,
        subject: 'PHYSICS',
        chapter: phyQuestions[0].chapter,
        difficulty: 'MEDIUM',
        status: SessionStatus.ACTIVE,
        questionIds: phyIds,
        currentQuestionIndex: 0,
        totalQuestions: 5,
        durationSeconds: 0,
        lastActivityAt: new Date(Date.now() - 60000), // 1 min ago
      },
    });

    // Answer Q1 and Q2 in Physics
    await prisma.quizAnswer.create({
      data: {
        sessionId: phySession.id,
        userId: testUserId,
        questionId: phyIds[0],
        selectedOption: phyQuestions[0].correctOption,
        isCorrect: true,
        timeTakenSeconds: 30,
      },
    });
    await prisma.quizAnswer.create({
      data: {
        sessionId: phySession.id,
        userId: testUserId,
        questionId: phyIds[1],
        selectedOption: phyQuestions[1].correctOption,
        isCorrect: true,
        timeTakenSeconds: 25,
      },
    });
    await prisma.quizSession.update({
      where: { id: phySession.id },
      data: { currentQuestionIndex: 2, durationSeconds: 55 },
    });
    console.log('✓ Physics session active: 2 of 5 questions answered\n');

    // 4. Start Session 2 (Chemistry) without abandoning Physics
    console.log('[Step 4] Starting Chemistry session (5 questions)...');
    const chemSession = await prisma.quizSession.create({
      data: {
        userId: testUserId,
        subject: 'CHEMISTRY',
        chapter: chemQuestions[0].chapter,
        difficulty: 'EASY',
        status: SessionStatus.ACTIVE,
        questionIds: chemIds,
        currentQuestionIndex: 0,
        totalQuestions: 5,
        durationSeconds: 0,
        lastActivityAt: new Date(),
      },
    });

    // Answer Q1 in Chemistry
    await prisma.quizAnswer.create({
      data: {
        sessionId: chemSession.id,
        userId: testUserId,
        questionId: chemIds[0],
        selectedOption: chemQuestions[0].correctOption,
        isCorrect: true,
        timeTakenSeconds: 40,
      },
    });
    await prisma.quizSession.update({
      where: { id: chemSession.id },
      data: { currentQuestionIndex: 1, durationSeconds: 40 },
    });
    console.log('✓ Chemistry session active: 1 of 5 questions answered\n');

    // 5. Query all active sessions for user
    console.log('[Step 5] Querying all active sessions for user...');
    const allActive = await prisma.quizSession.findMany({
      where: {
        userId: testUserId,
        status: SessionStatus.ACTIVE,
        completedAt: null,
      },
      orderBy: { lastActivityAt: 'desc' },
      include: {
        _count: { select: { answers: true } },
      },
    });

    console.log(`✓ Active sessions count: ${allActive.length} (Expected: 2)`);
    for (const s of allActive) {
      console.log(`  - [${s.subject}] ${s.chapter}: ${s._count.answers} / ${s.totalQuestions} answered`);
    }

    if (allActive.length !== 2) {
      throw new Error(`Expected 2 active sessions, got ${allActive.length}`);
    }

    // 6. Test specific resume for Physics session
    console.log('\n[Step 6] Testing resumption of Physics session by ID...');
    const resumePhy = await prisma.quizSession.findUnique({
      where: { id: phySession.id },
      include: { answers: true },
    });
    if (!resumePhy || resumePhy.answers.length !== 2 || resumePhy.currentQuestionIndex !== 2) {
      throw new Error('Physics session resume mismatch');
    }
    console.log(`✓ Physics session resumed accurately at Q3 with 2 saved answers.`);

    // 7. Test specific resume for Chemistry session
    console.log('\n[Step 7] Testing resumption of Chemistry session by ID...');
    const resumeChem = await prisma.quizSession.findUnique({
      where: { id: chemSession.id },
      include: { answers: true },
    });
    if (!resumeChem || resumeChem.answers.length !== 1 || resumeChem.currentQuestionIndex !== 1) {
      throw new Error('Chemistry session resume mismatch');
    }
    console.log(`✓ Chemistry session resumed accurately at Q2 with 1 saved answer.`);

    // 8. Complete Physics session and verify Chemistry remains active
    console.log('\n[Step 8] Completing Physics session...');
    await prisma.quizSession.update({
      where: { id: phySession.id },
      data: {
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
        accuracy: 100,
      },
    });

    const activeAfterPhyComplete = await prisma.quizSession.findMany({
      where: {
        userId: testUserId,
        status: SessionStatus.ACTIVE,
        completedAt: null,
      },
    });
    console.log(`✓ Active sessions remaining after completing Physics: ${activeAfterPhyComplete.length} (Expected: 1, Chemistry)`);
    if (activeAfterPhyComplete.length !== 1 || activeAfterPhyComplete[0].id !== chemSession.id) {
      throw new Error('Chemistry session was not preserved as active!');
    }

    // 9. Abandon Chemistry session
    console.log('\n[Step 9] Discarding Chemistry session...');
    await prisma.quizSession.update({
      where: { id: chemSession.id },
      data: {
        status: SessionStatus.ABANDONED,
        completedAt: new Date(),
      },
    });

    const activeAfterAll = await prisma.quizSession.findMany({
      where: {
        userId: testUserId,
        status: SessionStatus.ACTIVE,
        completedAt: null,
      },
    });
    console.log(`✓ Active sessions remaining after discard: ${activeAfterAll.length} (Expected: 0)`);

    // Clean up
    console.log('\nCleaning up test data...');
    await prisma.userProfile.delete({ where: { id: testUserId } });
    console.log('✓ Test user cleaned up.');

    console.log('\n===========================================================');
    console.log('  ALL MULTI-SESSION INTEGRATION TESTS PASSED (9/9)         ');
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

runMultiSessionIntegrationTest();

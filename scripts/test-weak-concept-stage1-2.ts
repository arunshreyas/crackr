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

async function runStage1And2Tests() {
  const { prisma } = await import('../lib/server/db');
  const {
    normalizeTopicName,
    buildConceptKey,
    parseConceptKey,
    auditConceptTaxonomy,
  } = await import('../lib/server/concepts/metadata');
  const { getUserConceptAttempts } = await import('../lib/server/concepts/attempts');

  console.log('===========================================================');
  console.log('  TESTING STAGE 1 (METADATA AUDIT) & STAGE 2 (ATTEMPTS)    ');
  console.log('===========================================================\n');

  // Test 1: Concept Metadata Normalization & Canonical Keys
  console.log('[Test 1] Testing Concept Metadata Normalization...');
  if (normalizeTopicName(null, 'Mechanics') !== 'Mechanics') {
    throw new Error('Failed to fallback to chapter on null topic');
  }
  if (normalizeTopicName('   ', 'Thermodynamics') !== 'Thermodynamics') {
    throw new Error('Failed to fallback to chapter on whitespace topic');
  }
  if (normalizeTopicName('Refraction at Spherical Surface') !== 'Refraction at Spherical Surface') {
    throw new Error('Failed to preserve valid topic');
  }

  const sampleKey = buildConceptKey('PHYSICS', 'Geometrical Optics', 'Total Internal Reflection');
  if (sampleKey !== 'PHYSICS::Geometrical Optics::Total Internal Reflection') {
    throw new Error(`Unexpected concept key: ${sampleKey}`);
  }

  const parsed = parseConceptKey(sampleKey);
  if (
    parsed.subject !== 'PHYSICS' ||
    parsed.chapter !== 'Geometrical Optics' ||
    parsed.topic !== 'Total Internal Reflection'
  ) {
    throw new Error(`Failed to parse concept key back into components: ${JSON.stringify(parsed)}`);
  }
  console.log('  ✓ Topic normalization and canonical concept keys verified.');

  // Test 2: Database Taxonomy Audit
  console.log('\n[Test 2] Running Question Bank Taxonomy Audit...');
  const auditReport = await auditConceptTaxonomy(prisma);
  console.log(`  ✓ Total Questions: ${auditReport.totalQuestions}`);
  console.log(`  ✓ Total Chapters: ${auditReport.totalChapters}`);
  console.log(`  ✓ Total Distinct Concepts: ${auditReport.totalConcepts}`);
  console.log(`  ✓ Questions with Null Topic: ${auditReport.nullTopicCount} (Handled gracefully by fallback)`);
  console.log(`  ✓ Physics concepts: ${auditReport.subjectBreakdown.PHYSICS.conceptCount}`);
  console.log(`  ✓ Chemistry concepts: ${auditReport.subjectBreakdown.CHEMISTRY.conceptCount}`);
  console.log(`  ✓ Mathematics concepts: ${auditReport.subjectBreakdown.MATHEMATICS.conceptCount}`);
  if (auditReport.totalQuestions === 0) {
    throw new Error('Question bank empty or unreadable');
  }

  // Test 3: User Attempt Tracking & Aggregation
  console.log('\n[Test 3] Testing User Attempt Tracking & Aggregation...');
  const testClerkId = `test_concept_attempts_${Date.now()}`;
  const user = await prisma.userProfile.create({
    data: {
      clerkId: testClerkId,
      email: `${testClerkId}@crackrr.test`,
      name: 'Attempt Tracking Tester',
      username: `att_tester_${Date.now().toString().slice(-6)}`,
      school: 'Concept High',
      grade: '12',
      stream: 'PCM',
      onboardingCompleted: true,
    },
  });

  const testClerkId2 = `test_isolation_user_${Date.now()}`;
  const user2 = await prisma.userProfile.create({
    data: {
      clerkId: testClerkId2,
      email: `${testClerkId2}@crackrr.test`,
      name: 'Isolation Tester',
      username: `iso_tester_${Date.now().toString().slice(-6)}`,
      school: 'Concept High',
      grade: '12',
      stream: 'PCM',
      onboardingCompleted: true,
    },
  });

  try {
    // Pick 2 existing questions from DB
    const questions = await prisma.question.findMany({
      take: 2,
      select: { id: true, subject: true, chapter: true, topic: true },
    });

    if (questions.length < 2) {
      throw new Error('Need at least 2 questions in database for test');
    }

    const q1 = questions[0];
    const q2 = questions[1];

    // Seed 4 answers for User 1 on Q1 (3 incorrect, 1 correct; one fast <15s, one slow >120s)
    await prisma.quizAnswer.createMany({
      data: [
        {
          userId: user.id,
          questionId: q1.id,
          selectedOption: 'A',
          isCorrect: false,
          timeTakenSeconds: 10, // Fast incorrect (rushed)
        },
        {
          userId: user.id,
          questionId: q1.id,
          selectedOption: 'B',
          isCorrect: false,
          timeTakenSeconds: 140, // Slow attempt
        },
        {
          userId: user.id,
          questionId: q1.id,
          selectedOption: 'C',
          isCorrect: true,
          timeTakenSeconds: 60,
        },
        {
          userId: user.id,
          questionId: q2.id,
          selectedOption: 'A',
          isCorrect: true,
          timeTakenSeconds: 40,
        },
      ],
    });

    // Query attempts for User 1
    const attempts = await getUserConceptAttempts(user.id);
    console.log(`  ✓ Aggregated ${attempts.length} concept groups for user 1.`);

    const q1Topic = normalizeTopicName(q1.topic, q1.chapter);
    const q1Key = buildConceptKey(q1.subject, q1.chapter, q1Topic);
    const q1Group = attempts.find((g) => g.conceptKey === q1Key);

    if (!q1Group) {
      throw new Error(`Could not find concept group for ${q1Key}`);
    }

    if (q1Group.totalAttempts !== 3) {
      throw new Error(`Expected 3 attempts on Q1 concept, got ${q1Group.totalAttempts}`);
    }
    if (q1Group.correctAttempts !== 1) {
      throw new Error(`Expected 1 correct attempt on Q1 concept, got ${q1Group.correctAttempts}`);
    }
    if (q1Group.accuracy !== 33) {
      throw new Error(`Expected 33% accuracy, got ${q1Group.accuracy}%`);
    }
    if (q1Group.fastIncorrectCount !== 1) {
      throw new Error(`Expected 1 fast incorrect attempt, got ${q1Group.fastIncorrectCount}`);
    }
    if (q1Group.slowAttemptCount !== 1) {
      throw new Error(`Expected 1 slow attempt, got ${q1Group.slowAttemptCount}`);
    }
    console.log('  ✓ Attempt stats, behavioral flags, and accuracy calculated accurately:');
    console.log(`    - Concept: ${q1Group.topic}`);
    console.log(`    - Accuracy: ${q1Group.accuracy}% (${q1Group.correctAttempts}/${q1Group.totalAttempts})`);
    console.log(`    - Average Time: ${q1Group.avgTimeSeconds}s`);
    console.log(`    - Fast Incorrect: ${q1Group.fastIncorrectCount}`);
    console.log(`    - Slow Struggles: ${q1Group.slowAttemptCount}`);

    // Test Security Isolation: User 2 should have 0 concept attempts
    const user2Attempts = await getUserConceptAttempts(user2.id);
    if (user2Attempts.length !== 0) {
      throw new Error(`Security breach: User 2 saw ${user2Attempts.length} attempts from User 1!`);
    }
    console.log('  ✓ Security isolation verified: Other users see 0 attempts.');
  } finally {
    // Cleanup test users and answers
    await prisma.quizAnswer.deleteMany({ where: { userId: { in: [user.id, user2.id] } } });
    await prisma.userProfile.deleteMany({ where: { id: { in: [user.id, user2.id] } } });
    console.log('  ✓ Cleaned up test data.');
    await prisma.$disconnect();
  }

  console.log('\n===========================================================');
  console.log('  STAGE 1 & STAGE 2 TESTS PASSED PERFECTLY!                ');
  console.log('===========================================================');
}

runStage1And2Tests().catch((err) => {
  console.error('Stage 1 & 2 tests failed:', err);
  process.exit(1);
});

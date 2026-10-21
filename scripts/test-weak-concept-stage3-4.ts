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

async function runStage3And4Tests() {
  const { prisma } = await import('../lib/server/db');
  const { analyzeConceptPerformance, getUserConceptDiagnostics } = await import('../lib/server/concepts/analysis');

  console.log('===========================================================');
  console.log('  TESTING STAGE 3 (PERFORMANCE) & STAGE 4 (WEAKNESS)       ');
  console.log('===========================================================\n');

  // Test 1: Performance Calculation & Classification Units
  console.log('[Test 1] Testing Unit Performance Calculation & Classification...');

  const baseDate = new Date();

  // Case A: Critical Weakness with Concept Gap & Time Trap
  const critGroup: any = {
    conceptKey: 'PHYSICS::Rotational Motion::Moment of Inertia',
    subject: 'PHYSICS',
    chapter: 'Rotational Motion',
    topic: 'Moment of Inertia',
    totalAttempts: 5,
    correctAttempts: 1,
    incorrectAttempts: 4,
    accuracy: 20,
    avgTimeSeconds: 135,
    fastIncorrectCount: 0,
    slowAttemptCount: 3,
    recentAttempts: [false, false, true, false, false],
    difficultyStats: {
      EASY: { total: 2, correct: 0, accuracy: 0 },
      MEDIUM: { total: 3, correct: 1, accuracy: 33 },
      HARD: { total: 0, correct: 0, accuracy: null },
    },
    lastAttemptedAt: baseDate,
    firstAttemptedAt: baseDate,
  };

  const critAnalysis = analyzeConceptPerformance(critGroup);
  if (critAnalysis.weaknessLevel !== 'CRITICAL_WEAKNESS') {
    throw new Error(`Expected CRITICAL_WEAKNESS, got ${critAnalysis.weaknessLevel}`);
  }
  if (!critAnalysis.diagnosticTags.includes('CONCEPT_GAP')) {
    throw new Error('Expected CONCEPT_GAP tag for low score on Easy questions');
  }
  if (!critAnalysis.diagnosticTags.includes('TIME_TRAP')) {
    throw new Error('Expected TIME_TRAP tag for slow response times');
  }
  if (critAnalysis.urgencyScore < 80) {
    throw new Error(`Expected high urgency score (>=80), got ${critAnalysis.urgencyScore}`);
  }
  console.log('  ✓ Critical weakness and diagnostic root-cause tags classified correctly.');

  // Case B: Mastered Concept with High Accuracy and Optimal Pacing
  const masteredGroup: any = {
    conceptKey: 'CHEMISTRY::Solutions::Raoult Law',
    subject: 'CHEMISTRY',
    chapter: 'Solutions',
    topic: 'Raoult Law',
    totalAttempts: 6,
    correctAttempts: 5,
    incorrectAttempts: 1,
    accuracy: 83,
    avgTimeSeconds: 48,
    fastIncorrectCount: 0,
    slowAttemptCount: 0,
    recentAttempts: [true, true, true, false, true],
    difficultyStats: {
      EASY: { total: 2, correct: 2, accuracy: 100 },
      MEDIUM: { total: 3, correct: 2, accuracy: 67 },
      HARD: { total: 1, correct: 1, accuracy: 100 },
    },
    lastAttemptedAt: baseDate,
    firstAttemptedAt: baseDate,
  };

  const masteredAnalysis = analyzeConceptPerformance(masteredGroup);
  if (masteredAnalysis.weaknessLevel !== 'MASTERED') {
    throw new Error(`Expected MASTERED, got ${masteredAnalysis.weaknessLevel}`);
  }
  if (masteredAnalysis.masteryScore < 70) {
    throw new Error(`Expected high mastery score (>=70), got ${masteredAnalysis.masteryScore}`);
  }
  console.log('  ✓ Mastered concept scored and classified correctly.');

  // Case C: Insufficient Data (1 attempt)
  const singleGroup: any = {
    conceptKey: 'MATHEMATICS::Calculus::Limits',
    subject: 'MATHEMATICS',
    chapter: 'Calculus',
    topic: 'Limits',
    totalAttempts: 1,
    correctAttempts: 0,
    incorrectAttempts: 1,
    accuracy: 0,
    avgTimeSeconds: 50,
    fastIncorrectCount: 0,
    slowAttemptCount: 0,
    recentAttempts: [false],
    difficultyStats: {
      EASY: { total: 1, correct: 0, accuracy: 0 },
      MEDIUM: { total: 0, correct: 0, accuracy: null },
      HARD: { total: 0, correct: 0, accuracy: null },
    },
    lastAttemptedAt: baseDate,
    firstAttemptedAt: baseDate,
  };

  const singleAnalysis = analyzeConceptPerformance(singleGroup);
  if (singleAnalysis.weaknessLevel !== 'INSUFFICIENT_DATA') {
    throw new Error(`Expected INSUFFICIENT_DATA for 1 attempt, got ${singleAnalysis.weaknessLevel}`);
  }
  console.log('  ✓ Single attempt classified as INSUFFICIENT_DATA without premature diagnosis.');

  // Test 2: Database End-to-End Diagnostics Pipeline
  console.log('\n[Test 2] Testing Database Diagnostics Pipeline for User...');
  const testClerkId = `test_diag_${Date.now()}`;
  const user = await prisma.userProfile.create({
    data: {
      clerkId: testClerkId,
      email: `${testClerkId}@crackrr.test`,
      name: 'Diagnostic Pipeline Tester',
      username: `diag_${Date.now().toString().slice(-6)}`,
      school: 'Diagnostic High',
      grade: '12',
      stream: 'PCM',
      onboardingCompleted: true,
    },
  });

  try {
    // Pick questions with guaranteed distinct topics
    const candidates = await prisma.question.findMany({
      take: 50,
      select: { id: true, subject: true, chapter: true, topic: true },
    });

    const seenTopics = new Set<string>();
    const questions: typeof candidates = [];
    for (const q of candidates) {
      const top = q.topic || q.chapter;
      if (!seenTopics.has(top)) {
        seenTopics.add(top);
        questions.push(q);
        if (questions.length === 4) break;
      }
    }

    if (questions.length < 4) {
      throw new Error('Need at least 4 questions with distinct topics in database for test');
    }

    // Seed attempts:
    // Q0 (3 attempts, all incorrect -> CRITICAL_WEAKNESS)
    // Q1 (3 attempts, 2 correct -> DEVELOPING / NEEDS_ATTENTION)
    // Q2 (4 attempts, 4 correct -> MASTERED)
    // Q3 (1 attempt, 1 correct -> INSUFFICIENT_DATA)
    await prisma.quizAnswer.createMany({
      data: [
        { userId: user.id, questionId: questions[0].id, selectedOption: 'A', isCorrect: false, timeTakenSeconds: 30 },
        { userId: user.id, questionId: questions[0].id, selectedOption: 'B', isCorrect: false, timeTakenSeconds: 30 },
        { userId: user.id, questionId: questions[0].id, selectedOption: 'C', isCorrect: false, timeTakenSeconds: 30 },

        { userId: user.id, questionId: questions[1].id, selectedOption: 'A', isCorrect: true, timeTakenSeconds: 45 },
        { userId: user.id, questionId: questions[1].id, selectedOption: 'B', isCorrect: true, timeTakenSeconds: 45 },
        { userId: user.id, questionId: questions[1].id, selectedOption: 'C', isCorrect: false, timeTakenSeconds: 45 },

        { userId: user.id, questionId: questions[2].id, selectedOption: 'A', isCorrect: true, timeTakenSeconds: 40 },
        { userId: user.id, questionId: questions[2].id, selectedOption: 'B', isCorrect: true, timeTakenSeconds: 40 },
        { userId: user.id, questionId: questions[2].id, selectedOption: 'C', isCorrect: true, timeTakenSeconds: 40 },
        { userId: user.id, questionId: questions[2].id, selectedOption: 'D', isCorrect: true, timeTakenSeconds: 40 },

        { userId: user.id, questionId: questions[3].id, selectedOption: 'A', isCorrect: true, timeTakenSeconds: 50 },
      ],
    });

    const summary = await getUserConceptDiagnostics(user.id);

    console.log(`  ✓ Aggregated diagnostics across ${summary.totalConceptsAttempted} concepts:`);
    console.log(`    - Critical Weaknesses: ${summary.criticalCount}`);
    console.log(`    - Needs Attention: ${summary.needsAttentionCount}`);
    console.log(`    - Developing: ${summary.developingCount}`);
    console.log(`    - Mastered: ${summary.masteredCount}`);
    console.log(`    - Insufficient Data: ${summary.insufficientDataCount}`);
    console.log(`    - Overall Health Score: ${summary.overallHealthScore}/100`);

    if (summary.criticalCount < 1) {
      throw new Error(`Expected at least 1 critical weakness, found ${summary.criticalCount}`);
    }
    if (summary.topWeakConcepts.length < 1) {
      throw new Error('Expected at least 1 top weak concept prioritized');
    }
    // The top weak concept must be the one with 0% accuracy
    if (summary.topWeakConcepts[0].accuracy !== 0) {
      throw new Error(`Expected top weak concept to have 0% accuracy, got ${summary.topWeakConcepts[0].accuracy}%`);
    }

    console.log(`  ✓ Top recommended review concept: ${summary.topWeakConcepts[0].topic} (Urgency: ${summary.topWeakConcepts[0].urgencyScore})`);
  } finally {
    await prisma.quizAnswer.deleteMany({ where: { userId: user.id } });
    await prisma.userProfile.delete({ where: { id: user.id } });
    console.log('  ✓ Cleaned up test data.');
    await prisma.$disconnect();
  }

  console.log('\n===========================================================');
  console.log('  STAGE 3 & STAGE 4 TESTS PASSED PERFECTLY!                ');
  console.log('===========================================================');
}

runStage3And4Tests().catch((err) => {
  console.error('Stage 3 & 4 tests failed:', err);
  process.exit(1);
});

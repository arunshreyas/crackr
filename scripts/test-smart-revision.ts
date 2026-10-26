import 'dotenv/config';
import Module from 'module';
import { PrismaClient, QuestionSubject, OptionLabel, RevisionStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Polyfill server-only for standalone script execution
// @ts-ignore
const originalLoad = Module._load;
// @ts-ignore
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'server-only') {
    return {};
  }
  return originalLoad.apply(this, arguments);
};

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Database connection string required');

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runSmartRevisionTests() {
  console.log('===========================================================');
  console.log('   RUNNING CRACKR SMART REVISION VERIFICATION SUITE       ');
  console.log('===========================================================\n');

  const testClerkId1 = 'test_rev_user_1_' + Date.now();
  const testClerkId2 = 'test_rev_user_2_' + Date.now();
  let user1Id = '';
  let user2Id = '';

  const { calculateNextReviewDue, isItemDueForReview } = await import('../lib/server/revision/scheduling');
  const { calculateRevisionPriority } = await import('../lib/server/revision/prioritization');
  const { getUserRevisionQueue } = await import('../lib/server/revision/queue');
  const {
    getRevisionDashboardData,
    markConceptReviewed,
    getRevisionItemDetail,
  } = await import('../lib/server/revision/service');
  const { buildConceptKey } = await import('../lib/server/concepts/metadata');

  try {
    // ------------------------------------------------------------------------
    // [TEST 1] Scheduling and Due-Date Calculations
    // ------------------------------------------------------------------------
    console.log('[Test 1] Testing Deterministic Spaced Repetition Scheduling...');
    const now = new Date('2026-10-26T12:00:00Z');

    // NEEDS_PRACTICE -> 1 day interval
    const dueNeedsPractice = calculateNextReviewDue(RevisionStatus.NEEDS_PRACTICE, 1, now);
    const expectedNeedsPractice = new Date('2026-10-27T12:00:00Z');
    if (dueNeedsPractice.toISOString() !== expectedNeedsPractice.toISOString()) {
      throw new Error(`Expected NEEDS_PRACTICE due date ${expectedNeedsPractice.toISOString()}, got ${dueNeedsPractice.toISOString()}`);
    }

    // REVIEWED review 1 -> 3 days
    const dueReview1 = calculateNextReviewDue(RevisionStatus.REVIEWED, 1, now);
    const expectedReview1 = new Date('2026-10-29T12:00:00Z');
    if (dueReview1.toISOString() !== expectedReview1.toISOString()) {
      throw new Error(`Expected REVIEWED cycle 1 due date ${expectedReview1.toISOString()}, got ${dueReview1.toISOString()}`);
    }

    // REVIEWED review 2 -> 7 days
    const dueReview2 = calculateNextReviewDue(RevisionStatus.REVIEWED, 2, now);
    const expectedReview2 = new Date('2026-11-02T12:00:00Z');
    if (dueReview2.toISOString() !== expectedReview2.toISOString()) {
      throw new Error(`Expected REVIEWED cycle 2 due date ${expectedReview2.toISOString()}, got ${dueReview2.toISOString()}`);
    }

    // REVIEWED review 3 -> 14 days
    const dueReview3 = calculateNextReviewDue(RevisionStatus.REVIEWED, 3, now);
    const expectedReview3 = new Date('2026-11-09T12:00:00Z');
    if (dueReview3.toISOString() !== expectedReview3.toISOString()) {
      throw new Error(`Expected REVIEWED cycle 3 due date ${expectedReview3.toISOString()}, got ${dueReview3.toISOString()}`);
    }

    // REVIEWED review 4+ -> 30 days
    const dueReview4 = calculateNextReviewDue(RevisionStatus.REVIEWED, 4, now);
    const expectedReview4 = new Date('2026-11-25T12:00:00Z');
    if (dueReview4.toISOString() !== expectedReview4.toISOString()) {
      throw new Error(`Expected REVIEWED cycle 4 due date ${expectedReview4.toISOString()}, got ${dueReview4.toISOString()}`);
    }

    // Due check
    if (!isItemDueForReview(new Date('2026-10-25T12:00:00Z'), now)) {
      throw new Error('Past date should be due');
    }
    if (isItemDueForReview(new Date('2026-10-28T12:00:00Z'), now)) {
      throw new Error('Future date should not be due yet');
    }
    console.log('✓ Test 1 Passed: Deterministic spaced repetition intervals and due dates verified.\n');

    // ------------------------------------------------------------------------
    // [TEST 2] Prioritisation Scoring and Explainable Rules
    // ------------------------------------------------------------------------
    console.log('[Test 2] Testing Prioritisation Logic and Explainable Rules...');
    const criticalConcept = calculateRevisionPriority({
      weaknessLevel: 'CRITICAL_WEAKNESS',
      accuracy: 25,
      totalAttempts: 4,
      incorrectAttempts: 3,
      trend: 'DECLINING',
      diagnosticTags: ['CONCEPT_GAP'],
      status: RevisionStatus.NOT_REVIEWED,
      reviewCount: 0,
      lastReviewedAt: null,
      nextReviewDue: null,
      savedNotesCount: 1,
      now,
    });

    if (criticalConcept.priorityScore < 70) {
      throw new Error(`Expected critical priority >= 70, got ${criticalConcept.priorityScore}`);
    }
    if (criticalConcept.priorityTier !== 'CRITICAL') {
      throw new Error(`Expected tier CRITICAL, got ${criticalConcept.priorityTier}`);
    }
    if (criticalConcept.priorityReasons.length < 3) {
      throw new Error('Expected at least 3 explainable reasons for critical weakness');
    }

    // Test improvement factor
    const improvingConcept = calculateRevisionPriority({
      weaknessLevel: 'NEEDS_ATTENTION',
      accuracy: 55,
      totalAttempts: 5,
      incorrectAttempts: 2,
      trend: 'IMPROVING',
      diagnosticTags: [],
      status: RevisionStatus.REVIEWED,
      reviewCount: 1,
      lastReviewedAt: new Date(now.getTime() - 2 * 3600000), // 2 hours ago
      nextReviewDue: new Date(now.getTime() + 3 * 86400000), // 3 days in future
      savedNotesCount: 0,
      now,
    });

    if (improvingConcept.priorityScore >= criticalConcept.priorityScore) {
      throw new Error('Improving, recently-reviewed concept score should be lower than critical concept');
    }
    console.log(`✓ Critical Score: ${criticalConcept.priorityScore} (${criticalConcept.priorityTier})`);
    console.log(`  Reasons: ${criticalConcept.priorityReasons.slice(0, 2).join(' | ')}`);
    console.log(`✓ Improving/Recently-Reviewed Score: ${improvingConcept.priorityScore} (${improvingConcept.priorityTier})`);
    console.log('✓ Test 2 Passed: Prioritisation logic and explainable rules verified.\n');

    // ------------------------------------------------------------------------
    // [TEST 3] Empty Revision History (Clean zero-state, no fabricated data)
    // ------------------------------------------------------------------------
    console.log('[Test 3] Testing Clean Slate / Empty History Behavior...');
    const user1 = await prisma.userProfile.create({
      data: {
        clerkId: testClerkId1,
        email: `${testClerkId1}@crackrr.test`,
        name: 'Empty Revision Student 1',
        username: `student_${Date.now()}_1`,
        school: 'Crackrr Academy',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    user1Id = user1.id;

    const emptyQueue = await getUserRevisionQueue(user1Id);
    if (emptyQueue.length !== 0) {
      throw new Error(`Expected empty queue length 0, got ${emptyQueue.length}`);
    }

    const emptyDashboard = await getRevisionDashboardData(user1Id);
    if (emptyDashboard.hasHistory !== false) {
      throw new Error('hasHistory must be false for user with zero attempts');
    }
    if (emptyDashboard.queue.length !== 0) {
      throw new Error('Queue must be empty for user with zero attempts');
    }
    if (emptyDashboard.progress.totalQueueItems !== 0) {
      throw new Error('Progress totalQueueItems must be 0 for user with zero attempts');
    }
    console.log('✓ Test 3 Passed: Zero-state confirmed. No fabricated data generated.\n');

    // ------------------------------------------------------------------------
    // [TEST 4] Practice Attempt History Integration & Queue Generation
    // ------------------------------------------------------------------------
    console.log('[Test 4] Testing Practice Integration & Queue Prioritisation...');
    // Find sample questions
    const sampleQuestions = await prisma.question.findMany({
      where: {
        subject: QuestionSubject.PHYSICS,
        explanation: { not: null },
      },
      include: { options: true },
      take: 3,
    });

    if (sampleQuestions.length < 2) {
      throw new Error('Insufficient sample questions in database');
    }

    const q1 = sampleQuestions[0];
    const q2 = sampleQuestions[1];
    const wrongOptionQ1 = q1.options.find((o) => o.label !== q1.correctOption)?.label || OptionLabel.A;

    // Record incorrect practice answer for User 1 on Q1
    await prisma.quizAnswer.create({
      data: {
        userId: user1Id,
        questionId: q1.id,
        selectedOption: wrongOptionQ1,
        isCorrect: false,
        timeTakenSeconds: 35,
      },
    });

    // Save a revision note on Q2 for User 1
    const conceptKeyQ2 = buildConceptKey(q2.subject, q2.chapter, q2.topic);
    await prisma.revisionNote.create({
      data: {
        userId: user1Id,
        questionId: q2.id,
        userNote: 'Formula note on vectors',
        subject: q2.subject,
        chapter: q2.chapter,
        topic: q2.topic,
        conceptKey: conceptKeyQ2,
        keyTakeaway: 'Always check direction cosine sum equals 1',
      },
    });

    const activeQueue = await getUserRevisionQueue(user1Id);
    if (activeQueue.length === 0) {
      throw new Error('Queue should contain items after practice mistake and note creation');
    }

    const conceptKeyQ1 = buildConceptKey(q1.subject, q1.chapter, q1.topic);
    const itemQ1 = activeQueue.find((i) => i.conceptKey === conceptKeyQ1);
    if (!itemQ1) {
      throw new Error(`Queue should include concept for missed question: ${conceptKeyQ1}`);
    }
    if (itemQ1.incorrectAttempts !== 1) {
      throw new Error(`Expected 1 incorrect attempt, got ${itemQ1.incorrectAttempts}`);
    }
    if (itemQ1.status !== RevisionStatus.NOT_REVIEWED) {
      throw new Error(`Expected status NOT_REVIEWED, got ${itemQ1.status}`);
    }
    if (!itemQ1.isDue) {
      throw new Error('Unreviewed item should be marked isDue: true');
    }
    console.log(`✓ Concept in queue: ${itemQ1.topic} (${itemQ1.chapter}) - Priority: ${itemQ1.priorityScore} (${itemQ1.priorityTier})`);
    console.log('✓ Test 4 Passed: Practice mistakes and saved notes populate personalized queue.\n');

    // ------------------------------------------------------------------------
    // [TEST 5] Review Recording, State Transitions, and Idempotency
    // ------------------------------------------------------------------------
    console.log('[Test 5] Testing Review Recording and Idempotency...');
    // Mark as REVIEWED
    const reviewResult1 = await markConceptReviewed({
      userId: user1Id,
      conceptKey: conceptKeyQ1,
      status: RevisionStatus.REVIEWED,
      notes: 'Reviewed formulas and sign conventions.',
      feedback: 'CONFIDENT',
    });

    if (reviewResult1.status !== RevisionStatus.REVIEWED) {
      throw new Error(`Expected status REVIEWED, got ${reviewResult1.status}`);
    }
    if (reviewResult1.reviewCount !== 1) {
      throw new Error(`Expected reviewCount 1, got ${reviewResult1.reviewCount}`);
    }
    if (!reviewResult1.nextReviewDue) {
      throw new Error('nextReviewDue must be set');
    }

    // Test duplicate click within 5 seconds (idempotency check)
    const duplicateReviewResult = await markConceptReviewed({
      userId: user1Id,
      conceptKey: conceptKeyQ1,
      status: RevisionStatus.REVIEWED,
      notes: 'Repeated fast click',
    });

    if (duplicateReviewResult.reviewCount !== 1) {
      throw new Error(`Duplicate rapid click should be throttled! Got reviewCount: ${duplicateReviewResult.reviewCount}`);
    }
    console.log('✓ Rapid duplicate review request successfully throttled (reviewCount remained 1).');

    // Mark as NEEDS_PRACTICE
    // Fast-forward lastReviewedAt slightly so it allows deliberate status change
    await prisma.revisionRecord.update({
      where: { id: reviewResult1.id },
      data: { lastReviewedAt: new Date(Date.now() - 10000) },
    });

    const needsPracticeResult = await markConceptReviewed({
      userId: user1Id,
      conceptKey: conceptKeyQ1,
      status: RevisionStatus.NEEDS_PRACTICE,
      notes: 'Struggling with problem 3 derivation.',
      feedback: 'STRUGGLING',
    });

    if (needsPracticeResult.status !== RevisionStatus.NEEDS_PRACTICE) {
      throw new Error(`Expected status NEEDS_PRACTICE, got ${needsPracticeResult.status}`);
    }
    if (needsPracticeResult.reviewCount !== 2) {
      throw new Error(`Expected reviewCount 2, got ${needsPracticeResult.reviewCount}`);
    }
    console.log('✓ State transition to NEEDS_PRACTICE verified with reviewCount 2.');
    console.log('✓ Test 5 Passed: Review recording, transitions, and idempotency verified.\n');

    // ------------------------------------------------------------------------
    // [TEST 6] Dashboard Progress Metrics Update
    // ------------------------------------------------------------------------
    console.log('[Test 6] Testing Dashboard Progress Metrics...');
    const updatedDashboard = await getRevisionDashboardData(user1Id);
    if (!updatedDashboard.hasHistory) {
      throw new Error('hasHistory should be true after activity');
    }
    if (updatedDashboard.progress.needsPracticeCount !== 1) {
      throw new Error(`Expected needsPracticeCount 1, got ${updatedDashboard.progress.needsPracticeCount}`);
    }
    if (updatedDashboard.recentIncorrectQuestions.length !== 1) {
      throw new Error(`Expected 1 recent incorrect question, got ${updatedDashboard.recentIncorrectQuestions.length}`);
    }
    console.log(`✓ Progress: Total ${updatedDashboard.progress.totalQueueItems}, Needs Practice: ${updatedDashboard.progress.needsPracticeCount}`);
    console.log('✓ Test 6 Passed: Dashboard progress metrics calculated and updated.\n');

    // ------------------------------------------------------------------------
    // [TEST 7] Concept Detail Loading (Full context, questions, notes)
    // ------------------------------------------------------------------------
    console.log('[Test 7] Testing Revision Item Detail Context...');
    const detail = await getRevisionItemDetail(user1Id, conceptKeyQ1);
    if (!detail) {
      throw new Error('Item detail should be returned');
    }
    if (detail.conceptKey !== conceptKeyQ1) {
      throw new Error('Detail conceptKey mismatch');
    }
    if (detail.incorrectQuestions.length !== 1) {
      throw new Error(`Expected 1 incorrect question in detail, got ${detail.incorrectQuestions.length}`);
    }
    if (detail.revisionRecord?.status !== RevisionStatus.NEEDS_PRACTICE) {
      throw new Error('Revision record in detail must match current status');
    }
    console.log(`✓ Concept Detail loaded: ${detail.topic} | Available Practice Qs: ${detail.availablePracticeCount}`);
    console.log('✓ Test 7 Passed: Item detail context verified.\n');

    // ------------------------------------------------------------------------
    // [TEST 8] User Ownership and Multi-Tenant Security Isolation
    // ------------------------------------------------------------------------
    console.log('[Test 8] Testing Multi-Tenant Isolation & Ownership...');
    const user2 = await prisma.userProfile.create({
      data: {
        clerkId: testClerkId2,
        email: `${testClerkId2}@crackrr.test`,
        name: 'Empty Revision Student 2',
        username: `student_${Date.now()}_2`,
        school: 'Crackrr Academy',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    user2Id = user2.id;

    // User 2 queue must be completely empty
    const user2Queue = await getUserRevisionQueue(user2Id);
    if (user2Queue.length !== 0) {
      throw new Error(`User 2 queue should be 0, got ${user2Queue.length}`);
    }

    const user2Dashboard = await getRevisionDashboardData(user2Id);
    if (user2Dashboard.hasHistory) {
      throw new Error('User 2 should not have history from User 1');
    }

    // User 2 detail for User 1's concept must show NO revision record and NO incorrect questions
    const user2Detail = await getRevisionItemDetail(user2Id, conceptKeyQ1);
    if (user2Detail.revisionRecord !== null) {
      throw new Error('User 2 should not see User 1 revision record');
    }
    if (user2Detail.incorrectQuestions.length !== 0) {
      throw new Error('User 2 should not see User 1 incorrect questions');
    }
    console.log('✓ User 2 isolated: 0 queue items, 0 revision records, 0 incorrect answers seen.');
    console.log('✓ Test 8 Passed: User data isolation strictly confirmed.\n');

    // ------------------------------------------------------------------------
    // [TEST 9] Graceful Handling of Missing / Deleted Questions & Notes
    // ------------------------------------------------------------------------
    console.log('[Test 9] Testing Resilience Against Missing Notes and Edge Cases...');
    // Concept with arbitrary non-existent question
    const fakeConceptKey = 'CHEMISTRY::Thermodynamics::Carnot Engine Cycle';
    await prisma.revisionRecord.create({
      data: {
        userId: user1Id,
        conceptKey: fakeConceptKey,
        subject: QuestionSubject.CHEMISTRY,
        chapter: 'Thermodynamics',
        topic: 'Carnot Engine Cycle',
        status: RevisionStatus.REVIEWED,
        reviewCount: 1,
        lastReviewedAt: now,
        nextReviewDue: new Date(now.getTime() + 86400000 * 3),
      },
    });

    const resilientQueue = await getUserRevisionQueue(user1Id);
    const fakeItem = resilientQueue.find((i) => i.conceptKey === fakeConceptKey);
    if (!fakeItem) {
      throw new Error('Resilient queue should handle concept without questions or notes');
    }
    if (fakeItem.incorrectQuestionsCount !== 0 || fakeItem.savedNotesCount !== 0) {
      throw new Error('Counts should safely be 0 for standalone concept');
    }
    console.log('✓ Standalone revision record without questions/notes handled cleanly.');
    console.log('✓ Test 9 Passed: Robust edge-case resilience verified.\n');

    console.log('===========================================================');
    console.log('  ALL 9 SMART REVISION VERIFICATION TESTS PASSED!          ');
    console.log('===========================================================\n');
  } finally {
    // Clean up test records
    console.log('[Clean Up] Cleaning up test data...');
    if (user1Id) {
      await prisma.revisionRecord.deleteMany({ where: { userId: user1Id } });
      await prisma.revisionNote.deleteMany({ where: { userId: user1Id } });
      await prisma.quizAnswer.deleteMany({ where: { userId: user1Id } });
      await prisma.userProfile.delete({ where: { id: user1Id } });
    }
    if (user2Id) {
      await prisma.revisionRecord.deleteMany({ where: { userId: user2Id } });
      await prisma.quizAnswer.deleteMany({ where: { userId: user2Id } });
      await prisma.userProfile.delete({ where: { id: user2Id } });
    }
    await prisma.$disconnect();
    await pool.end();
    console.log('✓ Test database connections closed and clean.');
  }
}

runSmartRevisionTests().catch((err) => {
  console.error('VERIFICATION SUITE FAILED:', err);
  process.exit(1);
});

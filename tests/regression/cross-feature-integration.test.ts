import '../test-helper';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/server/db';
import { saveRevisionNote } from '../../lib/server/notes/service';
import { getUserRevisionQueue } from '../../lib/server/revision/queue';
import {
  markConceptReviewed,
  getRevisionDashboardData,
  getRevisionItemDetail,
} from '../../lib/server/revision/service';
import { getUserConceptDiagnostics } from '../../lib/server/concepts/analysis';
import { OptionLabel, QuestionSubject, RevisionStatus, SessionStatus, Prisma } from '@prisma/client';

type QuestionWithOptions = Prisma.QuestionGetPayload<{ include: { options: true } }>;

describe('Cross-Feature Integration & System Workflow Regressions', () => {
  let user1Id: string;
  let user2Id: string;
  let sampleQuestions: QuestionWithOptions[];

  before(async () => {
    const user1 = await prisma.userProfile.create({
      data: {
        clerkId: `test_integ_u1_${Date.now()}`,
        email: `integ_u1_${Date.now()}@crackrr.test`,
        name: 'Integrated Student A',
        username: `integ_a_${Date.now()}`,
        school: 'Crackrr Academy',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.userProfile.create({
      data: {
        clerkId: `test_integ_u2_${Date.now()}`,
        email: `integ_u2_${Date.now()}@crackrr.test`,
        name: 'Integrated Student B',
        username: `integ_b_${Date.now()}`,
        school: 'Crackrr Academy',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    user2Id = user2.id;

    // Retrieve 3 questions from same chapter for coherent concept tracking
    sampleQuestions = await prisma.question.findMany({
      where: {
        subject: QuestionSubject.PHYSICS,
        explanation: { not: null },
      },
      include: { options: true },
      take: 3,
    });
    if (sampleQuestions.length < 3) throw new Error('Need at least 3 questions in database');
  });

  after(async () => {
    if (user1Id) {
      await prisma.revisionRecord.deleteMany({ where: { userId: user1Id } });
      await prisma.revisionNote.deleteMany({ where: { userId: user1Id } });
      await prisma.quizAnswer.deleteMany({ where: { userId: user1Id } });
      await prisma.quizSession.deleteMany({ where: { userId: user1Id } });
      await prisma.userProfile.delete({ where: { id: user1Id } }).catch(() => {});
    }
    if (user2Id) {
      await prisma.revisionRecord.deleteMany({ where: { userId: user2Id } });
      await prisma.revisionNote.deleteMany({ where: { userId: user2Id } });
      await prisma.quizAnswer.deleteMany({ where: { userId: user2Id } });
      await prisma.quizSession.deleteMany({ where: { userId: user2Id } });
      await prisma.userProfile.delete({ where: { id: user2Id } }).catch(() => {});
    }
  });

  test('Step 1: Fresh user has clean-slate zero state across all features', async () => {
    const queue = await getUserRevisionQueue(user1Id);
    assert.strictEqual(queue.length, 0);

    const diagnostics = await getUserConceptDiagnostics(user1Id);
    assert.strictEqual(diagnostics.totalConceptsAttempted, 0);
    assert.strictEqual(diagnostics.overallHealthScore, 100); // 100% baseline for fresh aspirant
    assert.strictEqual(diagnostics.topWeakConcepts.length, 0);

    const dashboard = await getRevisionDashboardData(user1Id);
    assert.strictEqual(dashboard.hasHistory, false);
    assert.strictEqual(dashboard.queue.length, 0);
    assert.strictEqual(dashboard.progress.totalQueueItems, 0);
  });

  test('Step 2: Practice attempts update Weak Concept Analysis & classify weaknesses', async () => {
    const q1 = sampleQuestions[0];
    const q2 = sampleQuestions[1];

    // Create a practice session with 2 incorrect answers
    const session = await prisma.quizSession.create({
      data: {
        userId: user1Id,
        subject: q1.subject,
        chapter: q1.chapter,
        status: SessionStatus.ACTIVE,
        questionIds: [q1.id, q2.id],
        totalQuestions: 2,
      },
    });

    const wrongOpt1 = q1.correctOption === OptionLabel.A ? OptionLabel.B : OptionLabel.A;
    const wrongOpt2 = q2.correctOption === OptionLabel.A ? OptionLabel.B : OptionLabel.A;

    await prisma.quizAnswer.createMany({
      data: [
        {
          sessionId: session.id,
          userId: user1Id,
          questionId: q1.id,
          selectedOption: wrongOpt1,
          isCorrect: false,
          timeTakenSeconds: 12, // Fast incorrect (Careless rush flag)
        },
        {
          sessionId: session.id,
          userId: user1Id,
          questionId: q2.id,
          selectedOption: wrongOpt2,
          isCorrect: false,
          timeTakenSeconds: 140, // Slow attempt (Time trap flag)
        },
      ],
    });

    const diagnostics = await getUserConceptDiagnostics(user1Id);
    assert.ok(diagnostics.totalConceptsAttempted >= 1);
    assert.ok(diagnostics.topWeakConcepts.length >= 1);

    const weakConcept = diagnostics.topWeakConcepts[0];
    assert.strictEqual(weakConcept.accuracy, 0);
    assert.ok(weakConcept.urgencyScore >= 80);
    assert.strictEqual(weakConcept.weaknessLevel, 'CRITICAL_WEAKNESS');
  });

  test('Step 3: User saves a revision note for a missed question', async () => {
    const q1 = sampleQuestions[0];
    const note = await saveRevisionNote({
      userId: user1Id,
      questionId: q1.id,
      userNote: 'Remember: normal reaction is perpendicular to the contact surface.',
      tags: ['Mechanics', 'NormalForce'],
    });

    assert.ok(note.id);
    assert.strictEqual(note.userId, user1Id);
    assert.strictEqual(note.questionId, q1.id);
  });

  test('Step 4: Smart Revision Queue integrates practice mistakes and saved notes', async () => {
    const queue = await getUserRevisionQueue(user1Id);
    assert.ok(queue.length >= 1);

    const item = queue[0];
    assert.ok(item.priorityScore >= 50, `Priority score ${item.priorityScore} should be >= 50`);
    assert.ok(item.priorityTier === 'CRITICAL' || item.priorityTier === 'HIGH');
    assert.ok(item.incorrectQuestionsCount >= 1);
    assert.ok(item.savedNotesCount >= 1);
    assert.strictEqual(item.isDue, true); // Not yet reviewed -> due now

    // Detail modal context
    const detail = await getRevisionItemDetail(user1Id, item.conceptKey);
    assert.ok(detail !== null);
    assert.strictEqual(detail?.conceptKey, item.conceptKey);
    assert.ok(detail!.incorrectQuestions.length >= 1);
    assert.ok(detail!.savedNotes.length >= 1);
  });

  test('Step 5: Review action schedules spaced repetition and handles rapid duplicate clicks', async () => {
    const queue = await getUserRevisionQueue(user1Id);
    const item = queue[0];

    // First review click
    const reviewResult1 = await markConceptReviewed({
      userId: user1Id,
      conceptKey: item.conceptKey,
      status: RevisionStatus.REVIEWED,
      feedback: 'Formula understood now',
    });

    assert.strictEqual(reviewResult1.status, RevisionStatus.REVIEWED);
    assert.strictEqual(reviewResult1.reviewCount, 1);
    assert.ok(reviewResult1.nextReviewDue !== null);

    // Rapid duplicate click within 5 seconds
    const reviewResult2 = await markConceptReviewed({
      userId: user1Id,
      conceptKey: item.conceptKey,
      status: RevisionStatus.REVIEWED,
    });

    // Throttled: reviewCount must stay 1
    assert.strictEqual(reviewResult2.reviewCount, 1);

    // Updating to NEEDS_PRACTICE transitions state and advances review count safely
    const reviewNeedsPractice = await markConceptReviewed({
      userId: user1Id,
      conceptKey: item.conceptKey,
      status: RevisionStatus.NEEDS_PRACTICE,
    });
    assert.strictEqual(reviewNeedsPractice.status, RevisionStatus.NEEDS_PRACTICE);
    assert.strictEqual(reviewNeedsPractice.reviewCount, 2);
  });

  test('Step 6: User 2 remains fully isolated with 0 queue items and clean history', async () => {
    const queue2 = await getUserRevisionQueue(user2Id);
    assert.strictEqual(queue2.length, 0);

    const diag2 = await getUserConceptDiagnostics(user2Id);
    assert.strictEqual(diag2.totalConceptsAttempted, 0);
    assert.strictEqual(diag2.overallHealthScore, 100);

    const dash2 = await getRevisionDashboardData(user2Id);
    assert.strictEqual(dash2.hasHistory, false);
    assert.strictEqual(dash2.queue.length, 0);
  });
});

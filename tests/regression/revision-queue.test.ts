import '../test-helper';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/server/db';
import { getUserRevisionQueue } from '../../lib/server/revision/queue';
import { markConceptReviewed } from '../../lib/server/revision/service';
import { saveRevisionNote } from '../../lib/server/notes/service';
import { OptionLabel, QuestionSubject, RevisionStatus, SessionStatus, Prisma } from '@prisma/client';

type QuestionWithOptions = Prisma.QuestionGetPayload<{ include: { options: true } }>;

describe('Smart Revision Queue & Concurrent Idempotency Regressions', () => {
  let userId: string;
  let sampleQuestions: QuestionWithOptions[];

  before(async () => {
    const user = await prisma.userProfile.create({
      data: {
        clerkId: `test_rev_q_${Date.now()}`,
        email: `rev_q_${Date.now()}@crackrr.test`,
        name: 'Revision Queue Aspirant',
        username: `rev_q_${Date.now()}`,
        school: 'Crackrr Institute',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    userId = user.id;

    sampleQuestions = await prisma.question.findMany({
      where: {
        subject: QuestionSubject.PHYSICS,
        explanation: { not: null },
      },
      include: { options: true },
      take: 2,
    });
    if (sampleQuestions.length < 2) throw new Error('Need at least 2 questions in database');
  });

  after(async () => {
    if (userId) {
      await prisma.revisionRecord.deleteMany({ where: { userId } });
      await prisma.revisionNote.deleteMany({ where: { userId } });
      await prisma.quizAnswer.deleteMany({ where: { userId } });
      await prisma.quizSession.deleteMany({ where: { userId } });
      await prisma.userProfile.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  test('REV-04: Fresh user receives a clean slate zero-history queue', async () => {
    const queue = await getUserRevisionQueue(userId);
    assert.strictEqual(queue.length, 0);
  });

  test('REV-05: Queue constructs items ordered by priorityScore descending with rich diagnostic metadata', async () => {
    const q1 = sampleQuestions[0];
    const q2 = sampleQuestions[1];

    // Session 1: Create 2 incorrect answers for Concept 1
    const session1 = await prisma.quizSession.create({
      data: {
        userId,
        subject: q1.subject,
        chapter: q1.chapter,
        status: SessionStatus.COMPLETED,
        questionIds: [q1.id],
        totalQuestions: 1,
      },
    });

    const wrongOpt1 = q1.correctOption === OptionLabel.A ? OptionLabel.B : OptionLabel.A;
    await prisma.quizAnswer.create({
      data: {
        sessionId: session1.id,
        userId,
        questionId: q1.id,
        selectedOption: wrongOpt1,
        isCorrect: false,
        timeTakenSeconds: 45,
      },
    });

    // Save a note for Concept 1
    await saveRevisionNote({
      userId,
      questionId: q1.id,
      userNote: 'Formula note for revision test',
    });

    // Session 2: Create 1 incorrect answer for Concept 2 (without note)
    const session2 = await prisma.quizSession.create({
      data: {
        userId,
        subject: q2.subject,
        chapter: q2.chapter,
        status: SessionStatus.COMPLETED,
        questionIds: [q2.id],
        totalQuestions: 1,
      },
    });

    const wrongOpt2 = q2.correctOption === OptionLabel.A ? OptionLabel.B : OptionLabel.A;
    await prisma.quizAnswer.create({
      data: {
        sessionId: session2.id,
        userId,
        questionId: q2.id,
        selectedOption: wrongOpt2,
        isCorrect: false,
        timeTakenSeconds: 30,
      },
    });

    const queue = await getUserRevisionQueue(userId);
    assert.ok(queue.length >= 1);

    // Verify ordering by priorityScore descending
    for (let i = 0; i < queue.length - 1; i++) {
      assert.ok(
        queue[i].priorityScore >= queue[i + 1].priorityScore,
        `Queue not sorted: ${queue[i].priorityScore} < ${queue[i + 1].priorityScore}`
      );
    }

    // Concept with saved note should have elevated priority
    const itemWithNote = queue.find((item) => item.savedNotesCount > 0);
    assert.ok(itemWithNote !== undefined);
    assert.ok(itemWithNote!.savedNotesCount >= 1);
    assert.ok(itemWithNote!.incorrectQuestionsCount >= 1);
  });

  test('REV-06: Rapid concurrent markConceptReviewed calls via Promise.all are idempotent and prevent review count inflation', async () => {
    const conceptKey = 'PHYSICS::Mechanics::RotationalDynamics';

    // Execute 3 simultaneous review submissions concurrently
    const [rev1, rev2, rev3] = await Promise.all([
      markConceptReviewed({
        userId,
        conceptKey,
        status: RevisionStatus.REVIEWED,
        notes: 'Understood conservation of angular momentum',
      }),
      markConceptReviewed({
        userId,
        conceptKey,
        status: RevisionStatus.REVIEWED,
      }),
      markConceptReviewed({
        userId,
        conceptKey,
        status: RevisionStatus.REVIEWED,
      }),
    ]);

    // All return valid records with REVIEWED status
    assert.strictEqual(rev1.status, RevisionStatus.REVIEWED);
    assert.strictEqual(rev2.status, RevisionStatus.REVIEWED);
    assert.strictEqual(rev3.status, RevisionStatus.REVIEWED);

    // All must have reviewCount = 1 (NOT 3!)
    assert.strictEqual(rev1.reviewCount, 1);
    assert.strictEqual(rev2.reviewCount, 1);
    assert.strictEqual(rev3.reviewCount, 1);

    // Verify single database record in PostgreSQL
    const records = await prisma.revisionRecord.findMany({
      where: { userId, conceptKey },
    });
    assert.strictEqual(records.length, 1, 'Database must contain exactly 1 revision record');
    assert.strictEqual(records[0].reviewCount, 1, 'Review count in DB must not be inflated');

    // Subsequent status transition to NEEDS_PRACTICE increments reviewCount safely
    const transitioned = await markConceptReviewed({
      userId,
      conceptKey,
      status: RevisionStatus.NEEDS_PRACTICE,
    });
    assert.strictEqual(transitioned.status, RevisionStatus.NEEDS_PRACTICE);
    assert.strictEqual(transitioned.reviewCount, 2);
  });
});

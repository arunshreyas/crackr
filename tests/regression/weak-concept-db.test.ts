import '../test-helper';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/server/db';
import { getUserConceptAttempts } from '../../lib/server/concepts/attempts';
import { getUserConceptDiagnostics } from '../../lib/server/concepts/analysis';
import { OptionLabel, QuestionSubject, SessionStatus, Prisma } from '@prisma/client';

type QuestionWithOptions = Prisma.QuestionGetPayload<{ include: { options: true } }>;

describe('Weak Concept Analysis Database & Multi-Tenant Scoping Regressions', () => {
  let userAId: string;
  let userBId: string;
  let sampleQuestion: QuestionWithOptions;

  before(async () => {
    const userA = await prisma.userProfile.create({
      data: {
        clerkId: `test_weak_u1_${Date.now()}`,
        email: `weak_u1_${Date.now()}@crackrr.test`,
        name: 'Weakness Aspirant A',
        username: `weak_a_${Date.now()}`,
        school: 'Crackrr Institute',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    userAId = userA.id;

    const userB = await prisma.userProfile.create({
      data: {
        clerkId: `test_weak_u2_${Date.now()}`,
        email: `weak_u2_${Date.now()}@crackrr.test`,
        name: 'Weakness Aspirant B',
        username: `weak_b_${Date.now()}`,
        school: 'Crackrr Institute',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    userBId = userB.id;

    const q = await prisma.question.findFirst({
      where: {
        subject: QuestionSubject.PHYSICS,
        explanation: { not: null },
      },
      include: { options: true },
    });
    if (!q) throw new Error('No question available in test database');
    sampleQuestion = q;
  });

  after(async () => {
    if (userAId) {
      await prisma.quizAnswer.deleteMany({ where: { userId: userAId } });
      await prisma.quizSession.deleteMany({ where: { userId: userAId } });
      await prisma.userProfile.delete({ where: { id: userAId } }).catch(() => {});
    }
    if (userBId) {
      await prisma.quizAnswer.deleteMany({ where: { userId: userBId } });
      await prisma.quizSession.deleteMany({ where: { userId: userBId } });
      await prisma.userProfile.delete({ where: { id: userBId } }).catch(() => {});
    }
  });

  test('WEAK-07: User attempts are strictly scoped by userId; User A failures do not affect User B', async () => {
    // User A records 3 failed attempts in the concept across 3 sessions
    const wrongOption = sampleQuestion.correctOption === OptionLabel.A ? OptionLabel.B : OptionLabel.A;

    for (let i = 0; i < 3; i++) {
      const sessionA = await prisma.quizSession.create({
        data: {
          userId: userAId,
          subject: sampleQuestion.subject,
          chapter: sampleQuestion.chapter,
          status: SessionStatus.COMPLETED,
          questionIds: [sampleQuestion.id],
          totalQuestions: 1,
        },
      });

      await prisma.quizAnswer.create({
        data: {
          sessionId: sessionA.id,
          userId: userAId,
          questionId: sampleQuestion.id,
          selectedOption: wrongOption,
          isCorrect: false,
          timeTakenSeconds: 30 + i * 10,
        },
      });
    }

    // User B records 3 correct attempts in the exact same concept across 3 sessions
    for (let i = 0; i < 3; i++) {
      const sessionB = await prisma.quizSession.create({
        data: {
          userId: userBId,
          subject: sampleQuestion.subject,
          chapter: sampleQuestion.chapter,
          status: SessionStatus.COMPLETED,
          questionIds: [sampleQuestion.id],
          totalQuestions: 1,
        },
      });

      await prisma.quizAnswer.create({
        data: {
          sessionId: sessionB.id,
          userId: userBId,
          questionId: sampleQuestion.id,
          selectedOption: sampleQuestion.correctOption,
          isCorrect: true,
          timeTakenSeconds: 20 + i * 5,
        },
      });
    }

    // Query attempt groups for both users
    const userAAttempts = await getUserConceptAttempts(userAId);
    const userBAttempts = await getUserConceptAttempts(userBId);

    assert.strictEqual(userAAttempts.length, 1);
    assert.strictEqual(userAAttempts[0].totalAttempts, 3);
    assert.strictEqual(userAAttempts[0].correctAttempts, 0);
    assert.strictEqual(userAAttempts[0].accuracy, 0);

    assert.strictEqual(userBAttempts.length, 1);
    assert.strictEqual(userBAttempts[0].totalAttempts, 3);
    assert.strictEqual(userBAttempts[0].correctAttempts, 3);
    assert.strictEqual(userBAttempts[0].accuracy, 100);

    // Diagnostics summary isolation
    const diagA = await getUserConceptDiagnostics(userAId);
    const diagB = await getUserConceptDiagnostics(userBId);

    assert.strictEqual(diagA.topWeakConcepts.length, 1);
    assert.strictEqual(diagA.topWeakConcepts[0].weaknessLevel, 'CRITICAL_WEAKNESS');
    assert.ok(diagA.overallHealthScore <= 25, `User A health score ${diagA.overallHealthScore} should be <= 25`);

    assert.strictEqual(diagB.topWeakConcepts.length, 0);
    assert.ok(diagB.overallHealthScore >= 80, `User B health score ${diagB.overallHealthScore} should be >= 80`);
  });
});

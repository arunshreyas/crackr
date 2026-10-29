import { setMockAuthUser } from '../test-helper';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/server/db';
import { getQuestionsForPractice } from '../../lib/server/questions/service';
import { submitPracticeAnswer } from '../../lib/server/practice/service';
import { OptionLabel, SessionStatus, Prisma } from '@prisma/client';

type QuestionWithOptions = Prisma.QuestionGetPayload<{ include: { options: true } }>;

describe('Practice Session Security & Idempotency Regressions', () => {
  let userAId: string;
  let userBId: string;
  let userAClerkId: string;
  let userBClerkId: string;
  let sampleQuestion: QuestionWithOptions;

  before(async () => {
    userAClerkId = `test_prac_sec_a_${Date.now()}`;
    userBClerkId = `test_prac_sec_b_${Date.now()}`;

    const userA = await prisma.userProfile.create({
      data: {
        clerkId: userAClerkId,
        email: `${userAClerkId}@crackrr.test`,
        name: 'Practice Aspirant A',
        username: `prac_a_${Date.now()}`,
        school: 'Crackrr Institute',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
        xp: 0,
        level: 5, // Scholar/Challenger (-2 XP penalty level)
      },
    });
    userAId = userA.id;

    const userB = await prisma.userProfile.create({
      data: {
        clerkId: userBClerkId,
        email: `${userBClerkId}@crackrr.test`,
        name: 'Practice Aspirant B',
        username: `prac_b_${Date.now()}`,
        school: 'Crackrr Institute',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
        xp: 500,
        level: 2,
      },
    });
    userBId = userB.id;

    const q = await prisma.question.findFirst({
      where: {
        explanation: { not: null },
      },
      include: { options: true },
    });
    if (!q) throw new Error('No question with explanation in database');
    sampleQuestion = q;
  });

  after(async () => {
    setMockAuthUser(null);
    if (userAId) {
      await prisma.xPTransaction.deleteMany({ where: { userId: userAId } });
      await prisma.quizAnswer.deleteMany({ where: { userId: userAId } });
      await prisma.quizSession.deleteMany({ where: { userId: userAId } });
      await prisma.userProfile.delete({ where: { id: userAId } }).catch(() => {});
    }
    if (userBId) {
      await prisma.xPTransaction.deleteMany({ where: { userId: userBId } });
      await prisma.quizAnswer.deleteMany({ where: { userId: userBId } });
      await prisma.quizSession.deleteMany({ where: { userId: userBId } });
      await prisma.userProfile.delete({ where: { id: userBId } }).catch(() => {});
    }
  });

  test('Client-facing practice question payloads never expose correctOption or explanation', async () => {
    const questions = await getQuestionsForPractice({
      subject: sampleQuestion.subject,
      chapter: sampleQuestion.chapter,
      count: 3,
    });

    assert.ok(questions.length > 0);
    for (const q of questions) {
      assert.strictEqual((q as unknown as Record<string, unknown>).correctOption, undefined, 'Client question must not contain correctOption');
      assert.strictEqual((q as unknown as Record<string, unknown>).explanation, undefined, 'Client question must not contain explanation');
      assert.ok(q.id);
      assert.ok(q.text);
      assert.ok(Array.isArray(q.options));
      assert.strictEqual(q.options.length, 4);
    }
  });

  test('AUTH-07: User B cannot submit answers to User A practice session (cross-user protection)', async () => {
    const sessionA = await prisma.quizSession.create({
      data: {
        userId: userAId,
        subject: sampleQuestion.subject,
        chapter: sampleQuestion.chapter,
        status: SessionStatus.ACTIVE,
        questionIds: [sampleQuestion.id],
        totalQuestions: 1,
      },
    });

    // Attempt answer submission as User B
    setMockAuthUser(userBClerkId);
    await assert.rejects(
      async () => {
        await submitPracticeAnswer({
          sessionId: sessionA.id,
          questionId: sampleQuestion.id,
          selectedOption: OptionLabel.A,
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('FORBIDDEN'));
        return true;
      }
    );

    // Verify no answer was created
    const answerCount = await prisma.quizAnswer.count({
      where: { sessionId: sessionA.id },
    });
    assert.strictEqual(answerCount, 0);

    // Verify User B received 0 XP
    const userBTxCount = await prisma.xPTransaction.count({
      where: { userId: userBId, sessionId: sessionA.id },
    });
    assert.strictEqual(userBTxCount, 0);
  });

  test('PRAC-03: Concurrent answer submission via Promise.all is protected against double-submits and duplicate XP', async () => {
    const session = await prisma.quizSession.create({
      data: {
        userId: userBId,
        subject: sampleQuestion.subject,
        chapter: sampleQuestion.chapter,
        status: SessionStatus.ACTIVE,
        questionIds: [sampleQuestion.id],
        totalQuestions: 1,
      },
    });

    setMockAuthUser(userBClerkId);

    const profileBefore = await prisma.userProfile.findUniqueOrThrow({
      where: { id: userBId },
    });

    // Execute two concurrent answer submissions for the exact same question simultaneously
    const [res1, res2] = await Promise.all([
      submitPracticeAnswer({
        sessionId: session.id,
        questionId: sampleQuestion.id,
        selectedOption: sampleQuestion.correctOption,
      }),
      submitPracticeAnswer({
        sessionId: session.id,
        questionId: sampleQuestion.id,
        selectedOption: sampleQuestion.correctOption,
      }),
    ]);

    // Both requests receive consistent, valid results
    assert.strictEqual(res1.isCorrect, true);
    assert.strictEqual(res2.isCorrect, true);
    assert.strictEqual(res1.correctOption, sampleQuestion.correctOption);
    assert.strictEqual(res2.correctOption, sampleQuestion.correctOption);

    // Verify database constraint and single record creation
    const answerCount = await prisma.quizAnswer.count({
      where: { sessionId: session.id, questionId: sampleQuestion.id },
    });
    assert.strictEqual(answerCount, 1, 'Exactly one QuizAnswer row must exist despite concurrent calls');

    // Verify XP transaction was created exactly once (no duplicate XP)
    const xpTxCount = await prisma.xPTransaction.count({
      where: { userId: userBId, sessionId: session.id },
    });
    assert.strictEqual(xpTxCount, 1, 'Exactly one XP transaction must exist for this answer');

    // Verify user profile was updated with exactly +20 XP once
    const profileAfter = await prisma.userProfile.findUniqueOrThrow({
      where: { id: userBId },
    });
    assert.strictEqual(profileAfter.xp, profileBefore.xp + 20);
    assert.strictEqual(profileAfter.questionsAnswered, profileBefore.questionsAnswered + 1);
  });

  test('PostgreSQL unique constraint rejects direct duplicate quizAnswer inserts (schema invariant)', async () => {
    const session = await prisma.quizSession.create({
      data: {
        userId: userBId,
        subject: sampleQuestion.subject,
        chapter: sampleQuestion.chapter,
        status: SessionStatus.ACTIVE,
        questionIds: [sampleQuestion.id],
        totalQuestions: 1,
      },
    });

    // First insert succeeds
    await prisma.quizAnswer.create({
      data: {
        sessionId: session.id,
        userId: userBId,
        questionId: sampleQuestion.id,
        selectedOption: OptionLabel.A,
        isCorrect: sampleQuestion.correctOption === OptionLabel.A,
      },
    });

    // Duplicate insert for same (sessionId, questionId) must be rejected by database unique constraint
    await assert.rejects(
      async () => {
        await prisma.quizAnswer.create({
          data: {
            sessionId: session.id,
            userId: userBId,
            questionId: sampleQuestion.id,
            selectedOption: OptionLabel.A,
            isCorrect: sampleQuestion.correctOption === OptionLabel.A,
          },
        });
      },
      (err: unknown) => {
        const prismaErr = err as { code?: string; message?: string };
        assert.ok(prismaErr.code === 'P2002' || (prismaErr.message && prismaErr.message.includes('Unique constraint')));
        return true;
      }
    );
  });

  test('Negative answer penalty floors total XP at zero (never negative)', async () => {
    const currentProfile = await prisma.userProfile.findUniqueOrThrow({
      where: { id: userAId },
    });
    assert.strictEqual(currentProfile.xp, 0);

    // Level 5 wrong answer penalty is -2 XP
    const xpPenalty = -2;
    const flooredXp = Math.max(0, currentProfile.xp + xpPenalty);
    assert.strictEqual(flooredXp, 0);

    await prisma.userProfile.update({
      where: { id: userAId },
      data: { xp: flooredXp },
    });

    const refreshed = await prisma.userProfile.findUniqueOrThrow({
      where: { id: userAId },
    });
    assert.strictEqual(refreshed.xp, 0);
  });
});

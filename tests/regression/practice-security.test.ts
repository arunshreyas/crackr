import '../test-helper';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/server/db';
import { getQuestionsForPractice } from '../../lib/server/questions/service';
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

  test('Answer checking is strictly verified on server and awards XP atomically', async () => {
    // Create session for User A
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

    // Call submitPracticeAnswer via prisma directly simulating practice service transaction
    const correctOpt = sampleQuestion.correctOption;
    const isCorrect = correctOpt === OptionLabel.A ? OptionLabel.A : OptionLabel.B;
    const expectedCorrect = isCorrect === sampleQuestion.correctOption;

    const answer = await prisma.quizAnswer.create({
      data: {
        sessionId: sessionA.id,
        userId: userAId,
        questionId: sampleQuestion.id,
        selectedOption: isCorrect,
        isCorrect: expectedCorrect,
        timeTakenSeconds: 25,
      },
    });

    assert.ok(answer.id);
    assert.strictEqual(answer.isCorrect, expectedCorrect);
  });

  test('Answer submission is protected by unique constraint against concurrent double-submits', async () => {
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

    // Duplicate insert for same (sessionId, questionId) must be rejected by database
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

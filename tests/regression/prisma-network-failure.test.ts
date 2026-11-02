import '../test-helper';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setMockAuthUser } from '../test-helper';
import { prisma } from '../../lib/server/db';
import {
  withDatabaseRetry,
  DatabaseUnavailableError,
  toServerActionError,
} from '../../lib/server/db/resilience';
import { getAuthenticatedUser } from '../../lib/server/auth';
import { saveNoteAction } from '../../app/actions/notes';
import { submitAnswerAction } from '../../app/actions/practice';
import { OptionLabel, SessionStatus } from '@prisma/client';

describe('Prisma Network Failure Handling & Safe Retry Regression Tests', () => {
  let testUserId: string;
  let testClerkId: string;
  let sampleQuestionId: string;
  let sampleSessionId: string;

  before(async () => {
    testClerkId = `test_net_fail_${Date.now()}`;

    // Create isolated test user
    const user = await prisma.userProfile.create({
      data: {
        clerkId: testClerkId,
        email: `${testClerkId}@crackrr.test`,
        name: 'Network Resilience Aspirant',
        username: `net_res_${Date.now()}`,
        school: 'Crackrr Institute',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
        xp: 100,
        level: 1,
      },
    });
    testUserId = user.id;

    // Find sample question
    const q = await prisma.question.findFirst({
      where: { options: { some: {} } },
      select: { id: true },
    });
    if (!q) throw new Error('No question in database for resilience tests');
    sampleQuestionId = q.id;

    // Create an active practice session
    const session = await prisma.quizSession.create({
      data: {
        userId: testUserId,
        status: SessionStatus.ACTIVE,
        questionIds: [sampleQuestionId],
        currentQuestionIndex: 0,
        totalQuestions: 1,
        durationSeconds: 0,
        difficulty: 'MEDIUM',
      },
    });
    sampleSessionId = session.id;

    setMockAuthUser(testClerkId);
  });

  after(async () => {
    setMockAuthUser(null);
    if (sampleSessionId) {
      await prisma.quizAnswer.deleteMany({ where: { sessionId: sampleSessionId } }).catch(() => {});
      await prisma.quizSession.delete({ where: { id: sampleSessionId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.xPTransaction.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await prisma.revisionNote.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await prisma.revisionRecord.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await prisma.userProfile.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  // 1. Database connection failure during profile lookup
  test('1. Database connection failure during profile lookup throws DatabaseUnavailableError and never treats user as unauthenticated', async () => {
    setMockAuthUser(testClerkId);

    // Mock prisma.userProfile.findUnique to throw read EADDRNOTAVAIL
    const originalFindUnique = prisma.userProfile.findUnique;
    (prisma.userProfile as unknown as { findUnique: unknown }).findUnique = async () => {
      const err = new Error('read EADDRNOTAVAIL');
      (err as { code?: string }).code = 'EADDRNOTAVAIL';
      throw err;
    };

    try {
      await assert.rejects(
        async () => {
          await getAuthenticatedUser();
        },
        (err: unknown) => {
          assert.ok(
            err instanceof DatabaseUnavailableError,
            'Must throw DatabaseUnavailableError on transient socket failure'
          );
          assert.strictEqual(
            (err as DatabaseUnavailableError).code,
            'DATABASE_UNAVAILABLE'
          );
          assert.strictEqual(
            (err as DatabaseUnavailableError).retryable,
            true
          );
          return true;
        }
      );
    } finally {
      // Restore original function
      (prisma.userProfile as unknown as { findUnique: unknown }).findUnique = originalFindUnique;
    }
  });

  // 2. Network interruption during a save
  test('2. Network interruption during save returns structured retryable error and sanitizes internal traces', async () => {
    setMockAuthUser(testClerkId);

    const originalUpsert = prisma.revisionNote.upsert;
    (prisma.revisionNote as unknown as { upsert: unknown }).upsert = async () => {
      const socketErr = new Error(
        'Invalid prisma.revisionNote.upsert() invocation:\nError: read EADDRNOTAVAIL at TCP.onStreamRead'
      );
      (socketErr as { code?: string }).code = 'EADDRNOTAVAIL';
      throw socketErr;
    };

    try {
      const res = await saveNoteAction({
        questionId: sampleQuestionId,
        userNote: 'Crucial formula notes',
        tags: ['Formula Trap'],
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'DATABASE_UNAVAILABLE');
      assert.strictEqual(res.retryable, true);
      assert.ok(res.error, 'Must provide sanitized error message');
      assert.ok(
        !res.error.includes('prisma.') &&
          !res.error.includes('invocation') &&
          !res.error.includes('TCP.onStreamRead'),
        'Must never leak internal Prisma call traces to the client'
      );
    } finally {
      (prisma.revisionNote as unknown as { upsert: unknown }).upsert = originalUpsert;
    }
  });

  // 3. Network interruption during a submission
  test('3. Network interruption during answer submission returns structured retryable error', async () => {
    setMockAuthUser(testClerkId);

    const originalTransaction = prisma.$transaction;
    (prisma as unknown as { $transaction: unknown }).$transaction = async () => {
      const connErr = new Error('Connection terminated unexpectedly');
      (connErr as { code?: string }).code = 'ECONNRESET';
      throw connErr;
    };

    try {
      const res = await submitAnswerAction({
        sessionId: sampleSessionId,
        questionId: sampleQuestionId,
        selectedOption: OptionLabel.A,
        timeTakenSeconds: 15,
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'DATABASE_UNAVAILABLE');
      assert.strictEqual(res.retryable, true);
    } finally {
      (prisma as unknown as { $transaction: unknown }).$transaction = originalTransaction;
    }
  });

  // 4. Recovery after the database becomes available again
  test('4. Transient failure recovers automatically when database becomes available again on retry', async () => {
    let callCount = 0;

    const recoverableOperation = async () => {
      callCount++;
      if (callCount < 2) {
        const blip = new Error('read EADDRNOTAVAIL');
        (blip as { code?: string }).code = 'EADDRNOTAVAIL';
        throw blip;
      }
      return { status: 'RECOVERED_SUCCESSFULLY', attempt: callCount };
    };

    const result = await withDatabaseRetry(recoverableOperation, {
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 50,
    });

    assert.strictEqual(callCount, 2, 'Should succeed on second attempt after first blip');
    assert.strictEqual(result.status, 'RECOVERED_SUCCESSFULLY');
  });

  // 5. Retry exhaustion
  test('5. Persistent network outage halts at maxRetries and throws DatabaseUnavailableError', async () => {
    let callCount = 0;

    const failingOperation = async () => {
      callCount++;
      const persistentErr = new Error('connect ECONNREFUSED 127.0.0.1:5432');
      (persistentErr as { code?: string }).code = 'ECONNREFUSED';
      throw persistentErr;
    };

    await assert.rejects(
      async () => {
        await withDatabaseRetry(failingOperation, {
          maxRetries: 2,
          initialDelayMs: 10,
          maxDelayMs: 50,
        });
      },
      (err: unknown) => {
        assert.ok(
          err instanceof DatabaseUnavailableError,
          'Must wrap exhausted retries in DatabaseUnavailableError'
        );
        assert.strictEqual(callCount, 3, 'Must attempt initial + 2 retries (total 3) then halt');
        assert.strictEqual(
          (err as DatabaseUnavailableError).code,
          'DATABASE_UNAVAILABLE'
        );
        return true;
      }
    );
  });

  // 6. Duplicate submission prevention
  test('6. Answer submission is idempotent and prevents duplicate quizAnswer records upon retry', async () => {
    setMockAuthUser(testClerkId);

    // Initial successful submission
    const res1 = await submitAnswerAction({
      sessionId: sampleSessionId,
      questionId: sampleQuestionId,
      selectedOption: OptionLabel.B,
      timeTakenSeconds: 25,
    });
    assert.strictEqual(res1.success, true);
    assert.ok(res1.data);

    // Simulating user retrying the exact same submission (e.g. network blip on response ack)
    const res2 = await submitAnswerAction({
      sessionId: sampleSessionId,
      questionId: sampleQuestionId,
      selectedOption: OptionLabel.B,
      timeTakenSeconds: 25,
    });
    assert.strictEqual(res2.success, true);
    assert.ok(res2.data);
    assert.strictEqual(res2.data.correctOption, res1.data.correctOption);

    // Verify exactly 1 quizAnswer row exists in database for this session & question
    const answers = await prisma.quizAnswer.findMany({
      where: { sessionId: sampleSessionId, questionId: sampleQuestionId },
    });
    assert.strictEqual(
      answers.length,
      1,
      'Exactly 1 answer row must exist in PostgreSQL; duplicate submissions must not create multiple rows'
    );
  });

  // 7. XP and session records not being duplicated
  test('7. Repeated submissions do not duplicate XPTransaction records or inflate XP', async () => {
    setMockAuthUser(testClerkId);

    const xpRecords = await prisma.xPTransaction.findMany({
      where: {
        userId: testUserId,
        sessionId: sampleSessionId,
      },
    });

    assert.strictEqual(
      xpRecords.length,
      1,
      'Exactly 1 XPTransaction must exist for this question answer, preventing XP duplication'
    );

    // Verify userProfile total questionsAnswered count
    const profile = await prisma.userProfile.findUniqueOrThrow({
      where: { id: testUserId },
      select: { questionsAnswered: true },
    });
    assert.strictEqual(
      profile.questionsAnswered,
      1,
      'questionsAnswered count must reflect exactly 1 attempt'
    );
  });

  // 8. Authentication failures remaining distinguishable from database failures
  test('8. Authentication failures (UNAUTHORIZED) remain strictly distinguishable from database failures (DATABASE_UNAVAILABLE)', async () => {
    // 8a. Unauthenticated call
    setMockAuthUser(null);
    const unauthSaveRes = await saveNoteAction({
      questionId: sampleQuestionId,
      userNote: 'Unauth attempt',
    });
    assert.strictEqual(unauthSaveRes.success, false);
    assert.strictEqual(unauthSaveRes.code, 'UNAUTHORIZED');
    assert.strictEqual(unauthSaveRes.retryable, false);

    // 8b. Authenticated call but database unavailable
    setMockAuthUser(testClerkId);
    const dbErr = new DatabaseUnavailableError('DB unavailable');
    const dbActionRes = toServerActionError(dbErr, 'Save failed');

    assert.strictEqual(dbActionRes.success, false);
    assert.strictEqual(dbActionRes.code, 'DATABASE_UNAVAILABLE');
    assert.strictEqual(dbActionRes.retryable, true);

    // Confirm codes are mutually exclusive
    assert.notStrictEqual(unauthSaveRes.code, dbActionRes.code);
    assert.notStrictEqual(unauthSaveRes.retryable, dbActionRes.retryable);
  });

  // 9. User input being preserved after a failed save
  test('9. User input is preserved across failed save and successfully committed on retry', async () => {
    setMockAuthUser(testClerkId);

    const userInput = {
      questionId: sampleQuestionId,
      userNote: 'Critical dimensional analysis heuristic',
      tags: ['Calculation Error', 'Formula Trap'],
      keyTakeaway: 'Always verify L.H.S and R.H.S dimensions before quadratic expansion',
    };

    // Step A: First save exhausts retries due to persistent network drop
    const originalUpsert = prisma.revisionNote.upsert;
    let failuresRemaining = 3;

    (prisma.revisionNote as unknown as { upsert: unknown }).upsert = async (...args: unknown[]) => {
      if (failuresRemaining > 0) {
        failuresRemaining--;
        const err = new Error('read EADDRNOTAVAIL');
        (err as { code?: string }).code = 'EADDRNOTAVAIL';
        throw err;
      }
      // @ts-expect-error args forwarding
      return originalUpsert.apply(prisma.revisionNote, args);
    };

    try {
      const failedRes = await saveNoteAction({ ...userInput });
      assert.strictEqual(failedRes.success, false);
      assert.strictEqual(failedRes.code, 'DATABASE_UNAVAILABLE');
      assert.strictEqual(failedRes.retryable, true);

      // Verify original input was not mutated or destroyed
      assert.strictEqual(userInput.userNote, 'Critical dimensional analysis heuristic');
      assert.strictEqual(userInput.tags.length, 2);

      // Step B: User or UI triggers safe retry with the preserved userInput
      const retryRes = await saveNoteAction({ ...userInput });
      assert.strictEqual(retryRes.success, true);
      assert.ok(retryRes.data);
      assert.strictEqual(retryRes.data.userNote, userInput.userNote);
      assert.deepStrictEqual(retryRes.data.tags, userInput.tags);
      assert.strictEqual(retryRes.data.keyTakeaway, userInput.keyTakeaway);

      // Verify persistence in PostgreSQL
      const savedInDb = await prisma.revisionNote.findUnique({
        where: {
          userId_questionId: {
            userId: testUserId,
            questionId: sampleQuestionId,
          },
        },
      });
      assert.ok(savedInDb);
      assert.strictEqual(savedInDb.userNote, userInput.userNote);
    } finally {
      (prisma.revisionNote as unknown as { upsert: unknown }).upsert = originalUpsert;
    }
  });
});

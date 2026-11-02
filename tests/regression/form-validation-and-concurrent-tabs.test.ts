import '../test-helper';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setMockAuthUser } from '../test-helper';
import { prisma } from '../../lib/server/db';
import { saveNoteAction, updateNoteAction, deleteNoteAction } from '../../app/actions/notes';
import { updateSettingsAction } from '../../app/actions/settings';
import { markConceptReviewedAction } from '../../app/actions/revision';
import {
  startPracticeAction,
  submitAnswerAction,
  completeSessionAction,
} from '../../app/actions/practice';
import { submitOnboarding } from '../../app/actions/onboarding';
import { OptionLabel, RevisionStatus, SessionStatus, Stream } from '@prisma/client';

describe('QA Validation: Form Data Resilience & Two-Tab Practice Concurrency', () => {
  let primaryUserId: string;
  let primaryClerkId: string;
  let otherUserId: string;
  let otherClerkId: string;
  let validQuestion1Id: string;
  let validQuestion2Id: string;
  let validQuestion1CorrectOption: OptionLabel;
  let validQuestion1Explanation: string;

  before(async () => {
    primaryClerkId = `test_qa_primary_${Date.now()}`;
    otherClerkId = `test_qa_other_${Date.now()}`;

    // 1. Create primary test user
    const primaryUser = await prisma.userProfile.create({
      data: {
        clerkId: primaryClerkId,
        email: `${primaryClerkId}@crackrr.test`,
        name: 'Primary QA Candidate',
        username: `qa_prim_${Date.now()}`,
        school: 'Crackrr Academy',
        grade: '12',
        stream: 'PCM',
        dailyGoal: 20,
        preferredDifficulty: 'Moderate',
        onboardingCompleted: true,
        xp: 150,
        level: 1,
        questionsAnswered: 0,
        questionsCorrect: 0,
      },
    });
    primaryUserId = primaryUser.id;

    // 2. Create secondary test user for conflict/isolation checks
    const otherUser = await prisma.userProfile.create({
      data: {
        clerkId: otherClerkId,
        email: `${otherClerkId}@crackrr.test`,
        name: 'Other QA Candidate',
        username: `qa_other_${Date.now()}`,
        school: 'Other Academy',
        grade: '12',
        stream: 'PCB',
        dailyGoal: 15,
        onboardingCompleted: true,
        xp: 0,
        level: 1,
      },
    });
    otherUserId = otherUser.id;

    // 3. Find two real questions from database
    const questions = await prisma.question.findMany({
      where: {
        options: { some: {} },
        explanation: { not: null },
      },
      select: {
        id: true,
        correctOption: true,
        explanation: true,
      },
      take: 2,
    });
    if (questions.length < 2) {
      throw new Error('Need at least 2 questions in database for test suite');
    }
    validQuestion1Id = questions[0].id;
    validQuestion1CorrectOption = questions[0].correctOption;
    validQuestion1Explanation = questions[0].explanation || 'Explanation';
    validQuestion2Id = questions[1].id;

    setMockAuthUser(primaryClerkId);
  });

  after(async () => {
    setMockAuthUser(null);
    if (primaryUserId) {
      await prisma.xPTransaction.deleteMany({ where: { userId: primaryUserId } }).catch(() => {});
      await prisma.quizAnswer.deleteMany({ where: { userId: primaryUserId } }).catch(() => {});
      await prisma.quizSession.deleteMany({ where: { userId: primaryUserId } }).catch(() => {});
      await prisma.revisionNote.deleteMany({ where: { userId: primaryUserId } }).catch(() => {});
      await prisma.revisionRecord.deleteMany({ where: { userId: primaryUserId } }).catch(() => {});
      await prisma.userProfile.delete({ where: { id: primaryUserId } }).catch(() => {});
    }
    if (otherUserId) {
      await prisma.userProfile.delete({ where: { id: otherUserId } }).catch(() => {});
    }
  });

  // =========================================================================
  // TEST PART 1: EMPTY, MALFORMED, OR STALE FORM DATA
  // =========================================================================
  describe('Part 1: Empty, Malformed, or Stale Form Data Validation', () => {
    test('1.1: Notes Form rejects empty or whitespace question IDs and saves no data', async () => {
      setMockAuthUser(primaryClerkId);

      const notesBeforeCount = await prisma.revisionNote.count({
        where: { userId: primaryUserId },
      });

      // A: Empty string
      const res1 = await saveNoteAction({
        questionId: '',
        userNote: 'Should never save',
      });
      assert.strictEqual(res1.success, false);
      assert.strictEqual(res1.error, 'Invalid question ID');

      // B: Whitespace only
      const res2 = await saveNoteAction({
        questionId: '    ',
        userNote: 'Should never save',
      });
      assert.strictEqual(res2.success, false);
      assert.strictEqual(res2.error, 'Invalid question ID');

      // C: Non-string input
      const res3 = await saveNoteAction({
        questionId: null as unknown as string,
        userNote: 'Should never save',
      });
      assert.strictEqual(res3.success, false);
      assert.strictEqual(res3.error, 'Invalid question ID');

      // Verify DB: No revision note row was created
      const notesAfterCount = await prisma.revisionNote.count({
        where: { userId: primaryUserId },
      });
      assert.strictEqual(notesAfterCount, notesBeforeCount, 'Zero notes must be saved on invalid ID');
    });

    test('1.2: Notes Form rejects non-existent/malformed question IDs without corrupting DB', async () => {
      setMockAuthUser(primaryClerkId);

      const res = await saveNoteAction({
        questionId: 'non-existent-uuid-999999',
        userNote: 'Trying to reference ghost question',
      });
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, 'Question not found');

      // Verify no note saved for this invalid question
      const saved = await prisma.revisionNote.findFirst({
        where: { userId: primaryUserId, questionId: 'non-existent-uuid-999999' },
      });
      assert.strictEqual(saved, null);
    });

    test('1.3: Notes Form rejects stale or non-existent note IDs on update or delete', async () => {
      setMockAuthUser(primaryClerkId);

      // Stale update
      const updateRes = await updateNoteAction('stale-or-ghost-note-id', {
        userNote: 'Updated content',
      });
      assert.strictEqual(updateRes.success, false);
      assert.ok(
        updateRes.error?.includes('not found') || updateRes.error?.includes('Invalid note ID')
      );

      // Stale delete
      const deleteRes = await deleteNoteAction('stale-or-ghost-note-id');
      assert.strictEqual(deleteRes.success, false);
      assert.ok(
        deleteRes.error?.includes('not found') || deleteRes.error?.includes('Invalid note ID')
      );
    });

    test('1.4: Settings Form rejects empty, malformed, or out-of-range payloads and preserves original profile', async () => {
      setMockAuthUser(primaryClerkId);

      const initialProfile = await prisma.userProfile.findUniqueOrThrow({
        where: { id: primaryUserId },
      });

      // A: Empty / whitespace name
      const resName = await updateSettingsAction({
        name: '   ',
        school: 'Valid School',
        grade: '12',
        stream: 'PCM',
        dailyGoal: 20,
        preferredDifficulty: 'Moderate',
      });
      assert.strictEqual(resName.success, false);
      assert.strictEqual(resName.error, 'Full name must be at least 2 characters.');

      // B: Empty / whitespace school
      const resSchool = await updateSettingsAction({
        name: 'Valid Name',
        school: '   ',
        grade: '12',
        stream: 'PCM',
        dailyGoal: 20,
        preferredDifficulty: 'Moderate',
      });
      assert.strictEqual(resSchool.success, false);
      assert.strictEqual(resSchool.error, 'School / Institution cannot be empty.');

      // C: Invalid stream value
      const resStream = await updateSettingsAction({
        name: 'Valid Name',
        school: 'Valid School',
        grade: '12',
        stream: 'COMMERCE' as Stream,
        dailyGoal: 20,
        preferredDifficulty: 'Moderate',
      });
      assert.strictEqual(resStream.success, false);
      assert.strictEqual(resStream.error, 'Invalid study stream selected.');

      // D: Out-of-bounds dailyGoal (too low: 2)
      const resGoalLow = await updateSettingsAction({
        name: 'Valid Name',
        school: 'Valid School',
        grade: '12',
        stream: 'PCM',
        dailyGoal: 2,
        preferredDifficulty: 'Moderate',
      });
      assert.strictEqual(resGoalLow.success, false);
      assert.strictEqual(
        resGoalLow.error,
        'Daily practice goal must be between 5 and 200 questions.'
      );

      // E: Out-of-bounds dailyGoal (too high: 350)
      const resGoalHigh = await updateSettingsAction({
        name: 'Valid Name',
        school: 'Valid School',
        grade: '12',
        stream: 'PCM',
        dailyGoal: 350,
        preferredDifficulty: 'Moderate',
      });
      assert.strictEqual(resGoalHigh.success, false);
      assert.strictEqual(
        resGoalHigh.error,
        'Daily practice goal must be between 5 and 200 questions.'
      );

      // Verify DB: User profile remains 100% untouched
      const afterProfile = await prisma.userProfile.findUniqueOrThrow({
        where: { id: primaryUserId },
      });
      assert.strictEqual(afterProfile.name, initialProfile.name);
      assert.strictEqual(afterProfile.school, initialProfile.school);
      assert.strictEqual(afterProfile.stream, initialProfile.stream);
      assert.strictEqual(afterProfile.dailyGoal, initialProfile.dailyGoal);
    });

    test('1.5: Revision Review Form rejects empty conceptKey or invalid status', async () => {
      setMockAuthUser(primaryClerkId);

      const recordsBefore = await prisma.revisionRecord.count({
        where: { userId: primaryUserId },
      });

      // A: Empty conceptKey
      const resEmptyKey = await markConceptReviewedAction({
        conceptKey: '   ',
        status: RevisionStatus.REVIEWED,
      });
      assert.strictEqual(resEmptyKey.success, false);
      assert.ok(resEmptyKey.error?.includes('conceptKey is required'));

      // B: Invalid status
      const resBadStatus = await markConceptReviewedAction({
        conceptKey: 'PHYSICS::Kinematics::Motion',
        status: 'INVALID_STATUS' as RevisionStatus,
      });
      assert.strictEqual(resBadStatus.success, false);
      assert.ok(resBadStatus.error?.includes('valid RevisionStatus'));

      // Verify DB: Zero revision records created
      const recordsAfter = await prisma.revisionRecord.count({
        where: { userId: primaryUserId },
      });
      assert.strictEqual(recordsAfter, recordsBefore);
    });

    test('1.6: Practice Answer Form rejects invalid inputs, question mismatch, and completed sessions', async () => {
      setMockAuthUser(primaryClerkId);

      // Create a test session with only validQuestion1Id
      const testSession = await prisma.quizSession.create({
        data: {
          userId: primaryUserId,
          status: SessionStatus.ACTIVE,
          questionIds: [validQuestion1Id],
          currentQuestionIndex: 0,
          totalQuestions: 1,
          difficulty: 'MEDIUM',
        },
      });

      // A: Invalid / missing option (e.g. 'Z')
      const resBadOption = await submitAnswerAction({
        sessionId: testSession.id,
        questionId: validQuestion1Id,
        selectedOption: 'Z' as OptionLabel,
      });
      assert.strictEqual(resBadOption.success, false);
      assert.ok(resBadOption.error?.includes('Selected option must be A, B, C, or D'));

      // B: Question does NOT belong to this practice session (validQuestion2Id is not in questionIds)
      const resMismatch = await submitAnswerAction({
        sessionId: testSession.id,
        questionId: validQuestion2Id,
        selectedOption: OptionLabel.A,
      });
      assert.strictEqual(resMismatch.success, false);
      assert.ok(resMismatch.error?.includes('Question does not belong to this practice session'));

      // C: Stale completed session
      // Mark session as COMPLETED
      await completeSessionAction({
        sessionId: testSession.id,
        durationSeconds: 60,
      });

      // Now attempt to submit answer to completed session
      const resCompleted = await submitAnswerAction({
        sessionId: testSession.id,
        questionId: validQuestion1Id,
        selectedOption: OptionLabel.A,
      });
      assert.strictEqual(resCompleted.success, false);
      assert.strictEqual(resCompleted.code, 'SESSION_COMPLETED');
      assert.strictEqual(
        resCompleted.error,
        'This practice session has already been completed.'
      );

      // Verify DB: No answers recorded for this session
      const answers = await prisma.quizAnswer.count({
        where: { sessionId: testSession.id },
      });
      assert.strictEqual(answers, 0, 'No answer rows must be inserted on stale/completed session');

      // Cleanup test session
      await prisma.quizSession.delete({ where: { id: testSession.id } });
    });

    test('1.7: Onboarding Form rejects taken usernames, short usernames, and empty fields', async () => {
      setMockAuthUser(primaryClerkId);

      // Other user's existing username
      const otherUser = await prisma.userProfile.findUniqueOrThrow({
        where: { id: otherUserId },
      });

      // A: Try to claim other user's username
      const resTaken = await submitOnboarding({
        name: 'Intruder',
        username: otherUser.username,
        school: 'School',
        grade: '12',
        stream: 'PCM',
        dailyGoal: 20,
      });
      assert.strictEqual(resTaken.success, false);
      assert.strictEqual(
        resTaken.error,
        'This username is already taken. Please choose another.'
      );

      // B: Username too short (< 3 chars)
      const resShort = await submitOnboarding({
        name: 'Valid Name',
        username: 'ab',
        school: 'School',
        grade: '12',
        stream: 'PCM',
        dailyGoal: 20,
      });
      assert.strictEqual(resShort.success, false);
      assert.strictEqual(
        resShort.error,
        'Username must be at least 3 characters long.'
      );

      // Verify otherUser's profile was not modified
      const otherUserAfter = await prisma.userProfile.findUniqueOrThrow({
        where: { id: otherUserId },
      });
      assert.strictEqual(otherUserAfter.name, 'Other QA Candidate');
    });
  });

  // =========================================================================
  // TEST PART 2: TWO TABS CONCURRENT SUBMISSION TO THE SAME SESSION
  // =========================================================================
  describe('Part 2: Two Tabs Practice Session Concurrency & Idempotency', () => {
    test('2.1: Simultaneous submission from Tab 1 and Tab 2 records exactly one answer and awards XP once', async () => {
      setMockAuthUser(primaryClerkId);

      // Start a verified practice session
      const startRes = await startPracticeAction({
        questionCount: 1,
      });
      assert.strictEqual(startRes.success, true);
      assert.ok(startRes.data?.sessionId);
      const sessionId = startRes.data.sessionId;
      const questionId = startRes.data.questions[0].id;

      const profileBefore = await prisma.userProfile.findUniqueOrThrow({
        where: { id: primaryUserId },
      });

      // Simulate Tab 1 and Tab 2 firing submit simultaneously via Promise.all
      // Tab 1 submits Option A, Tab 2 submits Option A
      const [tab1Res, tab2Res] = await Promise.all([
        submitAnswerAction({
          sessionId,
          questionId,
          selectedOption: OptionLabel.A,
          timeTakenSeconds: 12,
        }),
        submitAnswerAction({
          sessionId,
          questionId,
          selectedOption: OptionLabel.A,
          timeTakenSeconds: 12,
        }),
      ]);

      // Both tabs recover sensibly with successful answer evaluations
      assert.strictEqual(tab1Res.success, true, 'Tab 1 must succeed');
      assert.strictEqual(tab2Res.success, true, 'Tab 2 must succeed');
      assert.ok(tab1Res.data);
      assert.ok(tab2Res.data);

      // Both tabs receive the exact same correctOption and explanation
      assert.strictEqual(tab1Res.data.correctOption, tab2Res.data.correctOption);
      assert.strictEqual(tab1Res.data.isCorrect, tab2Res.data.isCorrect);

      // Verify Database: Exactly 1 QuizAnswer record
      const answers = await prisma.quizAnswer.findMany({
        where: { sessionId, questionId },
      });
      assert.strictEqual(
        answers.length,
        1,
        'Database must contain exactly 1 answer row; duplicate row was prevented'
      );

      // Verify Database: Exactly 1 XPTransaction record for this question
      const xpTx = await prisma.xPTransaction.findMany({
        where: { userId: primaryUserId, sessionId },
      });
      assert.strictEqual(
        xpTx.length,
        1,
        'Database must contain exactly 1 XPTransaction row; duplicate XP was prevented'
      );

      // Verify Profile: questionsAnswered incremented by exactly 1
      const profileAfter = await prisma.userProfile.findUniqueOrThrow({
        where: { id: primaryUserId },
      });
      assert.strictEqual(
        profileAfter.questionsAnswered,
        profileBefore.questionsAnswered + 1,
        'questionsAnswered must be incremented exactly once'
      );

      // Verify Total XP increment matches exactly 1 answer award
      const expectedXpGain = xpTx[0].amount;
      assert.strictEqual(
        profileAfter.xp,
        profileBefore.xp + expectedXpGain,
        'Total XP must increase by exactly 1 answer amount, not double'
      );

      // Cleanup session
      await prisma.quizAnswer.deleteMany({ where: { sessionId } });
      await prisma.xPTransaction.deleteMany({ where: { sessionId } });
      await prisma.quizSession.delete({ where: { id: sessionId } });
    });

    test('2.2: Stale Tab submission (Tab 1 submits first, Tab 2 submits later) returns existing answer idempotently', async () => {
      setMockAuthUser(primaryClerkId);

      // Create session with question 1
      const session = await prisma.quizSession.create({
        data: {
          userId: primaryUserId,
          status: SessionStatus.ACTIVE,
          questionIds: [validQuestion1Id],
          currentQuestionIndex: 0,
          totalQuestions: 1,
          difficulty: 'MEDIUM',
        },
      });

      const profileBefore = await prisma.userProfile.findUniqueOrThrow({
        where: { id: primaryUserId },
      });

      // Step A: Tab 1 submits answer to Question 1
      const tab1Res = await submitAnswerAction({
        sessionId: session.id,
        questionId: validQuestion1Id,
        selectedOption: validQuestion1CorrectOption,
        timeTakenSeconds: 20,
      });
      assert.strictEqual(tab1Res.success, true);
      assert.strictEqual(tab1Res.data?.isCorrect, true);

      // Step B: Tab 2 was kept open on the same question.
      // User in Tab 2 selects Option B and clicks submit after Tab 1 already completed.
      const tab2Res = await submitAnswerAction({
        sessionId: session.id,
        questionId: validQuestion1Id,
        selectedOption: OptionLabel.B,
        timeTakenSeconds: 35,
      });

      // Tab 2 recovers sensibly: server recognizes question was already answered,
      // returns the recorded answer evaluation without throwing 500 error or crashing
      assert.strictEqual(tab2Res.success, true);
      assert.ok(tab2Res.data);
      assert.strictEqual(tab2Res.data.isCorrect, true, 'Returns recorded isCorrect state');
      assert.strictEqual(tab2Res.data.correctOption, validQuestion1CorrectOption);
      assert.strictEqual(tab2Res.data.explanation, validQuestion1Explanation);

      // Verify Database: Still exactly 1 QuizAnswer record
      const answers = await prisma.quizAnswer.findMany({
        where: { sessionId: session.id, questionId: validQuestion1Id },
      });
      assert.strictEqual(answers.length, 1);
      assert.strictEqual(answers[0].selectedOption, validQuestion1CorrectOption);

      // Verify Database: Still exactly 1 XPTransaction
      const xpTx = await prisma.xPTransaction.findMany({
        where: { userId: primaryUserId, sessionId: session.id },
      });
      assert.strictEqual(xpTx.length, 1);

      // Verify Profile: XP and questionsAnswered was not inflated
      const profileAfter = await prisma.userProfile.findUniqueOrThrow({
        where: { id: primaryUserId },
      });
      assert.strictEqual(profileAfter.questionsAnswered, profileBefore.questionsAnswered + 1);
      assert.strictEqual(profileAfter.xp, profileBefore.xp + 20);

      // Cleanup
      await prisma.quizAnswer.deleteMany({ where: { sessionId: session.id } });
      await prisma.xPTransaction.deleteMany({ where: { sessionId: session.id } });
      await prisma.quizSession.delete({ where: { id: session.id } });
    });

    test('2.3: Stale Tab submission after Tab 1 finishes session returns clear SESSION_COMPLETED error', async () => {
      setMockAuthUser(primaryClerkId);

      const session = await prisma.quizSession.create({
        data: {
          userId: primaryUserId,
          status: SessionStatus.ACTIVE,
          questionIds: [validQuestion1Id, validQuestion2Id],
          currentQuestionIndex: 0,
          totalQuestions: 2,
          difficulty: 'MEDIUM',
        },
      });

      // Tab 1 completes question 1
      await submitAnswerAction({
        sessionId: session.id,
        questionId: validQuestion1Id,
        selectedOption: validQuestion1CorrectOption,
        timeTakenSeconds: 15,
      });

      // Tab 1 finishes and completes the entire session
      const completeRes = await completeSessionAction({
        sessionId: session.id,
        durationSeconds: 120,
      });
      assert.strictEqual(completeRes.success, true);

      // Tab 2 was sitting on question 2 in a separate tab and now tries to submit
      const tab2Res = await submitAnswerAction({
        sessionId: session.id,
        questionId: validQuestion2Id,
        selectedOption: OptionLabel.C,
        timeTakenSeconds: 40,
      });

      // Tab 2 recovers sensibly: cleanly communicated SESSION_COMPLETED error
      assert.strictEqual(tab2Res.success, false);
      assert.strictEqual(tab2Res.code, 'SESSION_COMPLETED');
      assert.strictEqual(
        tab2Res.error,
        'This practice session has already been completed.'
      );

      // Verify DB: Question 2 was NOT recorded; no extra XP awarded
      const q2Answer = await prisma.quizAnswer.findFirst({
        where: { sessionId: session.id, questionId: validQuestion2Id },
      });
      assert.strictEqual(q2Answer, null, 'No answer row for question 2 after session completion');

      // Cleanup
      await prisma.quizAnswer.deleteMany({ where: { sessionId: session.id } });
      await prisma.xPTransaction.deleteMany({ where: { sessionId: session.id } });
      await prisma.quizSession.delete({ where: { id: session.id } });
    });
  });
});

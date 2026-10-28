import '../test-helper';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/server/db';
import {
  saveRevisionNote,
  getUserRevisionNotes,
  deleteRevisionNote,
  getSavedQuestionIdsForUser,
} from '../../lib/server/notes/service';
import { Prisma } from '@prisma/client';

type QuestionWithOptions = Prisma.QuestionGetPayload<{ include: { options: true } }>;

describe('Revision Notes Database & Lifecycle Regressions', () => {
  let userId: string;
  let sampleQuestion: QuestionWithOptions;
  let createdNoteId: string;

  before(async () => {
    const user = await prisma.userProfile.create({
      data: {
        clerkId: `test_notes_db_${Date.now()}`,
        email: `notes_db_${Date.now()}@crackrr.test`,
        name: 'Notes Tester',
        username: `notes_user_${Date.now()}`,
        school: 'Crackrr Institute',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    userId = user.id;

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
    if (userId) {
      await prisma.revisionNote.deleteMany({ where: { userId } });
      await prisma.userProfile.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  test('Creates and enriches revision note with question details and taxonomy metadata', async () => {
    const note = await saveRevisionNote({
      userId,
      questionId: sampleQuestion.id,
      userNote: 'Formula recall: check signs on negative charges',
      tags: ['Formula', 'HighYield'],
    });

    createdNoteId = note.id;
    assert.ok(note.id);
    assert.strictEqual(note.userId, userId);
    assert.strictEqual(note.questionId, sampleQuestion.id);
    assert.strictEqual(note.subject, sampleQuestion.subject);
    assert.strictEqual(note.chapter, sampleQuestion.chapter);
    assert.ok(note.keyTakeaway !== null && note.keyTakeaway.length > 0);
    assert.deepStrictEqual(note.tags, ['Formula', 'HighYield']);
    assert.strictEqual(note.question.id, sampleQuestion.id);
    assert.ok(note.question.options.length > 0);
  });

  test('Idempotent upsert updates note without duplicating rows on repeated save', async () => {
    const countBefore = await prisma.revisionNote.count({
      where: { userId, questionId: sampleQuestion.id },
    });
    assert.strictEqual(countBefore, 1);

    const updatedNote = await saveRevisionNote({
      userId,
      questionId: sampleQuestion.id,
      userNote: 'Updated formula recall with additional diagram note',
      tags: ['HighYield', 'Reviewed'],
    });

    const countAfter = await prisma.revisionNote.count({
      where: { userId, questionId: sampleQuestion.id },
    });
    assert.strictEqual(countAfter, 1);
    assert.strictEqual(updatedNote.id, createdNoteId);
    assert.strictEqual(updatedNote.userNote, 'Updated formula recall with additional diagram note');
    assert.deepStrictEqual(updatedNote.tags, ['HighYield', 'Reviewed']);
  });

  test('Queries fast bookmarked question IDs list for practice bookmark icons', async () => {
    const savedIds = await getSavedQuestionIdsForUser(userId);
    assert.ok(Array.isArray(savedIds));
    assert.strictEqual(savedIds.length, 1);
    assert.strictEqual(savedIds[0], sampleQuestion.id);
  });

  test('Filters notes by subject and search keyword', async () => {
    const matchSubject = await getUserRevisionNotes(userId, {
      subject: sampleQuestion.subject,
    });
    assert.strictEqual(matchSubject.length, 1);

    const searchMatch = await getUserRevisionNotes(userId, {
      search: 'diagram note',
    });
    assert.strictEqual(searchMatch.length, 1);

    const searchMiss = await getUserRevisionNotes(userId, {
      search: 'nonexistent_random_phrase_xyz',
    });
    assert.strictEqual(searchMiss.length, 0);
  });

  test('Deleting a revision note preserves the underlying question (cascade safety)', async () => {
    const deleted = await deleteRevisionNote(userId, createdNoteId);
    assert.strictEqual(deleted, true);

    const noteInDb = await prisma.revisionNote.findUnique({
      where: { id: createdNoteId },
    });
    assert.strictEqual(noteInDb, null);

    // CRITICAL: Question in question bank MUST NOT be deleted
    const questionStillExists = await prisma.question.findUnique({
      where: { id: sampleQuestion.id },
    });
    assert.ok(questionStillExists !== null, 'Question bank must retain question after note deletion');
    assert.strictEqual(questionStillExists?.id, sampleQuestion.id);
  });
});

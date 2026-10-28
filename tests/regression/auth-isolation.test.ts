import '../test-helper';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/server/db';
import {
  saveRevisionNote,
  getUserRevisionNotes,
  getRevisionNoteById,
  updateRevisionNote,
  deleteRevisionNote,
} from '../../lib/server/notes/service';
import { getUserRevisionQueue } from '../../lib/server/revision/queue';
import { markConceptReviewed } from '../../lib/server/revision/service';
import { RevisionStatus } from '@prisma/client';

describe('Multi-Tenant Data Isolation & Security Invariants', () => {
  let user1Id: string;
  let user2Id: string;
  let sampleQuestionId: string;
  let user1NoteId: string;

  before(async () => {
    // 1. Create two isolated test users
    const user1 = await prisma.userProfile.create({
      data: {
        clerkId: `test_iso_u1_${Date.now()}`,
        email: `u1_${Date.now()}@crackrr.test`,
        name: 'Isolation Aspirant A',
        username: `iso_a_${Date.now()}`,
        school: 'Crackrr Institute',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.userProfile.create({
      data: {
        clerkId: `test_iso_u2_${Date.now()}`,
        email: `u2_${Date.now()}@crackrr.test`,
        name: 'Isolation Aspirant B',
        username: `iso_b_${Date.now()}`,
        school: 'Crackrr Institute',
        grade: '12',
        stream: 'PCM',
        onboardingCompleted: true,
      },
    });
    user2Id = user2.id;

    // 2. Find sample question
    const q = await prisma.question.findFirst({
      select: { id: true },
    });
    if (!q) throw new Error('No question available in test database');
    sampleQuestionId = q.id;

    // 3. User 1 saves a note
    const note = await saveRevisionNote({
      userId: user1Id,
      questionId: sampleQuestionId,
      userNote: 'User 1 Private Secret Formula',
    });
    user1NoteId = note.id;
  });

  after(async () => {
    // Clean up all test records
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

  test('User 2 cannot list User 1 saved notes', async () => {
    const user2Notes = await getUserRevisionNotes(user2Id);
    assert.strictEqual(user2Notes.length, 0);

    const user1Notes = await getUserRevisionNotes(user1Id);
    assert.strictEqual(user1Notes.length, 1);
    assert.strictEqual(user1Notes[0].id, user1NoteId);
  });

  test('User 2 cannot read User 1 note by ID', async () => {
    const readAttempt = await getRevisionNoteById(user2Id, user1NoteId);
    assert.strictEqual(readAttempt, null);
  });

  test('User 2 cannot modify User 1 note', async () => {
    await assert.rejects(
      async () => {
        await updateRevisionNote(user2Id, user1NoteId, { userNote: 'Hacked!' });
      },
      (err: Error) => {
        assert.ok(err.message.includes('not found or unauthorized'));
        return true;
      }
    );

    // Verify User 1 note is unchanged
    const originalNote = await getRevisionNoteById(user1Id, user1NoteId);
    assert.strictEqual(originalNote?.userNote, 'User 1 Private Secret Formula');
  });

  test('User 2 cannot delete User 1 note', async () => {
    await assert.rejects(
      async () => {
        await deleteRevisionNote(user2Id, user1NoteId);
      },
      (err: Error) => {
        assert.ok(err.message.includes('not found or unauthorized'));
        return true;
      }
    );

    // Note still exists
    const stillExists = await getRevisionNoteById(user1Id, user1NoteId);
    assert.ok(stillExists !== null);
  });

  test('User 2 has isolated revision queue and cannot see User 1 reviews', async () => {
    const queueUser2 = await getUserRevisionQueue(user2Id);
    assert.strictEqual(queueUser2.length, 0);

    // User 1 reviews a concept
    await markConceptReviewed({
      userId: user1Id,
      conceptKey: 'PHYSICS::Kinematics::Projectiles',
      status: RevisionStatus.REVIEWED,
    });

    const user1Records = await prisma.revisionRecord.findMany({ where: { userId: user1Id } });
    const user2Records = await prisma.revisionRecord.findMany({ where: { userId: user2Id } });

    assert.strictEqual(user1Records.length, 1);
    assert.strictEqual(user2Records.length, 0);
  });
});

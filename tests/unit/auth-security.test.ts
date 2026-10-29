import '../test-helper';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setMockAuthUser } from '../test-helper';
import { requireAuthenticatedUser } from '../../lib/server/auth';
import {
  saveNoteAction,
  getUserNotesAction,
  getNoteByIdAction,
  updateNoteAction,
  deleteNoteAction,
  getSavedQuestionIdsAction,
  getNotesSummaryAction,
} from '../../app/actions/notes';
import { markConceptReviewedAction } from '../../app/actions/revision';
import { RevisionStatus } from '@prisma/client';

describe('Authentication & Authorization Gateways — Unit Tests', () => {
  test('AUTH-01: requireAuthenticatedUser rejects unauthenticated calls with UNAUTHORIZED', async () => {
    setMockAuthUser(null);
    await assert.rejects(
      async () => {
        await requireAuthenticatedUser();
      },
      (err: Error) => {
        assert.ok(err.message.includes('UNAUTHORIZED'));
        return true;
      }
    );
  });

  test('AUTH-01: saveNoteAction rejects unauthenticated calls without throwing unhandled error', async () => {
    setMockAuthUser(null);
    const result = await saveNoteAction({
      questionId: 'any-question-id',
      userNote: 'Secret note',
    });
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('UNAUTHORIZED'));
  });

  test('AUTH-01: markConceptReviewedAction rejects unauthenticated calls', async () => {
    setMockAuthUser(null);
    await assert.rejects(
      async () => {
        await markConceptReviewedAction({
          conceptKey: 'PHYSICS::Mechanics::Vectors',
          status: RevisionStatus.REVIEWED,
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('UNAUTHORIZED'));
        return true;
      }
    );
  });

  test('AUTH-01: note retrieval and mutation actions reject unauthenticated calls safely', async () => {
    setMockAuthUser(null);

    const notesRes = await getUserNotesAction();
    assert.strictEqual(notesRes.success, false);
    assert.ok(notesRes.error?.includes('UNAUTHORIZED'));

    const noteByIdRes = await getNoteByIdAction('note-123');
    assert.strictEqual(noteByIdRes.success, false);
    assert.ok(noteByIdRes.error?.includes('UNAUTHORIZED'));

    const updateRes = await updateNoteAction('note-123', { userNote: 'New' });
    assert.strictEqual(updateRes.success, false);
    assert.ok(updateRes.error?.includes('UNAUTHORIZED'));

    const deleteRes = await deleteNoteAction('note-123');
    assert.strictEqual(deleteRes.success, false);
    assert.ok(deleteRes.error?.includes('UNAUTHORIZED'));

    const savedIdsRes = await getSavedQuestionIdsAction();
    assert.strictEqual(savedIdsRes.success, false);
    assert.ok(savedIdsRes.error?.includes('UNAUTHORIZED'));

    const summaryRes = await getNotesSummaryAction();
    assert.strictEqual(summaryRes.success, false);
    assert.ok(summaryRes.error?.includes('UNAUTHORIZED'));
  });
});

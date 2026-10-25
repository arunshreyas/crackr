'use server';

import { requireAuthenticatedUser } from '@/lib/server/auth';
import {
  saveRevisionNote,
  getUserRevisionNotes,
  getRevisionNoteById,
  updateRevisionNote,
  deleteRevisionNote,
  getSavedQuestionIdsForUser,
  getNotesSummary,
  EnrichedRevisionNote,
  RevisionNotesSummary,
  SaveNoteInput,
  UpdateNoteInput,
} from '@/lib/server/notes/service';
import { QuestionSubject } from '@prisma/client';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server action to save a question as a revision note for the current user.
 */
export async function saveNoteAction(
  input: Omit<SaveNoteInput, 'userId'>
): Promise<ActionResponse<EnrichedRevisionNote>> {
  try {
    const authCtx = await requireAuthenticatedUser();
    if (!input.questionId || typeof input.questionId !== 'string') {
      return { success: false, error: 'Invalid question ID' };
    }

    const note = await saveRevisionNote({
      userId: authCtx.profile.id,
      questionId: input.questionId,
      userNote: input.userNote,
      tags: input.tags,
      keyTakeaway: input.keyTakeaway,
    });

    return { success: true, data: note };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save note' };
  }
}

/**
 * Server action to get all saved revision notes for the current user.
 */
export async function getUserNotesAction(filters?: {
  subject?: QuestionSubject | 'ALL';
  conceptKey?: string;
  chapter?: string;
  search?: string;
  weakOnly?: boolean;
  tag?: string;
}): Promise<ActionResponse<EnrichedRevisionNote[]>> {
  try {
    const authCtx = await requireAuthenticatedUser();
    const notes = await getUserRevisionNotes(authCtx.profile.id, filters);
    return { success: true, data: notes };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to retrieve notes' };
  }
}

/**
 * Server action to get a specific revision note by ID.
 */
export async function getNoteByIdAction(
  noteId: string
): Promise<ActionResponse<EnrichedRevisionNote | null>> {
  try {
    const authCtx = await requireAuthenticatedUser();
    const note = await getRevisionNoteById(authCtx.profile.id, noteId);
    return { success: true, data: note };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to retrieve note' };
  }
}

/**
 * Server action to update an existing revision note.
 */
export async function updateNoteAction(
  noteId: string,
  updates: UpdateNoteInput
): Promise<ActionResponse<EnrichedRevisionNote>> {
  try {
    const authCtx = await requireAuthenticatedUser();
    const note = await updateRevisionNote(authCtx.profile.id, noteId, updates);
    return { success: true, data: note };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update note' };
  }
}

/**
 * Server action to delete an existing revision note.
 */
export async function deleteNoteAction(
  noteId: string
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const authCtx = await requireAuthenticatedUser();
    await deleteRevisionNote(authCtx.profile.id, noteId);
    return { success: true, data: { deleted: true } };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete note' };
  }
}

/**
 * Server action to retrieve the set of questionIds saved by the user.
 */
export async function getSavedQuestionIdsAction(): Promise<ActionResponse<string[]>> {
  try {
    const authCtx = await requireAuthenticatedUser();
    const ids = await getSavedQuestionIdsForUser(authCtx.profile.id);
    return { success: true, data: ids };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to get saved questions' };
  }
}

/**
 * Server action to retrieve note metrics & diagnostics summary for dashboard/notes overview.
 */
export async function getNotesSummaryAction(): Promise<ActionResponse<RevisionNotesSummary>> {
  try {
    const authCtx = await requireAuthenticatedUser();
    const summary = await getNotesSummary(authCtx.profile.id);
    return { success: true, data: summary };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to get notes summary' };
  }
}

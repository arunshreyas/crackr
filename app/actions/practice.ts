'use server';

import {
  startPracticeSession,
  submitPracticeAnswer,
  completePracticeSession,
  getActivePracticeSession,
  getActivePracticeSessions,
  getPracticeSessionById,
  abandonPracticeSession,
  StartPracticeResult,
  AnswerSubmissionResult,
  PracticeSessionSummary,
  ActiveSessionState,
  ActiveSessionSummaryItem,
} from '@/lib/server/practice/service';
import { QuestionSubject, OptionLabel } from '@prisma/client';
import { toServerActionError } from '@/lib/server/db/resilience';

export type PracticeActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  retryable?: boolean;
};

export async function getActiveSessionsAction(): Promise<
  PracticeActionResponse<ActiveSessionSummaryItem[]>
> {
  try {
    const data = await getActivePracticeSessions();
    return { success: true, data };
  } catch (err) {
    return toServerActionError(err, 'Failed to load active sessions');
  }
}

export async function getSessionByIdAction(
  sessionId: string
): Promise<PracticeActionResponse<ActiveSessionState | null>> {
  try {
    const data = await getPracticeSessionById(sessionId);
    return { success: true, data };
  } catch (err) {
    return toServerActionError(err, 'Failed to load practice session');
  }
}

export async function getActiveSessionAction(): Promise<
  PracticeActionResponse<ActiveSessionState | null>
> {
  try {
    const data = await getActivePracticeSession();
    return { success: true, data };
  } catch (err) {
    return toServerActionError(err, 'Failed to load active practice session');
  }
}

export async function startPracticeAction(params: {
  subject?: QuestionSubject;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  questionCount?: number;
}): Promise<PracticeActionResponse<StartPracticeResult>> {
  try {
    const data = await startPracticeSession(params);
    return { success: true, data };
  } catch (err) {
    return toServerActionError(err, 'Failed to start practice session');
  }
}

export async function submitAnswerAction(params: {
  sessionId: string;
  questionId: string;
  selectedOption: OptionLabel;
  timeTakenSeconds?: number;
}): Promise<PracticeActionResponse<AnswerSubmissionResult>> {
  try {
    const data = await submitPracticeAnswer(params);
    return { success: true, data };
  } catch (err) {
    return toServerActionError(err, 'Failed to submit practice answer');
  }
}

export async function completeSessionAction(params: {
  sessionId: string;
  durationSeconds: number;
}): Promise<PracticeActionResponse<PracticeSessionSummary>> {
  try {
    const data = await completePracticeSession(params);
    return { success: true, data };
  } catch (err) {
    return toServerActionError(err, 'Failed to complete practice session');
  }
}

export async function abandonSessionAction(params: {
  sessionId: string;
}): Promise<PracticeActionResponse> {
  try {
    await abandonPracticeSession(params);
    return { success: true };
  } catch (err) {
    return toServerActionError(err, 'Failed to abandon practice session');
  }
}

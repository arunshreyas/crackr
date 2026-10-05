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

export async function getActiveSessionsAction(): Promise<{
  success: boolean;
  data?: ActiveSessionSummaryItem[];
  error?: string;
}> {
  try {
    const data = await getActivePracticeSessions();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getSessionByIdAction(sessionId: string): Promise<{
  success: boolean;
  data?: ActiveSessionState | null;
  error?: string;
}> {
  try {
    const data = await getPracticeSessionById(sessionId);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getActiveSessionAction(): Promise<{
  success: boolean;
  data?: ActiveSessionState | null;
  error?: string;
}> {
  try {
    const data = await getActivePracticeSession();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function startPracticeAction(params: {
  subject?: QuestionSubject;
  chapter?: string;
  difficulty?: string;
  questionCount?: number;
}): Promise<{ success: boolean; data?: StartPracticeResult; error?: string }> {
  try {
    const data = await startPracticeSession(params);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function submitAnswerAction(params: {
  sessionId: string;
  questionId: string;
  selectedOption: OptionLabel;
  timeTakenSeconds?: number;
}): Promise<{ success: boolean; data?: AnswerSubmissionResult; error?: string }> {
  try {
    const data = await submitPracticeAnswer(params);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function completeSessionAction(params: {
  sessionId: string;
  durationSeconds: number;
}): Promise<{ success: boolean; data?: PracticeSessionSummary; error?: string }> {
  try {
    const data = await completePracticeSession(params);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function abandonSessionAction(params: {
  sessionId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await abandonPracticeSession(params);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

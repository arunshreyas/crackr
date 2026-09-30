'use server';

import {
  startPracticeSession,
  submitPracticeAnswer,
  completePracticeSession,
  StartPracticeResult,
  AnswerSubmissionResult,
  PracticeSessionSummary,
} from '@/lib/server/practice/service';
import { QuestionSubject, OptionLabel } from '@prisma/client';

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

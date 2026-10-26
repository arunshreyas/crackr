import { QuestionSubject, RevisionStatus, OptionLabel } from '@prisma/client';
import { DiagnosticTag, WeaknessLevel } from '@/lib/server/concepts/analysis';

export { RevisionStatus };

export type RevisionPriorityTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'SCHEDULED_REVIEW';

export interface RevisionIncorrectQuestion {
  id: string;
  questionId: string;
  text: string;
  selectedOption: OptionLabel;
  correctOption: OptionLabel;
  isCorrect: boolean;
  timeTakenSeconds: number | null;
  createdAt: string;
  explanation: string | null;
  difficulty: string | null;
  options: Array<{
    id: string;
    label: OptionLabel;
    text: string;
    position: number;
  }>;
}

export interface RevisionLinkedNote {
  id: string;
  questionId: string;
  userNote: string | null;
  tags: string[];
  keyTakeaway: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionItem {
  conceptKey: string;
  subject: QuestionSubject;
  chapter: string;
  topic: string;
  
  // Diagnostic metrics from Weak Concept Analysis (if attempted)
  weaknessLevel: WeaknessLevel | 'UNCLASSIFIED';
  accuracy: number | null;
  totalAttempts: number;
  incorrectAttempts: number;
  avgTimeSeconds: number | null;
  diagnosticTags: DiagnosticTag[];
  urgencyScore: number;
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  
  // Revision tracking & scheduling
  status: RevisionStatus;
  reviewCount: number;
  lastReviewedAt: string | null;
  nextReviewDue: string | null;
  isDue: boolean;
  notes: string | null;
  lastFeedback: string | null;

  // Prioritization
  priorityScore: number; // 0 - 100
  priorityTier: RevisionPriorityTier;
  priorityReasons: string[];
  recommendedAction: string;

  // Attached context
  incorrectQuestionsCount: number;
  savedNotesCount: number;
  availablePracticeQuestionsCount?: number;
}

export interface RevisionProgressSummary {
  totalQueueItems: number;
  dueTodayCount: number;
  reviewedCount: number;
  needsPracticeCount: number;
  notReviewedCount: number;
  overallMasteryPercent: number;
  revisionStreakDays: number;
  subjectDistribution: Record<QuestionSubject, {
    total: number;
    due: number;
    reviewed: number;
  }>;
}

export interface RevisionDashboardPayload {
  queue: RevisionItem[];
  progress: RevisionProgressSummary;
  recentIncorrectQuestions: RevisionIncorrectQuestion[];
  savedNotesSummary: {
    totalNotes: number;
    notes: RevisionLinkedNote[];
  };
  hasHistory: boolean;
}

export interface MarkReviewedInput {
  userId: string;
  conceptKey: string;
  status: RevisionStatus;
  notes?: string | null;
  feedback?: string | null;
}

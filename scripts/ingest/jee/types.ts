/**
 * ============================================================================
 * CRACKR JEE MAIN INGESTION PIPELINE - TYPE DEFINITIONS
 * ============================================================================
 * 
 * IMPORTANT COPYRIGHT & USAGE NOTICE:
 * The source dataset originates from 'HostServer001/jee_mains_pyqs_data_base',
 * which states its content was reverse-engineered from exam portals.
 * Even though the repository is open-sourced, commercial redistribution
 * and usage rights for the underlying exam question content must be
 * verified and cleared before public/commercial deployment.
 * ============================================================================
 */

export type RawSubject = 'physics' | 'chemistry' | 'mathematics' | string;

export type CanonicalSubject = 'PHYSICS' | 'CHEMISTRY' | 'MATHEMATICS';

export type CanonicalOptionLabel = 'A' | 'B' | 'C' | 'D';

export interface RawOption {
  identifier: string; // 'A', 'B', 'C', 'D' or '1', '2', '3', '4'
  content: string;
}

export interface RawQuestion {
  question_id: string;
  examGroup?: string;
  exam?: string;
  subject: RawSubject;
  chapterGroup?: string;
  chapter: string;
  year?: number;
  paperTitle?: string;
  difficulty?: string;
  topic?: string;
  type: string; // 'mcq', 'integer', 'mcqm'
  examDate?: string | null;
  answer?: string | null;
  question: string;
  options: RawOption[];
  correct_options: string[];
  explanation?: string;
  isOutOfSyllabus?: boolean;
  isBonus?: boolean;
  isImgQuestion?: boolean;
  isImgExplanation?: boolean;
  isImgOption?: boolean[];
}

export interface NormalizedOption {
  label: CanonicalOptionLabel;
  text: string;
  position: number; // 1, 2, 3, 4
}

export interface NormalizedQuestion {
  externalId: string;
  contentHash: string;
  text: string;
  subject: CanonicalSubject;
  chapter: string;
  topic: string | null;
  year: number | null;
  paperTitle: string | null;
  difficulty: string | null;
  type: 'MCQ';
  correctOption: CanonicalOptionLabel;
  explanation: string | null;
  source: string;
  options: NormalizedOption[];
}

export type RejectionReason =
  | 'MISSING_QUESTION_ID'
  | 'NOT_MCQ'
  | 'MISSING_QUESTION_TEXT'
  | 'INVALID_OPTION_COUNT'
  | 'EMPTY_OPTION_TEXT'
  | 'IMAGE_QUESTION'
  | 'IMAGE_OPTION'
  | 'MISSING_ANSWER'
  | 'INVALID_ANSWER'
  | 'UNRECOGNIZED_SUBJECT'
  | 'DUPLICATE_CONTENT'
  | 'EMBEDDING_FAILURE'
  | 'DATABASE_ERROR';

export interface RejectedQuestionRecord {
  externalId: string;
  reason: RejectionReason;
  subject?: string;
  chapter?: string;
  topic?: string;
  year?: number;
  diagnostic?: string;
}

export interface IngestionStatistics {
  sourceQuestionsCount: number;
  mcqsDetectedCount: number;
  importedCount: number;
  rejectedCount: number;
  rejectionBreakdown: Record<RejectionReason, number>;
  postgresRecordsCount: number;
  vectorRecordsCount: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

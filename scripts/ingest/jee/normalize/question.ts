import {
  RawQuestion,
  NormalizedQuestion,
  NormalizedOption,
  CanonicalSubject,
  CanonicalOptionLabel,
} from '../types';
import { cleanText } from './text';

const SUBJECT_MAP: Record<string, CanonicalSubject> = {
  physics: 'PHYSICS',
  chemistry: 'CHEMISTRY',
  mathematics: 'MATHEMATICS',
  maths: 'MATHEMATICS',
  math: 'MATHEMATICS',
};

const OPTION_IDENTIFIERS: CanonicalOptionLabel[] = ['A', 'B', 'C', 'D'];

/**
 * Normalizes chapter and topic slugs into clean, title-cased names.
 */
export function formatTitle(slug: string | null | undefined): string {
  if (!slug) return '';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalizes option identifier to canonical A, B, C, D.
 * Handles 'A' | 'B' | 'C' | 'D' or '1' | '2' | '3' | '4'.
 */
export function normalizeOptionLabel(
  identifier: string | number,
  fallbackIndex: number
): CanonicalOptionLabel | null {
  const str = String(identifier).trim().toUpperCase();
  if (str === 'A' || str === '1') return 'A';
  if (str === 'B' || str === '2') return 'B';
  if (str === 'C' || str === '3') return 'C';
  if (str === 'D' || str === '4') return 'D';

  if (fallbackIndex >= 0 && fallbackIndex < OPTION_IDENTIFIERS.length) {
    return OPTION_IDENTIFIERS[fallbackIndex];
  }
  return null;
}

/**
 * Normalizes raw question fields into canonical Crackr question structure.
 */
export function normalizeQuestion(
  raw: RawQuestion,
  contentHash: string
): NormalizedQuestion {
  const rawSubject = (raw.subject || '').trim().toLowerCase();
  const subject: CanonicalSubject = SUBJECT_MAP[rawSubject] || 'MATHEMATICS';

  // Normalize options
  const normalizedOptions: NormalizedOption[] = (raw.options || []).map((opt, idx) => {
    const label = normalizeOptionLabel(opt.identifier, idx) || OPTION_IDENTIFIERS[idx];
    return {
      label,
      text: cleanText(opt.content),
      position: idx + 1,
    };
  });

  // Normalize correct option
  const rawCorrect = raw.correct_options?.[0] || '';
  const correctOption =
    normalizeOptionLabel(rawCorrect, -1) ||
    (rawCorrect.toUpperCase() as CanonicalOptionLabel);

  return {
    externalId: raw.question_id.trim(),
    contentHash,
    text: cleanText(raw.question),
    subject,
    chapter: formatTitle(raw.chapter) || raw.chapter.trim(),
    topic: raw.topic ? formatTitle(raw.topic) : null,
    year: raw.year && Number(raw.year) > 1900 ? Number(raw.year) : null,
    paperTitle: raw.paperTitle ? raw.paperTitle.trim() : null,
    difficulty: raw.difficulty ? raw.difficulty.trim().toUpperCase() : 'MEDIUM',
    type: 'MCQ',
    correctOption,
    explanation: raw.explanation ? cleanText(raw.explanation) : null,
    source: 'jee_mains_pyqs_data_base',
    options: normalizedOptions,
  };
}

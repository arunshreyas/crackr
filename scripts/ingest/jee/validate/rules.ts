import { RawQuestion, RejectionReason } from '../types';

export interface ValidationResult {
  isValid: boolean;
  reason?: RejectionReason;
  diagnostic?: string;
}

// Comprehensive regex to detect any embedded, markdown, html, url, svg, or latex images
export const IMAGE_PATTERN =
  /(<img\b[^>]*>|!\[.*?\]\(.*?\)|https?:\/\/\S+\.(?:png|jpg|jpeg|gif|svg|webp)|\.svg|\.png|\.jpg|\\includegraphics|<svg\b[^>]*>|data:image\/)/i;

const VALID_SUBJECTS = new Set([
  'physics',
  'chemistry',
  'mathematics',
  'maths',
  'math',
]);

const VALID_ANSWER_LABELS = new Set(['A', 'B', 'C', 'D', '1', '2', '3', '4']);

/**
 * Validates a raw question against Crackr V1 MCQ standards.
 */
export function validateQuestion(raw: RawQuestion): ValidationResult {
  // 1. Check Question ID
  if (!raw.question_id || typeof raw.question_id !== 'string' || !raw.question_id.trim()) {
    return {
      isValid: false,
      reason: 'MISSING_QUESTION_ID',
      diagnostic: 'Question ID is empty or undefined',
    };
  }

  // 2. Check Question Type (must be MCQ)
  const qType = (raw.type || '').trim().toLowerCase();
  if (qType !== 'mcq') {
    return {
      isValid: false,
      reason: 'NOT_MCQ',
      diagnostic: `Question type is '${raw.type}', expected 'mcq'`,
    };
  }

  // 3. Check Subject
  const subject = (raw.subject || '').trim().toLowerCase();
  if (!VALID_SUBJECTS.has(subject)) {
    return {
      isValid: false,
      reason: 'UNRECOGNIZED_SUBJECT',
      diagnostic: `Unrecognized subject: '${raw.subject}'`,
    };
  }

  // 4. Check Question Text
  const qText = raw.question || '';
  if (!qText.trim()) {
    return {
      isValid: false,
      reason: 'MISSING_QUESTION_TEXT',
      diagnostic: 'Question text is empty',
    };
  }

  // 5. Check Image in Question Text
  if (raw.isImgQuestion || IMAGE_PATTERN.test(qText)) {
    return {
      isValid: false,
      reason: 'IMAGE_QUESTION',
      diagnostic: 'Question statement contains image markup or relies on external diagram',
    };
  }

  // 6. Check Option Count (Must be exactly 4)
  const options = raw.options || [];
  if (!Array.isArray(options) || options.length !== 4) {
    return {
      isValid: false,
      reason: 'INVALID_OPTION_COUNT',
      diagnostic: `Expected 4 options, found ${Array.isArray(options) ? options.length : 0}`,
    };
  }

  // 7. Check Options for Content and Images
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const optContent = (opt?.content || '').trim();

    if (!optContent) {
      return {
        isValid: false,
        reason: 'EMPTY_OPTION_TEXT',
        diagnostic: `Option index ${i} is empty`,
      };
    }

    const hasImgFlag = Array.isArray(raw.isImgOption) && raw.isImgOption[i] === true;
    if (hasImgFlag || IMAGE_PATTERN.test(optContent)) {
      return {
        isValid: false,
        reason: 'IMAGE_OPTION',
        diagnostic: `Option ${opt.identifier || i} contains image markup or external URL`,
      };
    }
  }

  // 8. Check Correct Answer
  const correctOptions = raw.correct_options || [];
  if (!Array.isArray(correctOptions) || correctOptions.length !== 1) {
    return {
      isValid: false,
      reason: 'MISSING_ANSWER',
      diagnostic: `Expected exactly 1 correct option, found ${correctOptions.length} (bonus or missing)`,
    };
  }

  const rawAnswer = String(correctOptions[0]).trim().toUpperCase();
  if (!VALID_ANSWER_LABELS.has(rawAnswer)) {
    return {
      isValid: false,
      reason: 'INVALID_ANSWER',
      diagnostic: `Invalid correct option value: '${rawAnswer}'`,
    };
  }

  return { isValid: true };
}

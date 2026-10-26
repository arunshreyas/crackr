import { RevisionStatus } from '@prisma/client';

export const REVISION_INTERVALS_DAYS = {
  NEEDS_PRACTICE: 1,
  REVIEW_1: 3,
  REVIEW_2: 7,
  REVIEW_3: 14,
  REVIEW_4_PLUS: 30,
} as const;

/**
 * Deterministically computes the next review due date based on review status and prior review count.
 * Implements an explainable, testable spaced-repetition algorithm.
 */
export function calculateNextReviewDue(
  status: RevisionStatus,
  reviewCount: number,
  baseDate: Date = new Date()
): Date {
  const result = new Date(baseDate.getTime());

  if (status === RevisionStatus.NEEDS_PRACTICE) {
    result.setDate(result.getDate() + REVISION_INTERVALS_DAYS.NEEDS_PRACTICE);
    return result;
  }

  if (status === RevisionStatus.REVIEWED) {
    let daysToAdd: number = REVISION_INTERVALS_DAYS.REVIEW_1;
    if (reviewCount === 2) {
      daysToAdd = REVISION_INTERVALS_DAYS.REVIEW_2;
    } else if (reviewCount === 3) {
      daysToAdd = REVISION_INTERVALS_DAYS.REVIEW_3;
    } else if (reviewCount >= 4) {
      daysToAdd = REVISION_INTERVALS_DAYS.REVIEW_4_PLUS;
    }

    result.setDate(result.getDate() + daysToAdd);
    return result;
  }

  // NOT_REVIEWED or fallback: due immediately
  return result;
}

/**
 * Determines whether a revision item is currently due for review against a reference timestamp.
 * A concept is only due if the scheduling logic and timestamps objectively support that conclusion.
 */
export function isItemDueForReview(
  nextReviewDue: Date | string | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  if (!nextReviewDue) {
    // If not scheduled, it has never been reviewed, so it is due
    return true;
  }

  const dueDate = nextReviewDue instanceof Date ? nextReviewDue : new Date(nextReviewDue);
  if (isNaN(dueDate.getTime())) {
    return true;
  }

  return dueDate.getTime() <= referenceDate.getTime();
}

/**
 * Returns a human-friendly string indicating when an item is or was due.
 */
export function formatDueIntervalLabel(
  nextReviewDue: Date | string | null | undefined,
  referenceDate: Date = new Date()
): string {
  if (!nextReviewDue) {
    return 'Due now';
  }

  const dueDate = nextReviewDue instanceof Date ? nextReviewDue : new Date(nextReviewDue);
  if (isNaN(dueDate.getTime())) {
    return 'Due now';
  }

  const diffMs = dueDate.getTime() - referenceDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    if (diffDays === 0) return 'Due today';
    return `Overdue by ${Math.abs(diffDays)}d`;
  }

  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays}d`;
}

import '../test-helper';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RevisionStatus } from '@prisma/client';
import {
  calculateNextReviewDue,
  isItemDueForReview,
  formatDueIntervalLabel,
  REVISION_INTERVALS_DAYS,
} from '../../lib/server/revision/scheduling';

describe('Smart Revision Scheduling — Unit Tests', () => {
  describe('Deterministic Spaced Repetition Due Dates', () => {
    const baseDate = new Date('2026-10-28T12:00:00.000Z');

    test('NEEDS_PRACTICE status schedules next review for +1 day', () => {
      const nextDue = calculateNextReviewDue(RevisionStatus.NEEDS_PRACTICE, 1, baseDate);
      const expected = new Date('2026-10-29T12:00:00.000Z');
      assert.strictEqual(nextDue.toISOString(), expected.toISOString());
      assert.strictEqual(REVISION_INTERVALS_DAYS.NEEDS_PRACTICE, 1);
    });

    test('REVIEWED status cycle 1 schedules next review for +3 days', () => {
      const nextDue = calculateNextReviewDue(RevisionStatus.REVIEWED, 1, baseDate);
      const expected = new Date('2026-10-31T12:00:00.000Z');
      assert.strictEqual(nextDue.toISOString(), expected.toISOString());
      assert.strictEqual(REVISION_INTERVALS_DAYS.REVIEW_1, 3);
    });

    test('REVIEWED status cycle 2 schedules next review for +7 days', () => {
      const nextDue = calculateNextReviewDue(RevisionStatus.REVIEWED, 2, baseDate);
      const expected = new Date('2026-11-04T12:00:00.000Z');
      assert.strictEqual(nextDue.toISOString(), expected.toISOString());
      assert.strictEqual(REVISION_INTERVALS_DAYS.REVIEW_2, 7);
    });

    test('REVIEWED status cycle 3 schedules next review for +14 days', () => {
      const nextDue = calculateNextReviewDue(RevisionStatus.REVIEWED, 3, baseDate);
      const expected = new Date('2026-11-11T12:00:00.000Z');
      assert.strictEqual(nextDue.toISOString(), expected.toISOString());
      assert.strictEqual(REVISION_INTERVALS_DAYS.REVIEW_3, 14);
    });

    test('REVIEWED status cycle 4 and above schedules next review for +30 days', () => {
      const nextDue4 = calculateNextReviewDue(RevisionStatus.REVIEWED, 4, baseDate);
      const expected4 = new Date('2026-11-27T12:00:00.000Z');
      assert.strictEqual(nextDue4.toISOString(), expected4.toISOString());

      const nextDue10 = calculateNextReviewDue(RevisionStatus.REVIEWED, 10, baseDate);
      assert.strictEqual(nextDue10.toISOString(), expected4.toISOString());
      assert.strictEqual(REVISION_INTERVALS_DAYS.REVIEW_4_PLUS, 30);
    });

    test('NOT_REVIEWED status returns immediate date', () => {
      const nextDue = calculateNextReviewDue(RevisionStatus.NOT_REVIEWED, 0, baseDate);
      assert.strictEqual(nextDue.toISOString(), baseDate.toISOString());
    });
  });

  describe('isItemDueForReview Logic', () => {
    const referenceNow = new Date('2026-10-28T12:00:00.000Z');

    test('returns true when nextReviewDue is null or undefined (unreviewed)', () => {
      assert.strictEqual(isItemDueForReview(null, referenceNow), true);
      assert.strictEqual(isItemDueForReview(undefined, referenceNow), true);
    });

    test('returns true for past due dates (overdue)', () => {
      const pastDate = new Date('2026-10-27T12:00:00.000Z');
      assert.strictEqual(isItemDueForReview(pastDate, referenceNow), true);
    });

    test('returns true for exact current timestamp', () => {
      assert.strictEqual(isItemDueForReview(referenceNow, referenceNow), true);
    });

    test('returns false for future scheduled dates', () => {
      const futureDate = new Date('2026-10-29T12:00:00.000Z');
      assert.strictEqual(isItemDueForReview(futureDate, referenceNow), false);
    });

    test('handles ISO string input safely', () => {
      assert.strictEqual(isItemDueForReview('2026-10-25T00:00:00Z', referenceNow), true);
      assert.strictEqual(isItemDueForReview('2026-10-30T00:00:00Z', referenceNow), false);
    });

    test('handles invalid date strings gracefully without throwing', () => {
      assert.strictEqual(isItemDueForReview('invalid-date', referenceNow), true);
    });
  });

  describe('formatDueIntervalLabel Formatting', () => {
    const referenceNow = new Date('2026-10-28T12:00:00.000Z');

    test('returns "Due now" for null/undefined/invalid date', () => {
      assert.strictEqual(formatDueIntervalLabel(null, referenceNow), 'Due now');
      assert.strictEqual(formatDueIntervalLabel(undefined, referenceNow), 'Due now');
      assert.strictEqual(formatDueIntervalLabel('invalid', referenceNow), 'Due now');
    });

    test('returns "Due today" when due date is today', () => {
      assert.strictEqual(formatDueIntervalLabel(new Date('2026-10-28T14:00:00Z'), referenceNow), 'Due today');
    });

    test('returns "Overdue by Nd" for past days', () => {
      const overdue3d = new Date('2026-10-25T12:00:00Z');
      assert.strictEqual(formatDueIntervalLabel(overdue3d, referenceNow), 'Overdue by 3d');
    });

    test('returns "Due tomorrow" for 1 day in future', () => {
      const tomorrow = new Date('2026-10-29T12:00:00Z');
      assert.strictEqual(formatDueIntervalLabel(tomorrow, referenceNow), 'Due tomorrow');
    });

    test('returns "Due in Nd" for multiple days in future', () => {
      const in7d = new Date('2026-11-04T12:00:00Z');
      assert.strictEqual(formatDueIntervalLabel(in7d, referenceNow), 'Due in 7d');
    });
  });
});

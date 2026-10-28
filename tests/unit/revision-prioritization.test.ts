import '../test-helper';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RevisionStatus } from '@prisma/client';
import {
  calculateRevisionPriority,
  PrioritizationInput,
} from '../../lib/server/revision/prioritization';

describe('Smart Revision Prioritization — Unit Tests', () => {
  function createInput(overrides: Partial<PrioritizationInput>): PrioritizationInput {
    return {
      weaknessLevel: 'UNCLASSIFIED',
      accuracy: null,
      totalAttempts: 0,
      incorrectAttempts: 0,
      trend: 'STABLE',
      diagnosticTags: [],
      status: RevisionStatus.NOT_REVIEWED,
      reviewCount: 0,
      lastReviewedAt: null,
      nextReviewDue: null,
      savedNotesCount: 0,
      now: new Date('2026-10-28T12:00:00.000Z'),
      ...overrides,
    };
  }

  test('prioritizes critical weakness with high missed question count as CRITICAL tier', () => {
    const input = createInput({
      weaknessLevel: 'CRITICAL_WEAKNESS',
      accuracy: 25,
      totalAttempts: 4,
      incorrectAttempts: 3,
      diagnosticTags: ['CONCEPT_GAP'],
      status: RevisionStatus.NOT_REVIEWED,
    });

    const result = calculateRevisionPriority(input);
    // Base: 45 (CRITICAL) + 12 (3 incorrect) + 10 (CONCEPT_GAP) + 15 (NOT_REVIEWED) = 82
    assert.strictEqual(result.priorityScore, 82);
    assert.strictEqual(result.priorityTier, 'CRITICAL');
    assert.ok(result.priorityReasons.some((r) => r.includes('Critical weakness identified')));
    assert.ok(result.priorityReasons.some((r) => r.includes('3 missed practice questions')));
    assert.ok(result.priorityReasons.some((r) => r.includes('Fundamental theorem')));
  });

  test('applies cooling-off penalty for concepts reviewed within last 24 hours', () => {
    const now = new Date('2026-10-28T12:00:00.000Z');
    const input = createInput({
      weaknessLevel: 'DEVELOPING',
      accuracy: 70,
      totalAttempts: 5,
      incorrectAttempts: 1,
      trend: 'IMPROVING',
      status: RevisionStatus.REVIEWED,
      reviewCount: 1,
      lastReviewedAt: new Date('2026-10-28T10:00:00.000Z'), // 2 hours ago
      nextReviewDue: new Date('2026-10-31T10:00:00.000Z'), // future
      now,
    });

    const result = calculateRevisionPriority(input);
    // Base: 15 (DEVELOPING) + 6 (1 inc) - 10 (IMPROVING) - 30 (cooling off < 24h) = -19 -> clamped to 0
    assert.strictEqual(result.priorityScore, 0);
    assert.strictEqual(result.priorityTier, 'SCHEDULED_REVIEW');
    assert.ok(result.priorityReasons.some((r) => r.includes('Reviewed within the last 24 hours')));
  });

  test('boosts score for spaced repetition item that is currently due', () => {
    const now = new Date('2026-10-28T12:00:00.000Z');
    const input = createInput({
      weaknessLevel: 'DEVELOPING',
      accuracy: 65,
      totalAttempts: 4,
      incorrectAttempts: 1,
      status: RevisionStatus.REVIEWED,
      reviewCount: 2,
      lastReviewedAt: new Date('2026-10-20T12:00:00.000Z'),
      nextReviewDue: new Date('2026-10-27T12:00:00.000Z'), // overdue by 1 day
      now,
    });

    const result = calculateRevisionPriority(input);
    // Base: 15 (DEVELOPING) + 6 (1 inc) + 25 (isDue REVIEWED) = 46
    assert.strictEqual(result.priorityScore, 46);
    assert.strictEqual(result.priorityTier, 'MEDIUM');
    assert.ok(result.priorityReasons.some((r) => r.includes('Spaced repetition review is now due')));
  });

  test('prioritizes items marked NEEDS_PRACTICE with elevated urgency', () => {
    const input = createInput({
      weaknessLevel: 'NEEDS_ATTENTION',
      accuracy: 50,
      totalAttempts: 4,
      incorrectAttempts: 2,
      status: RevisionStatus.NEEDS_PRACTICE,
      reviewCount: 1,
    });

    const result = calculateRevisionPriority(input);
    // Base: 30 (NEEDS_ATTENTION) + 12 (2 inc) + 25 (NEEDS_PRACTICE) = 67
    assert.strictEqual(result.priorityScore, 67);
    assert.strictEqual(result.priorityTier, 'HIGH');
    assert.ok(result.priorityReasons.some((r) => r.includes('Needs More Practice')));
  });

  test('awards bonus for saved revision notes', () => {
    const inputWithoutNotes = createInput({
      weaknessLevel: 'NEEDS_ATTENTION',
      incorrectAttempts: 0,
      savedNotesCount: 0,
    });
    const inputWithNotes = createInput({
      weaknessLevel: 'NEEDS_ATTENTION',
      incorrectAttempts: 0,
      savedNotesCount: 2,
    });

    const withoutNotes = calculateRevisionPriority(inputWithoutNotes);
    const withNotes = calculateRevisionPriority(inputWithNotes);

    assert.strictEqual(withNotes.priorityScore - withoutNotes.priorityScore, 5);
    assert.ok(withNotes.priorityReasons.some((r) => r.includes('2 personal revision notes saved')));
  });

  test('declining trend increases priority while improving trend decreases priority', () => {
    const base = createInput({
      weaknessLevel: 'DEVELOPING',
      incorrectAttempts: 2,
    });

    const stable = calculateRevisionPriority({ ...base, trend: 'STABLE' });
    const declining = calculateRevisionPriority({ ...base, trend: 'DECLINING' });
    const improving = calculateRevisionPriority({ ...base, trend: 'IMPROVING' });

    assert.strictEqual(declining.priorityScore - stable.priorityScore, 10);
    assert.strictEqual(stable.priorityScore - improving.priorityScore, 10);
  });

  test('priority score is strictly clamped between 0 and 100', () => {
    const superCritical = createInput({
      weaknessLevel: 'CRITICAL_WEAKNESS',
      incorrectAttempts: 10,
      diagnosticTags: ['CONCEPT_GAP', 'TIME_TRAP', 'CARELESS_RUSH'],
      trend: 'DECLINING',
      status: RevisionStatus.NEEDS_PRACTICE,
      savedNotesCount: 5,
    });
    const maxResult = calculateRevisionPriority(superCritical);
    assert.strictEqual(maxResult.priorityScore, 100);

    const superLow = createInput({
      weaknessLevel: 'MASTERED',
      incorrectAttempts: 0,
      trend: 'IMPROVING',
      status: RevisionStatus.REVIEWED,
      lastReviewedAt: new Date('2026-10-28T11:50:00.000Z'),
      nextReviewDue: new Date('2026-11-20T12:00:00.000Z'),
    });
    const minResult = calculateRevisionPriority(superLow);
    assert.strictEqual(minResult.priorityScore, 0);
  });
});

import { RevisionStatus } from '@prisma/client';
import { DiagnosticTag, WeaknessLevel } from '@/lib/server/concepts/analysis';
import { RevisionPriorityTier } from './types';
import { isItemDueForReview } from './scheduling';

export interface PrioritizationInput {
  weaknessLevel: WeaknessLevel | 'UNCLASSIFIED';
  accuracy: number | null;
  totalAttempts: number;
  incorrectAttempts: number;
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  diagnosticTags: DiagnosticTag[];
  status: RevisionStatus;
  reviewCount: number;
  lastReviewedAt: Date | string | null;
  nextReviewDue: Date | string | null;
  savedNotesCount: number;
  now?: Date;
}

export interface PrioritizationOutput {
  priorityScore: number;
  priorityTier: RevisionPriorityTier;
  priorityReasons: string[];
  recommendedAction: string;
}

/**
 * Deterministic, explainable prioritisation logic for revision items.
 * Evaluates performance history, weakness diagnostics, review status, and spaced repetition.
 */
export function calculateRevisionPriority(input: PrioritizationInput): PrioritizationOutput {
  const {
    weaknessLevel,
    accuracy,
    totalAttempts,
    incorrectAttempts,
    trend,
    diagnosticTags,
    status,
    reviewCount,
    lastReviewedAt,
    nextReviewDue,
    savedNotesCount,
    now = new Date(),
  } = input;

  let score = 0;
  const reasons: string[] = [];

  // 1. Weakness Level Base Score
  switch (weaknessLevel) {
    case 'CRITICAL_WEAKNESS':
      score += 45;
      reasons.push(
        accuracy !== null
          ? `Critical weakness identified (${accuracy}% accuracy across ${totalAttempts} attempts)`
          : 'Critical conceptual weakness identified in recent practice'
      );
      break;
    case 'NEEDS_ATTENTION':
      score += 30;
      reasons.push(
        accuracy !== null
          ? `Concept needs attention (${accuracy}% accuracy)`
          : 'Concept performance requires reinforcement'
      );
      break;
    case 'DEVELOPING':
      score += 15;
      reasons.push('Developing concept requiring periodic review for mastery');
      break;
    case 'INSUFFICIENT_DATA':
    case 'UNCLASSIFIED':
      if (incorrectAttempts > 0) {
        score += 20;
        reasons.push(`${incorrectAttempts} incorrect answer${incorrectAttempts > 1 ? 's' : ''} in practice`);
      } else {
        score += 10;
        reasons.push('Baseline calibration required');
      }
      break;
    case 'MASTERED':
      score += 0;
      break;
  }

  // 2. Incorrect Attempts Volume
  if (incorrectAttempts >= 4) {
    score += 20;
    if (weaknessLevel !== 'UNCLASSIFIED') {
      reasons.push(`High error frequency: ${incorrectAttempts} missed questions`);
    }
  } else if (incorrectAttempts >= 2) {
    score += 12;
    if (weaknessLevel !== 'UNCLASSIFIED') {
      reasons.push(`${incorrectAttempts} missed practice questions`);
    }
  } else if (incorrectAttempts === 1) {
    score += 6;
  }

  // 3. Diagnostic Root-Cause Tags
  if (diagnosticTags.includes('CONCEPT_GAP')) {
    score += 10;
    reasons.push('Fundamental theorem or conceptual gap detected');
  }
  if (diagnosticTags.includes('TIME_TRAP')) {
    score += 5;
    reasons.push('Pacing friction (>110s average response time)');
  }
  if (diagnosticTags.includes('CARELESS_RUSH')) {
    score += 5;
    reasons.push('Rushed mistakes (<15s) flagged');
  }

  // 4. Trend: Improvement vs Decline
  if (trend === 'DECLINING') {
    score += 10;
    reasons.push('Recent performance trend is declining');
  } else if (trend === 'IMPROVING') {
    score -= 10;
    reasons.push('Demonstrating recent improvement in practice (+15% trend)');
  }

  // 5. Spaced Repetition Scheduling & Review Status
  const isDue = isItemDueForReview(nextReviewDue, now);

  if (status === RevisionStatus.NEEDS_PRACTICE) {
    score += 25;
    reasons.push('Flagged as "Needs More Practice" during previous review');
  } else if (status === RevisionStatus.NOT_REVIEWED) {
    score += 15;
    reasons.push('Not yet reviewed in current revision cycle');
  } else if (status === RevisionStatus.REVIEWED) {
    if (isDue) {
      score += 25;
      reasons.push(
        reviewCount > 0
          ? `Spaced repetition review is now due (cycle #${reviewCount + 1})`
          : 'Scheduled review interval has arrived'
      );
    } else {
      // Cooling-off period: student reviewed recently and is not yet due
      const lastReviewedDate = lastReviewedAt ? new Date(lastReviewedAt) : null;
      if (lastReviewedDate && !isNaN(lastReviewedDate.getTime())) {
        const hoursSinceReview = (now.getTime() - lastReviewedDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceReview < 24) {
          score -= 30;
          reasons.push('Reviewed within the last 24 hours');
        } else {
          score -= 15;
        }
      }
    }
  }

  // 6. User Saved Revision Notes Bonus
  if (savedNotesCount > 0) {
    score += 5;
    reasons.push(`${savedNotesCount} personal revision note${savedNotesCount > 1 ? 's' : ''} saved`);
  }

  // Bound score between 0 and 100
  const priorityScore = Math.max(0, Math.min(100, Math.round(score)));

  // Determine Tier
  let priorityTier: RevisionPriorityTier = 'MEDIUM';
  if (priorityScore >= 70) {
    priorityTier = 'CRITICAL';
  } else if (priorityScore >= 50) {
    priorityTier = 'HIGH';
  } else if (priorityScore >= 30) {
    priorityTier = 'MEDIUM';
  } else {
    priorityTier = 'SCHEDULED_REVIEW';
  }

  // Recommended Action
  let recommendedAction = 'Review concept notes and solve 5 practice questions.';
  if (status === RevisionStatus.NEEDS_PRACTICE) {
    recommendedAction = 'Reinforce fundamental formulas and re-attempt missed questions.';
  } else if (weaknessLevel === 'CRITICAL_WEAKNESS') {
    recommendedAction = diagnosticTags.includes('CONCEPT_GAP')
      ? 'Study worked solution steps carefully, then solve 5 foundational problems.'
      : 'Drill 10 targeted problems to correct high error rate.';
  } else if (diagnosticTags.includes('TIME_TRAP')) {
    recommendedAction = 'Focus on speed shortcuts and formula recall.';
  } else if (isDue && status === RevisionStatus.REVIEWED) {
    recommendedAction = 'Spaced retention check: review key takeaways to reinforce memory.';
  } else if (priorityTier === 'SCHEDULED_REVIEW') {
    recommendedAction = 'Maintain retention with regular spaced checkups.';
  }

  return {
    priorityScore,
    priorityTier,
    priorityReasons: reasons,
    recommendedAction,
  };
}

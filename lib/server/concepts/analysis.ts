import 'server-only';
import { QuestionSubject } from '@prisma/client';
import { ConceptAttemptGroup, getUserConceptAttempts } from './attempts';

export type WeaknessLevel =
  | 'CRITICAL_WEAKNESS'
  | 'NEEDS_ATTENTION'
  | 'DEVELOPING'
  | 'MASTERED'
  | 'INSUFFICIENT_DATA';

export type ConceptTrend = 'IMPROVING' | 'DECLINING' | 'STABLE';

export type DiagnosticTag =
  | 'CONCEPT_GAP'
  | 'TIME_TRAP'
  | 'CARELESS_RUSH'
  | 'DIFFICULTY_CEILING';

export interface AnalyzedConcept {
  conceptKey: string;
  subject: QuestionSubject;
  chapter: string;
  topic: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  avgTimeSeconds: number;
  masteryScore: number; // 0 to 100
  urgencyScore: number; // 0 to 100, highest = most critical to practice next
  weaknessLevel: WeaknessLevel;
  trend: ConceptTrend;
  diagnosticTags: DiagnosticTag[];
  difficultyStats: ConceptAttemptGroup['difficultyStats'];
  lastAttemptedAt: string;
  recommendedAction: string;
}

export interface UserConceptDiagnosticsSummary {
  totalConceptsAttempted: number;
  criticalCount: number;
  needsAttentionCount: number;
  developingCount: number;
  masteredCount: number;
  insufficientDataCount: number;
  overallHealthScore: number; // 0 to 100
  topWeakConcepts: AnalyzedConcept[]; // Top priority items needing review
  conceptsBySubject: Record<QuestionSubject, AnalyzedConcept[]>;
}

/**
 * Evaluates performance metrics and classifies an individual concept attempt group.
 */
export function analyzeConceptPerformance(group: ConceptAttemptGroup): AnalyzedConcept {
  const { totalAttempts, correctAttempts, accuracy, avgTimeSeconds, recentAttempts, difficultyStats } = group;

  // 1. Recency & Trend analysis
  let trend: ConceptTrend = 'STABLE';
  if (recentAttempts.length >= 3 && totalAttempts >= 4) {
    const recentCorrect = recentAttempts.filter(Boolean).length;
    const recentAcc = Math.round((recentCorrect / recentAttempts.length) * 100);
    if (recentAcc >= accuracy + 15) {
      trend = 'IMPROVING';
    } else if (recentAcc <= accuracy - 15) {
      trend = 'DECLINING';
    }
  }

  // 2. Diagnostic Root-Cause Tags
  const diagnosticTags: DiagnosticTag[] = [];

  // CONCEPT_GAP: low accuracy on fundamental/medium questions
  const easyOrMedAttempts = difficultyStats.EASY.total + difficultyStats.MEDIUM.total;
  const easyOrMedCorrect = difficultyStats.EASY.correct + difficultyStats.MEDIUM.correct;
  if (easyOrMedAttempts >= 2 && Math.round((easyOrMedCorrect / easyOrMedAttempts) * 100) < 50) {
    diagnosticTags.push('CONCEPT_GAP');
  }

  // TIME_TRAP: avg time > 120s or multiple slow struggles
  if (avgTimeSeconds >= 110 || group.slowAttemptCount >= 2) {
    diagnosticTags.push('TIME_TRAP');
  }

  // CARELESS_RUSH: answered wrong very fast (<15s)
  if (group.fastIncorrectCount >= 2 || (group.fastIncorrectCount >= 1 && totalAttempts <= 3 && !recentAttempts[recentAttempts.length - 1])) {
    diagnosticTags.push('CARELESS_RUSH');
  }

  // DIFFICULTY_CEILING: good on easy (>=75%) but drops on medium/hard (<40%)
  if (
    difficultyStats.EASY.total >= 2 &&
    (difficultyStats.EASY.accuracy ?? 0) >= 75 &&
    difficultyStats.MEDIUM.total >= 2 &&
    (difficultyStats.MEDIUM.accuracy ?? 0) <= 40
  ) {
    diagnosticTags.push('DIFFICULTY_CEILING');
  }

  // 3. Weakness Level Classification
  let weaknessLevel: WeaknessLevel = 'INSUFFICIENT_DATA';

  if (totalAttempts < 2) {
    weaknessLevel = 'INSUFFICIENT_DATA';
  } else if (totalAttempts === 2 && accuracy === 50) {
    weaknessLevel = 'INSUFFICIENT_DATA';
  } else if ((totalAttempts >= 3 && accuracy < 45) || (totalAttempts >= 2 && accuracy === 0)) {
    weaknessLevel = 'CRITICAL_WEAKNESS';
  } else if (accuracy >= 45 && accuracy < 60) {
    weaknessLevel = 'NEEDS_ATTENTION';
  } else if (accuracy >= 60 && accuracy < 75) {
    if (diagnosticTags.includes('TIME_TRAP') || trend === 'DECLINING') {
      weaknessLevel = 'NEEDS_ATTENTION';
    } else {
      weaknessLevel = 'DEVELOPING';
    }
  } else if (accuracy >= 75) {
    if (totalAttempts >= 3) {
      weaknessLevel = 'MASTERED';
    } else {
      weaknessLevel = 'DEVELOPING';
    }
  }

  // 4. Sample Size Confidence & Mastery Score (0 - 100)
  const confidenceWeight = totalAttempts >= 5 ? 1.0 : totalAttempts >= 3 ? 0.85 : 0.6;
  const timePenalty = avgTimeSeconds > 100 ? Math.min(15, (avgTimeSeconds - 100) / 5) : 0;
  const trendBonus = trend === 'IMPROVING' ? 8 : trend === 'DECLINING' ? -8 : 0;

  const rawMastery = accuracy * confidenceWeight - timePenalty + trendBonus;
  const masteryScore = Math.max(0, Math.min(100, Math.round(rawMastery)));

  // 5. Urgency Score calculation (Higher = Should practice first)
  let urgency = 0;
  if (weaknessLevel === 'CRITICAL_WEAKNESS') {
    urgency = 80 + Math.min(20, (100 - accuracy) * 0.2) + (trend === 'DECLINING' ? 10 : 0);
  } else if (weaknessLevel === 'NEEDS_ATTENTION') {
    urgency = 55 + Math.min(20, (100 - accuracy) * 0.2);
  } else if (weaknessLevel === 'DEVELOPING') {
    urgency = 30 + Math.min(15, (100 - accuracy) * 0.15);
  } else if (weaknessLevel === 'INSUFFICIENT_DATA') {
    urgency = 25;
  } else {
    // MASTERED
    urgency = 5;
  }
  const urgencyScore = Math.max(0, Math.min(100, Math.round(urgency)));

  // 6. Recommended Action copy
  let recommendedAction = 'Practice 5 questions to calibrate baseline.';
  if (weaknessLevel === 'CRITICAL_WEAKNESS') {
    recommendedAction = diagnosticTags.includes('CONCEPT_GAP')
      ? 'Review core theorem and solve 5 foundational problems.'
      : 'Drill 10 targeted problems to eliminate concept errors.';
  } else if (weaknessLevel === 'NEEDS_ATTENTION') {
    recommendedAction = diagnosticTags.includes('TIME_TRAP')
      ? 'Focus on pacing and shortcut methods.'
      : 'Reinforce formula applications with 5 medium problems.';
  } else if (weaknessLevel === 'DEVELOPING') {
    recommendedAction = 'Solve 5 challenging questions to reach mastery.';
  } else if (weaknessLevel === 'MASTERED') {
    recommendedAction = 'Concept mastered. Maintain with weekly spaced review.';
  }

  return {
    conceptKey: group.conceptKey,
    subject: group.subject,
    chapter: group.chapter,
    topic: group.topic,
    totalAttempts,
    correctAttempts,
    accuracy,
    avgTimeSeconds,
    masteryScore,
    urgencyScore,
    weaknessLevel,
    trend,
    diagnosticTags,
    difficultyStats,
    lastAttemptedAt: group.lastAttemptedAt.toISOString(),
    recommendedAction,
  };
}

/**
 * Loads and aggregates comprehensive weak concept diagnostics for a user.
 */
export async function getUserConceptDiagnostics(userId: string): Promise<UserConceptDiagnosticsSummary> {
  const attemptGroups = await getUserConceptAttempts(userId);

  const analyzed = attemptGroups.map(analyzeConceptPerformance);

  let criticalCount = 0;
  let needsAttentionCount = 0;
  let developingCount = 0;
  let masteredCount = 0;
  let insufficientDataCount = 0;

  const conceptsBySubject: Record<QuestionSubject, AnalyzedConcept[]> = {
    PHYSICS: [],
    CHEMISTRY: [],
    MATHEMATICS: [],
  };

  for (const item of analyzed) {
    if (item.weaknessLevel === 'CRITICAL_WEAKNESS') criticalCount++;
    else if (item.weaknessLevel === 'NEEDS_ATTENTION') needsAttentionCount++;
    else if (item.weaknessLevel === 'DEVELOPING') developingCount++;
    else if (item.weaknessLevel === 'MASTERED') masteredCount++;
    else insufficientDataCount++;

    if (conceptsBySubject[item.subject]) {
      conceptsBySubject[item.subject].push(item);
    }
  }

  // Sort each subject by urgency score descending
  for (const subj of Object.keys(conceptsBySubject) as QuestionSubject[]) {
    conceptsBySubject[subj].sort((a, b) => b.urgencyScore - a.urgencyScore);
  }

  // Top weak concepts: critical and needs_attention items, highest urgency first
  const weakItems = analyzed
    .filter((a) => a.weaknessLevel === 'CRITICAL_WEAKNESS' || a.weaknessLevel === 'NEEDS_ATTENTION')
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .slice(0, 6);

  // Overall health score across attempted concepts
  let overallHealth = 100;
  if (analyzed.length > 0) {
    const totalMasterySum = analyzed.reduce((sum, c) => sum + c.masteryScore, 0);
    overallHealth = Math.round(totalMasterySum / analyzed.length);
  }

  return {
    totalConceptsAttempted: analyzed.length,
    criticalCount,
    needsAttentionCount,
    developingCount,
    masteredCount,
    insufficientDataCount,
    overallHealthScore: overallHealth,
    topWeakConcepts: weakItems,
    conceptsBySubject,
  };
}

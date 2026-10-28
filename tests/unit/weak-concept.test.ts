import '../test-helper';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConceptKey,
  parseConceptKey,
  normalizeTopicName,
} from '../../lib/server/concepts/metadata';
import {
  analyzeConceptPerformance,
} from '../../lib/server/concepts/analysis';
import { ConceptAttemptGroup } from '../../lib/server/concepts/attempts';
import { QuestionSubject } from '@prisma/client';

describe('Weak Concept Analysis — Unit Tests', () => {
  describe('Taxonomy & Canonical Key Generation', () => {
    test('normalizes topic names with whitespace or null safely', () => {
      assert.strictEqual(normalizeTopicName('  Dimensional Analysis  ', 'Units'), 'Dimensional Analysis');
      assert.strictEqual(normalizeTopicName(null, 'Units'), 'Units');
      assert.strictEqual(normalizeTopicName(undefined, 'Units'), 'Units');
      assert.strictEqual(normalizeTopicName('', 'Units'), 'Units');
      assert.strictEqual(normalizeTopicName('   ', 'Units'), 'Units');
      assert.strictEqual(normalizeTopicName(null, ''), 'General');
    });

    test('builds canonical concept key in SUBJECT::Chapter::Topic format', () => {
      const key1 = buildConceptKey(QuestionSubject.PHYSICS, 'Kinematics', 'Motion in 1D');
      assert.strictEqual(key1, 'PHYSICS::Kinematics::Motion in 1D');

      const key2 = buildConceptKey(QuestionSubject.CHEMISTRY, 'Thermodynamics', null);
      assert.strictEqual(key2, 'CHEMISTRY::Thermodynamics::Thermodynamics');

      const key3 = buildConceptKey(QuestionSubject.MATHEMATICS, '  Conic Sections  ', ' Parabola ');
      assert.strictEqual(key3, 'MATHEMATICS::Conic Sections::Parabola');
    });

    test('parses concept key back into its constituent fields', () => {
      const parsed = parseConceptKey('PHYSICS::Kinematics::Projectiles');
      assert.strictEqual(parsed.subject, QuestionSubject.PHYSICS);
      assert.strictEqual(parsed.chapter, 'Kinematics');
      assert.strictEqual(parsed.topic, 'Projectiles');
      assert.strictEqual(parsed.conceptKey, 'PHYSICS::Kinematics::Projectiles');
    });

    test('handles fallback when parsing malformed or partial keys', () => {
      const parsed = parseConceptKey('PHYSICS::Mechanics');
      assert.strictEqual(parsed.subject, QuestionSubject.PHYSICS);
      assert.strictEqual(parsed.chapter, 'Mechanics');
      assert.strictEqual(parsed.topic, 'Mechanics');
    });
  });

  describe('Concept Performance Classification & Scoring', () => {
    function createMockGroup(overrides: Partial<ConceptAttemptGroup>): ConceptAttemptGroup {
      return {
        conceptKey: 'PHYSICS::Kinematics::Projectiles',
        subject: QuestionSubject.PHYSICS,
        chapter: 'Kinematics',
        topic: 'Projectiles',
        totalAttempts: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        accuracy: 0,
        avgTimeSeconds: 45,
        fastIncorrectCount: 0,
        slowAttemptCount: 0,
        recentAttempts: [],
        difficultyStats: {
          EASY: { total: 0, correct: 0, accuracy: null },
          MEDIUM: { total: 0, correct: 0, accuracy: null },
          HARD: { total: 0, correct: 0, accuracy: null },
        },
        firstAttemptedAt: new Date(),
        lastAttemptedAt: new Date(),
        ...overrides,
      };
    }

    test('handles 0 attempts safely without NaN', () => {
      const group = createMockGroup({
        totalAttempts: 0,
        correctAttempts: 0,
        accuracy: 0,
      });

      const analyzed = analyzeConceptPerformance(group);
      assert.strictEqual(analyzed.weaknessLevel, 'INSUFFICIENT_DATA');
      assert.strictEqual(analyzed.accuracy, 0);
      assert.strictEqual(analyzed.urgencyScore, 25);
      assert.strictEqual(isNaN(analyzed.masteryScore), false);
      assert.strictEqual(isNaN(analyzed.urgencyScore), false);
    });

    test('classifies single wrong attempt as INSUFFICIENT_DATA, avoiding false alarm', () => {
      const group = createMockGroup({
        totalAttempts: 1,
        correctAttempts: 0,
        accuracy: 0,
        recentAttempts: [false],
      });

      const analyzed = analyzeConceptPerformance(group);
      assert.strictEqual(analyzed.weaknessLevel, 'INSUFFICIENT_DATA');
      assert.strictEqual(analyzed.urgencyScore, 25);
    });

    test('classifies 2 attempts with 50% accuracy as INSUFFICIENT_DATA', () => {
      const group = createMockGroup({
        totalAttempts: 2,
        correctAttempts: 1,
        accuracy: 50,
        recentAttempts: [false, true],
      });

      const analyzed = analyzeConceptPerformance(group);
      assert.strictEqual(analyzed.weaknessLevel, 'INSUFFICIENT_DATA');
    });

    test('classifies 2 attempts with 0% accuracy as CRITICAL_WEAKNESS', () => {
      const group = createMockGroup({
        totalAttempts: 2,
        correctAttempts: 0,
        accuracy: 0,
        recentAttempts: [false, false],
      });

      const analyzed = analyzeConceptPerformance(group);
      assert.strictEqual(analyzed.weaknessLevel, 'CRITICAL_WEAKNESS');
      assert.ok(analyzed.urgencyScore >= 80, `Urgency ${analyzed.urgencyScore} should be >= 80`);
    });

    test('classifies 4 attempts with 25% accuracy as CRITICAL_WEAKNESS', () => {
      const group = createMockGroup({
        totalAttempts: 4,
        correctAttempts: 1,
        accuracy: 25,
        recentAttempts: [false, true, false, false],
      });

      const analyzed = analyzeConceptPerformance(group);
      assert.strictEqual(analyzed.weaknessLevel, 'CRITICAL_WEAKNESS');
      assert.ok(analyzed.urgencyScore >= 80);
    });

    test('classifies 5 attempts with 50% accuracy as NEEDS_ATTENTION', () => {
      const group = createMockGroup({
        totalAttempts: 5,
        correctAttempts: 2,
        accuracy: 48,
        recentAttempts: [true, false, true, false, false],
      });

      const analyzed = analyzeConceptPerformance(group);
      assert.strictEqual(analyzed.weaknessLevel, 'NEEDS_ATTENTION');
    });

    test('classifies 5 attempts with 80% accuracy as MASTERED', () => {
      const group = createMockGroup({
        totalAttempts: 5,
        correctAttempts: 4,
        accuracy: 80,
        recentAttempts: [true, true, true, false, true],
      });

      const analyzed = analyzeConceptPerformance(group);
      assert.strictEqual(analyzed.weaknessLevel, 'MASTERED');
      assert.strictEqual(analyzed.urgencyScore, 5);
      assert.ok(analyzed.masteryScore >= 70);
    });

    test('detects CARELESS_RUSH diagnostic tag for fast incorrect responses', () => {
      const group = createMockGroup({
        totalAttempts: 3,
        correctAttempts: 1,
        accuracy: 33,
        fastIncorrectCount: 2,
        recentAttempts: [false, true, false],
      });

      const analyzed = analyzeConceptPerformance(group);
      assert.ok(analyzed.diagnosticTags.includes('CARELESS_RUSH'));
    });

    test('detects TIME_TRAP diagnostic tag for struggling pacing', () => {
      const group = createMockGroup({
        totalAttempts: 4,
        correctAttempts: 2,
        accuracy: 50,
        avgTimeSeconds: 125,
        slowAttemptCount: 2,
        recentAttempts: [true, false, true, false],
      });

      const analyzed = analyzeConceptPerformance(group);
      assert.ok(analyzed.diagnosticTags.includes('TIME_TRAP'));
    });

    test('detects CONCEPT_GAP diagnostic tag for foundational struggles', () => {
      const group = createMockGroup({
        totalAttempts: 4,
        correctAttempts: 1,
        accuracy: 25,
        difficultyStats: {
          EASY: { total: 2, correct: 0, accuracy: 0 },
          MEDIUM: { total: 2, correct: 1, accuracy: 50 },
          HARD: { total: 0, correct: 0, accuracy: null },
        },
        recentAttempts: [false, false, true, false],
      });

      const analyzed = analyzeConceptPerformance(group);
      assert.ok(analyzed.diagnosticTags.includes('CONCEPT_GAP'));
    });

    test('detects DIFFICULTY_CEILING tag when easy is mastered but medium drops', () => {
      const group = createMockGroup({
        totalAttempts: 5,
        correctAttempts: 2,
        accuracy: 40,
        difficultyStats: {
          EASY: { total: 2, correct: 2, accuracy: 100 },
          MEDIUM: { total: 3, correct: 0, accuracy: 0 },
          HARD: { total: 0, correct: 0, accuracy: null },
        },
        recentAttempts: [true, true, false, false, false],
      });

      const analyzed = analyzeConceptPerformance(group);
      assert.ok(analyzed.diagnosticTags.includes('DIFFICULTY_CEILING'));
    });

    test('evaluates IMPROVING and DECLINING trends correctly', () => {
      const improvingGroup = createMockGroup({
        totalAttempts: 5,
        correctAttempts: 2,
        accuracy: 40,
        // Last 3 are correct -> 100% recent vs 40% overall (>= +15% delta)
        recentAttempts: [false, false, true, true, true],
      });
      const improving = analyzeConceptPerformance(improvingGroup);
      assert.strictEqual(improving.trend, 'IMPROVING');

      const decliningGroup = createMockGroup({
        totalAttempts: 5,
        correctAttempts: 3,
        accuracy: 60,
        // Last 3 are incorrect -> 0% recent vs 60% overall (<= -15% delta)
        recentAttempts: [true, true, false, false, false],
      });
      const declining = analyzeConceptPerformance(decliningGroup);
      assert.strictEqual(declining.trend, 'DECLINING');
    });

    test('urgency and mastery scores are strictly bounded between 0 and 100', () => {
      const extremeBad = createMockGroup({
        totalAttempts: 10,
        correctAttempts: 0,
        accuracy: 0,
        avgTimeSeconds: 200,
        recentAttempts: [false, false, false, false, false],
      });
      const resBad = analyzeConceptPerformance(extremeBad);
      assert.ok(resBad.urgencyScore >= 0 && resBad.urgencyScore <= 100);
      assert.ok(resBad.masteryScore >= 0 && resBad.masteryScore <= 100);

      const extremeGood = createMockGroup({
        totalAttempts: 20,
        correctAttempts: 20,
        accuracy: 100,
        avgTimeSeconds: 25,
        recentAttempts: [true, true, true, true, true],
      });
      const resGood = analyzeConceptPerformance(extremeGood);
      assert.ok(resGood.urgencyScore >= 0 && resGood.urgencyScore <= 100);
      assert.ok(resGood.masteryScore >= 0 && resGood.masteryScore <= 100);
    });
  });
});

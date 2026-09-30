/**
 * ============================================================================
 * CRACKR VALIDATION & NORMALIZATION TEST SUITE
 * ============================================================================
 * Tests all 10 required edge cases for JEE MCQ ingestion:
 * 1. Valid text MCQ
 * 2. Missing option (<4)
 * 3. More than four options (>4)
 * 4. Image option
 * 5. Image-dependent question
 * 6. Missing answer
 * 7. Invalid answer
 * 8. Duplicate question
 * 9. LaTeX question
 * 10. Valid question with Unicode / math symbols
 * ============================================================================
 */

import { validateQuestion } from '../validate/rules';
import { normalizeQuestion } from '../normalize/question';
import { cleanText } from '../normalize/text';
import { computeContentHash, DeduplicationRegistry } from '../deduplicate/hash';
import { RawQuestion } from '../types';

function runTests() {
  console.log('--- Running Crackr Ingestion Validation Tests ---\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Valid text MCQ
  const q1: RawQuestion = {
    question_id: 'Q101',
    subject: 'physics',
    chapter: 'kinematics',
    topic: 'motion-in-1d',
    year: 2023,
    type: 'mcq',
    question: 'A car starts from rest and accelerates uniformly at 2 m/s^2 for 5 seconds. What is its final velocity?',
    options: [
      { identifier: 'A', content: '5 m/s' },
      { identifier: 'B', content: '10 m/s' },
      { identifier: 'C', content: '15 m/s' },
      { identifier: 'D', content: '20 m/s' },
    ],
    correct_options: ['B'],
  };
  const res1 = validateQuestion(q1);
  assert(res1.isValid === true, 'Test 1: Valid text MCQ');

  // 2. Missing option (<4 options)
  const q2: RawQuestion = {
    ...q1,
    question_id: 'Q102',
    options: [
      { identifier: 'A', content: '5 m/s' },
      { identifier: 'B', content: '10 m/s' },
      { identifier: 'C', content: '15 m/s' },
    ],
  };
  const res2 = validateQuestion(q2);
  assert(res2.isValid === false && res2.reason === 'INVALID_OPTION_COUNT', 'Test 2: Missing option (<4)');

  // 3. More than four options (>4 options)
  const q3: RawQuestion = {
    ...q1,
    question_id: 'Q103',
    options: [
      { identifier: 'A', content: '5 m/s' },
      { identifier: 'B', content: '10 m/s' },
      { identifier: 'C', content: '15 m/s' },
      { identifier: 'D', content: '20 m/s' },
      { identifier: 'E', content: '25 m/s' },
    ],
  };
  const res3 = validateQuestion(q3);
  assert(res3.isValid === false && res3.reason === 'INVALID_OPTION_COUNT', 'Test 3: More than 4 options');

  // 4. Image option
  const q4: RawQuestion = {
    ...q1,
    question_id: 'Q104',
    options: [
      { identifier: 'A', content: '<img src="https://cdn.examgoal.net/opt1.png" />' },
      { identifier: 'B', content: '10 m/s' },
      { identifier: 'C', content: '15 m/s' },
      { identifier: 'D', content: '20 m/s' },
    ],
  };
  const res4 = validateQuestion(q4);
  assert(res4.isValid === false && res4.reason === 'IMAGE_OPTION', 'Test 4: Image option rejected');

  // 5. Image-dependent question
  const q5: RawQuestion = {
    ...q1,
    question_id: 'Q105',
    question: 'In the circuit shown below, find current I: <br><img src="https://cdn.examgoal.net/circuit.png" />',
  };
  const res5 = validateQuestion(q5);
  assert(res5.isValid === false && res5.reason === 'IMAGE_QUESTION', 'Test 5: Image-dependent question rejected');

  // 6. Missing answer
  const q6: RawQuestion = {
    ...q1,
    question_id: 'Q106',
    correct_options: [],
    isBonus: true,
  };
  const res6 = validateQuestion(q6);
  assert(res6.isValid === false && res6.reason === 'MISSING_ANSWER', 'Test 6: Missing answer rejected');

  // 7. Invalid answer
  const q7: RawQuestion = {
    ...q1,
    question_id: 'Q107',
    correct_options: ['Z'],
  };
  const res7 = validateQuestion(q7);
  assert(res7.isValid === false && res7.reason === 'INVALID_ANSWER', 'Test 7: Invalid answer rejected');

  // 8. Duplicate question
  const dedup = new DeduplicationRegistry();
  const hash1 = computeContentHash(q1);
  const isDup1 = dedup.isDuplicate(q1.question_id, hash1);
  const q8Dup: RawQuestion = { ...q1, question_id: 'Q108_DUP' };
  const hash8 = computeContentHash(q8Dup);
  const isDup2 = dedup.isDuplicate(q8Dup.question_id, hash8);
  assert(isDup1 === false && isDup2 === true, 'Test 8: Duplicate question detected via content hash');

  // 9. LaTeX question
  const q9: RawQuestion = {
    question_id: 'Q109',
    subject: 'mathematics',
    chapter: 'calculus',
    type: 'mcq',
    question: 'Find the integral $$\\int \\frac{\\sin(\\alpha x)}{\\cos(\\beta x)} dx$$ where $$\\alpha \\ne \\beta$$.',
    options: [
      { identifier: 'A', content: '$$\\frac{1}{\\alpha} \\ln |\\sec(\\alpha x)|$$' },
      { identifier: 'B', content: '$$\\frac{1}{\\beta} \\ln |\\sec(\\beta x)|$$' },
      { identifier: 'C', content: '$$-\\frac{1}{\\alpha} \\cos(\\alpha x)$$' },
      { identifier: 'D', content: '$$0$$' },
    ],
    correct_options: ['A'],
  };
  const res9 = validateQuestion(q9);
  const norm9 = normalizeQuestion(q9, computeContentHash(q9));
  assert(
    res9.isValid === true &&
    norm9.text.includes('\\int \\frac{\\sin(\\alpha x)}') &&
    norm9.options[0].text.includes('\\frac{1}{\\alpha}'),
    'Test 9: LaTeX math notation correctly preserved and valid'
  );

  // 10. Valid question with Unicode / math symbols
  const q10: RawQuestion = {
    question_id: 'Q110',
    subject: 'chemistry',
    chapter: 'thermodynamics',
    type: 'mcq',
    question: 'For a reversible adiabatic expansion of an ideal gas, &Delta;S &ge; 0 and &Delta;H = &pm; q + w.',
    options: [
      { identifier: '1', content: '&Delta;S = 0' },
      { identifier: '2', content: '&Delta;S &gt; 0' },
      { identifier: '3', content: '&Delta;S &lt; 0' },
      { identifier: '4', content: '&Delta;U &ne; 0' },
    ],
    correct_options: ['1'],
  };
  const res10 = validateQuestion(q10);
  const norm10 = normalizeQuestion(q10, computeContentHash(q10));
  assert(
    res10.isValid === true &&
    norm10.correctOption === 'A' &&
    norm10.options.length === 4 &&
    norm10.text.includes('ΔS ≥ 0') &&
    norm10.options[1].text.includes('ΔS > 0'),
    'Test 10: HTML entity decoded, Unicode math symbols preserved, 1-4 mapped to A-D'
  );

  console.log(`\nTest results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

import '../test-helper';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatJeeContent, balanceFormattingTags, normalizeMathDelimiters } from '../../components/ui/MathRenderer';
import fs from 'node:fs';
import path from 'node:path';

describe('Smart Revision Notes Mathematical Rendering — Regression Invariants', () => {
  describe('VisualExplanation Component MathRenderer Invariants', () => {
    test('VisualExplanation renders keyTakeaway using MathRenderer instead of plain text', () => {
      const filePath = path.resolve(__dirname, '../../components/notes/VisualExplanation.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // Assert that keyTakeaway is NOT rendered directly as raw {keyTakeaway} in a <p> tag
      assert.ok(
        !fileContent.includes('<p className="text-xs text-zinc-200 leading-relaxed font-normal">\n            {keyTakeaway}'),
        'VisualExplanation must not render keyTakeaway as raw unparsed text'
      );

      // Assert that keyTakeaway is rendered using MathRenderer
      assert.ok(
        fileContent.includes('<MathRenderer content={keyTakeaway} />'),
        'VisualExplanation must render keyTakeaway through MathRenderer'
      );
    });

    test('VisualExplanation renders userNote using MathRenderer', () => {
      const filePath = path.resolve(__dirname, '../../components/notes/VisualExplanation.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      assert.ok(
        fileContent.includes('<MathRenderer content={userNote} />'),
        'VisualExplanation must render userNote through MathRenderer'
      );
    });
  });

  describe('Adjacent Components MathRenderer Invariants', () => {
    test('NoteCard renders note.keyTakeaway using MathRenderer', () => {
      const filePath = path.resolve(__dirname, '../../components/notes/NoteCard.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      assert.ok(
        fileContent.includes('<MathRenderer content={note.keyTakeaway}'),
        'NoteCard must render keyTakeaway through MathRenderer'
      );
    });

    test('RevisionDetailModal renders note.keyTakeaway using MathRenderer', () => {
      const filePath = path.resolve(__dirname, '../../components/revision/RevisionDetailModal.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      assert.ok(
        fileContent.includes('<MathRenderer content={note.keyTakeaway}'),
        'RevisionDetailModal must render note.keyTakeaway through MathRenderer'
      );
    });

    test('RevisionClient renders n.keyTakeaway using MathRenderer', () => {
      const filePath = path.resolve(__dirname, '../../app/revision/RevisionClient.tsx');
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      assert.ok(
        fileContent.includes('<MathRenderer content={n.keyTakeaway}'),
        'RevisionClient must render n.keyTakeaway through MathRenderer'
      );
    });
  });

  describe('Bug Report Reproduction & Comprehensive DOM Behavior Verification', () => {
    test('MATH-BUG-01: renders the exact bug report payload without raw markup or unclosed tags', () => {
      const brokenPayload = 'V<sub>0</sub> $$ \\propto $ h<sup>P</sup>c<sup>Q</sup>G<sup>R</sup>S<sup>...';
      const rendered = formatJeeContent(brokenPayload);

      // 1. Math rendering validation
      assert.ok(rendered.includes('katex'), 'KaTeX must render the mathematical expressions');
      assert.ok(rendered.includes('∝'), 'Proportionality symbol ∝ must be present in DOM');

      // 2. Subscript & superscript formatting validation
      assert.ok(
        rendered.includes('<sub class="text-[0.75em] bottom-[-0.2em] relative font-medium">0</sub>'),
        'Subscript 0 must be formatted with typography CSS'
      );
      assert.ok(
        rendered.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">P</sup>'),
        'Superscript P must be formatted'
      );
      assert.ok(
        rendered.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">Q</sup>'),
        'Superscript Q must be formatted'
      );
      assert.ok(
        rendered.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">R</sup>'),
        'Superscript R must be formatted'
      );
      assert.ok(
        rendered.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">...</sup>'),
        'Truncated superscript ... must be safely closed and styled'
      );

      // 3. Absence of raw markup leaks
      assert.ok(!rendered.includes('<sub>0</sub>'), 'Must not display raw unstyled <sub>0</sub>');
      assert.ok(!rendered.includes('<sup>P</sup>'), 'Must not display raw unstyled <sup>P</sup>');
      assert.ok(!rendered.includes('S<sup>...'), 'Must not display raw unclosed <sup> tag');
      assert.ok(!rendered.includes('$$ \\propto'), 'Must not display raw unparsed LaTeX delimiters');
      assert.ok(!rendered.includes('$$'), 'Must not leak double dollar delimiters');
    });

    test('MATH-BUG-02: renders full real database note takeaway with 4 dimensions and proportionality', () => {
      const realDbTakeaway = 'V<sub>0</sub> $$ \\propto $$ h<sup>P</sup>c<sup>Q</sup>G<sup>R</sup>I<sup>S</sup>';
      const rendered = formatJeeContent(realDbTakeaway);

      assert.ok(rendered.includes('katex'));
      assert.ok(rendered.includes('∝'));
      assert.ok(rendered.includes('<sub class="text-[0.75em] bottom-[-0.2em] relative font-medium">0</sub>'));
      assert.ok(rendered.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">S</sup>'));
      assert.ok(!rendered.includes('$$'));
    });

    test('MATH-BUG-03: sanitization strips active XSS vectors while preserving math expressions', () => {
      const maliciousPayload = '<script>document.cookie</script><img src=x onerror=alert(1)>$E = mc^2$';
      const rendered = formatJeeContent(maliciousPayload);

      assert.ok(!rendered.includes('<script'), 'Must not contain script tags');
      assert.ok(!rendered.includes('document.cookie'), 'Must not contain script content');
      assert.ok(!rendered.includes('onerror'), 'Must not contain inline event handlers');
      assert.ok(rendered.includes('katex'), 'Must preserve and render valid formula');
    });

    test('MATH-BUG-04: tag balancing handles deeply nested and multiple unclosed tags gracefully', () => {
      const deeplyUnclosed = '<b><i>V<sub>0</sub><sup>2';
      const balanced = balanceFormattingTags(deeplyUnclosed);
      assert.ok(balanced.includes('</i></b>'), 'Must close all opened tags');
      assert.ok(balanced.includes('</sup>'), 'Must close unclosed sup');
      const rendered = formatJeeContent(deeplyUnclosed);
      assert.ok(rendered.includes('<strong class="font-semibold text-white">'));
      assert.ok(rendered.includes('<em class="italic">'));
    });

    test('MATH-BUG-05: delimiter normalization handles unclosed equations at end of line', () => {
      const unclosedAtEnd = 'Gravitational potential $$\\Phi = -\\frac{GM}{r}';
      const normalized = normalizeMathDelimiters(unclosedAtEnd);
      assert.ok(normalized.endsWith('$$'), 'Must close trailing display math');
      const rendered = formatJeeContent(unclosedAtEnd);
      assert.ok(rendered.includes('katex'));
      assert.ok(rendered.includes('mfrac'));
    });
  });
});

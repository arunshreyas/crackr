import '../test-helper';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatJeeContent } from '../../components/ui/MathRenderer';
import { parseExplanationSteps } from '../../components/notes/VisualExplanation';

describe('Visual Explanation & Math Rendering — Unit Tests', () => {
  describe('Worked Solution Step Parsing', () => {
    test('returns empty array when explanation is null, undefined, or empty', () => {
      assert.deepStrictEqual(parseExplanationSteps(null), []);
      assert.deepStrictEqual(parseExplanationSteps(''), []);
      assert.deepStrictEqual(parseExplanationSteps('   '), []);
    });

    test('returns single worked solution step for concise single-paragraph explanation', () => {
      const exp = 'Apply conservation of linear momentum: $m_1 v_1 + m_2 v_2 = 0$. Therefore $v_2 = -m_1 v_1 / m_2$.';
      const steps = parseExplanationSteps(exp);
      assert.strictEqual(steps.length, 1);
      assert.strictEqual(steps[0].title, 'Worked Solution');
      assert.ok(steps[0].content.includes('conservation of linear momentum'));
    });

    test('partitions multi-paragraph explanations into discrete logical steps', () => {
      const exp = `
Given: Initial velocity $u = 0$, acceleration $a = 2\\text{ m/s}^2$, time $t = 5\\text{ s}$.

From first equation of motion:
$$v = u + at$$

Substituting the given values:
$$v = 0 + 2 \\times 5 = 10\\text{ m/s}$$

Therefore, the final velocity is $10\\text{ m/s}$.
      `.trim();

      const steps = parseExplanationSteps(exp);
      assert.ok(steps.length >= 2, `Expected >= 2 steps, got ${steps.length}`);
      assert.ok(steps[0].title.startsWith('Step 1'));
    });

    test('consolidates verbose explanations with > 6 steps into 3 coherent phases', () => {
      const paragraphs: string[] = [];
      for (let i = 1; i <= 9; i++) {
        paragraphs.push(`Step ${i}:\nPerform computation ${i} with formula $X_${i} = ${i}$.`);
      }
      const rawExp = paragraphs.join('\n\n');

      const steps = parseExplanationSteps(rawExp);
      assert.ok(steps.length <= 6, `Expected <= 6 consolidated steps, got ${steps.length}`);
      assert.strictEqual(steps[0].title, 'Initial Formulation');
      assert.strictEqual(steps[steps.length - 1].title, 'Final Deduction');
    });

    test('strips stray CDN <source> tags before parsing steps', () => {
      const expWithSource = '<source media="(max-width: 600px)" srcset="https://cdn.crackrr.com/diagram1.webp">\n\nStep 1: Calculate force.';
      const steps = parseExplanationSteps(expWithSource);
      assert.strictEqual(steps.length, 1);
      assert.ok(!steps[0].content.includes('<source'));
      assert.ok(steps[0].content.includes('Calculate force'));
    });
  });

  describe('LaTeX, TeX Macros, and KaTeX Pipeline', () => {
    test('renders inline and display math via KaTeX without error', () => {
      const raw = 'The force is given by $F = ma$ and kinetic energy is $$E_k = \\frac{1}{2}mv^2$$.';
      const html = formatJeeContent(raw);

      assert.ok(html.includes('katex'), 'Output HTML should contain KaTeX markup');
      assert.ok(!html.includes('$F = ma$'), 'Original raw delimiters should be replaced with KaTeX HTML');
    });

    test('converts Plain-TeX \\buildrel reaction arrows into LaTeX \\xrightarrow{}', () => {
      const teXArrow = '$$\\text{CH}_3\\text{COOH} \\buildrel {\\text{LiAlH}_4} \\over \\longrightarrow \\text{CH}_3\\text{CH}_2\\text{OH}$$';
      const html = formatJeeContent(teXArrow);

      assert.ok(html.includes('katex'));
      assert.ok(!html.includes('\\buildrel'));
    });

    test('normalizes TeX comparison operators (\\ne, \\ge, \\le)', () => {
      const input = '$x \\ne 0$, $y \\ge 5$, $z \\le 10$';
      const html = formatJeeContent(input);

      assert.ok(html.includes('katex'));
    });

    test('handles malformed LaTeX gracefully without crashing', () => {
      const malformed = '$$\\frac{invalid{unclosed$$ and normal text';
      let html = '';
      assert.doesNotThrow(() => {
        html = formatJeeContent(malformed);
      });
      assert.ok(html.length > 0);
    });

    test('converts JEE diagram <source> tags into responsive <picture> elements', () => {
      const rawDiagram = '<source media="(min-width: 600px)" srcset="https://cdn.crackrr.com/image-large.png"><source media="(max-width: 599px)" srcset="https://cdn.crackrr.com/image-small.png">';
      const html = formatJeeContent(rawDiagram);

      assert.ok(html.includes('<picture'), 'Should wrap source tags in <picture>');
      assert.ok(html.includes('<img src="https://cdn.crackrr.com/image-small.png"'), 'Should add fallback <img>');
    });

    test('parses Match List-I and List-II text into formatted responsive tables', () => {
      const matchList = `
Match List-I with List-II:
List-I
List-II

(A)
Isothermal
(I)
Temperature constant

(B)
Adiabatic
(II)
Heat exchange zero

(C)
Isochoric
(III)
Volume constant

(D)
Isobaric
(IV)
Pressure constant

Choose the correct answer from the options given below:
      `.trim();

      const html = formatJeeContent(matchList);
      assert.ok(html.includes('<table'), 'Should convert match list into structured <table>');
      assert.ok(html.includes('List - I'));
      assert.ok(html.includes('List - II'));
    });
  });
});

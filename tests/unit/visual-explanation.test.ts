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

  describe('Mathematical Notation, Subscripts, Superscripts & Robust Normalization', () => {
    test('renders Unicode subscripts and HTML <sub> subscripts correctly', () => {
      const unicodeInput = 'Initial velocity V₀ and final velocity V₁';
      const unicodeHtml = formatJeeContent(unicodeInput);
      assert.ok(unicodeHtml.includes('V₀'), 'Unicode subscript V₀ should be preserved');
      assert.ok(unicodeHtml.includes('V₁'), 'Unicode subscript V₁ should be preserved');

      const htmlSubInput = 'Concentration [V<sub>0</sub>] and coordinate x<sub>1</sub>';
      const htmlSubOutput = formatJeeContent(htmlSubInput);
      assert.ok(htmlSubOutput.includes('<sub class="text-[0.75em] bottom-[-0.2em] relative font-medium">0</sub>'), 'Should style <sub> with typography classes');
      assert.ok(htmlSubOutput.includes('<sub class="text-[0.75em] bottom-[-0.2em] relative font-medium">1</sub>'), 'Should style <sub> with typography classes');
      assert.ok(!htmlSubOutput.includes('<sub>0</sub>'), 'Should not leave raw unstyled <sub> tags');
    });

    test('renders Unicode superscripts and HTML <sup> superscripts correctly', () => {
      const unicodeSup = 'Area in m² and volume in cm³';
      const unicodeHtml = formatJeeContent(unicodeSup);
      assert.ok(unicodeHtml.includes('m²'), 'Unicode square m² should be preserved');
      assert.ok(unicodeHtml.includes('cm³'), 'Unicode cube cm³ should be preserved');

      const htmlSupInput = 'Dimensions: h<sup>P</sup>c<sup>Q</sup>G<sup>R</sup>';
      const htmlSupOutput = formatJeeContent(htmlSupInput);
      assert.ok(htmlSupOutput.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">P</sup>'));
      assert.ok(htmlSupOutput.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">Q</sup>'));
      assert.ok(htmlSupOutput.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">R</sup>'));
      assert.ok(!htmlSupOutput.includes('<sup>P</sup>'), 'Should not leave raw unstyled <sup> tags');
    });

    test('renders LaTeX fractions, roots, integrals, and Greek letters via KaTeX', () => {
      const latexInput = 'The equation is $$\\frac{1}{2}mv^2 + \\int_0^t F\\,dt = \\sqrt{3}\\omega$$ for angle $$\\theta = \\frac{\\pi}{3}$$';
      const html = formatJeeContent(latexInput);

      assert.ok(html.includes('katex'), 'Should render through KaTeX');
      assert.ok(html.includes('mfrac'), 'KaTeX should generate fraction DOM nodes');
      assert.ok(html.includes('msqrt'), 'KaTeX should generate square root DOM nodes');
      assert.ok(!html.includes('$$\\frac{1}{2}'), 'Raw LaTeX delimiters should be replaced with KaTeX HTML');
    });

    test('renders mixed HTML-style markup and LaTeX seamlessly in the same sentence', () => {
      const mixed = 'V<sub>0</sub> $$ \\propto $$ h<sup>P</sup>c<sup>Q</sup>G<sup>R</sup>I<sup>S</sup>';
      const html = formatJeeContent(mixed);

      assert.ok(html.includes('katex'), 'KaTeX should render the \\propto symbol');
      assert.ok(html.includes('∝'), 'Should contain proportionality symbol');
      assert.ok(html.includes('<sub class="text-[0.75em] bottom-[-0.2em] relative font-medium">0</sub>'));
      assert.ok(html.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">P</sup>'));
      assert.ok(html.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">Q</sup>'));
      assert.ok(!html.includes('$$'), 'Delimiters should not leak into output');
    });

    test('normalizes malformed mismatched delimiters ($$ ... $ and $ ... $$)', () => {
      // Mismatched opening $$ and closing $
      const mismatched1 = 'V<sub>0</sub> $$ \\propto $ h<sup>P</sup>';
      const html1 = formatJeeContent(mismatched1);
      assert.ok(html1.includes('katex'), 'Should repair mismatched $$ ... $ and render KaTeX');
      assert.ok(!html1.includes('$$'), 'Should not leave unparsed $$ delimiters');
      assert.ok(html1.includes('∝'), 'Should render proportionality symbol');

      // Mismatched opening $ and closing $$
      const mismatched2 = 'Force $ F = ma $$ is Newton second law';
      const html2 = formatJeeContent(mismatched2);
      assert.ok(html2.includes('katex'), 'Should repair mismatched $ ... $$ and render KaTeX');
      assert.ok(!html2.includes('$$'), 'Should not leave unparsed $$ delimiters');
    });

    test('gracefully repairs unclosed HTML tags without exposing raw tags or breaking DOM', () => {
      const unclosedSup = 'Dimensions h<sup>P</sup>c<sup>Q</sup>S<sup>...';
      const html = formatJeeContent(unclosedSup);
      assert.ok(html.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">...</sup>'), 'Should close truncated <sup> tag');
      assert.ok(!html.includes('S<sup>...'), 'Should not leave raw unclosed <sup> tag');

      const unclosedSub = 'Velocity V<sub>0';
      const htmlSub = formatJeeContent(unclosedSub);
      assert.ok(htmlSub.includes('<sub class="text-[0.75em] bottom-[-0.2em] relative font-medium">0</sub>'));
      assert.ok(!htmlSub.includes('V<sub>0'), 'Should not leave raw unclosed <sub> tag');
    });

    test('gracefully repairs unclosed math delimiters at end of line/string', () => {
      const unclosedMath = 'Energy formula $$ E = mc^2';
      const html = formatJeeContent(unclosedMath);
      assert.ok(html.includes('katex'), 'Should repair unclosed $$ and render KaTeX');
      assert.ok(!html.includes('$$ E = mc^2'), 'Raw unclosed markup should not be displayed');
    });

    test('preserves plain text without mathematical notation without corruption', () => {
      const plain = 'Always check direction cosine identity: sum of squares equals one.';
      const html = formatJeeContent(plain);
      assert.strictEqual(html, plain, 'Plain text should remain untouched');
    });

    test('normalizes bare LaTeX symbols appearing in non-math prose into Unicode symbols', () => {
      const bare = 'Because V \\propto T and \\Delta P = 0, \\therefore \\alpha = 1';
      const html = formatJeeContent(bare);
      assert.ok(html.includes('∝'), 'Should convert bare \\propto to ∝');
      assert.ok(html.includes('Δ'), 'Should convert bare \\Delta to Δ');
      assert.ok(html.includes('∴'), 'Should convert bare \\therefore to ∴');
      assert.ok(html.includes('α'), 'Should convert bare \\alpha to α');
      assert.ok(!html.includes('\\propto'), 'Should not leave raw backslash code in prose');
    });

    test('sanitizes potentially unsafe HTML input (XSS protection)', () => {
      const dangerousScript = '<script>alert("xss")</script>Safe concept';
      const cleanScript = formatJeeContent(dangerousScript);
      assert.ok(!cleanScript.includes('<script'), 'Must strip script tags');
      assert.ok(!cleanScript.includes('alert'), 'Must strip script content');
      assert.ok(cleanScript.includes('Safe concept'), 'Must preserve safe text');

      const dangerousImg = '<img src="x" onerror="alert(1)">Safe formula $x = 1$';
      const cleanImg = formatJeeContent(dangerousImg);
      assert.ok(!cleanImg.includes('onerror'), 'Must strip onerror handlers');
      assert.ok(cleanImg.includes('katex'), 'Must render legitimate formula');

      const dangerousIframe = '<iframe src="https://attacker.com"></iframe>Core principle';
      const cleanIframe = formatJeeContent(dangerousIframe);
      assert.ok(!cleanIframe.includes('<iframe'), 'Must strip iframe tags');
      assert.ok(cleanIframe.includes('Core principle'));

      const dangerousProtocol = '<a href="javascript:alert(1)">Click</a>';
      const cleanProtocol = formatJeeContent(dangerousProtocol);
      assert.ok(!cleanProtocol.includes('javascript:'), 'Must disarm javascript: URIs');
    });

    test('REGRESSION: reproduces and fixes the exact Smart Revision Note bug', () => {
      // The exact broken output from the issue report:
      const bugInput = 'V<sub>0</sub> $$ \\propto $ h<sup>P</sup>c<sup>Q</sup>G<sup>R</sup>S<sup>...';
      const html = formatJeeContent(bugInput);

      // Must be rendered with KaTeX
      assert.ok(html.includes('katex'), 'Proportionality formula must be rendered via KaTeX');
      assert.ok(html.includes('∝'), 'Proportionality symbol ∝ must be present');
      // Must not display raw <sub> or <sup> tags
      assert.ok(!html.includes('<sub>0</sub>'), 'Raw <sub> tag must not be displayed');
      assert.ok(!html.includes('<sup>P</sup>'), 'Raw <sup> tag must not be displayed');
      assert.ok(!html.includes('<sup>...'), 'Unclosed truncated <sup> tag must not leak');
      // Must contain styled subscripts and superscripts
      assert.ok(html.includes('<sub class="text-[0.75em] bottom-[-0.2em] relative font-medium">0</sub>'));
      assert.ok(html.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">P</sup>'));
      assert.ok(html.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">Q</sup>'));
      assert.ok(html.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">R</sup>'));
      assert.ok(html.includes('<sup class="text-[0.75em] top-[-0.3em] relative font-medium">...</sup>'));
      // Must not leak unparsed delimiters or raw LaTeX code outside KaTeX
      assert.ok(!html.includes('$$'), 'Raw $$ must not leak into output');
      assert.ok(!html.includes('$$ \\propto'), 'Raw $$ \\propto must not leak into output');
    });
  });
});

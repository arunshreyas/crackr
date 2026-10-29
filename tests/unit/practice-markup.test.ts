import '../test-helper';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

describe('PracticeContainer JSX & DOM Nesting Invariants — Regression Tests', () => {
  const filePath = path.resolve(process.cwd(), 'app/practice/PracticeContainer.tsx');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  test('no nested <button> elements exist inside <button> in PracticeContainer.tsx (prevents React 19 hydration mismatch)', () => {
    const sourceFile = ts.createSourceFile(
      'PracticeContainer.tsx',
      fileContent,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const violations: Array<{ line: number; character: number; description: string }> = [];

    function getTagName(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): string {
      return node.tagName.getText(sourceFile);
    }

    function checkDescendantsForButton(
      parentButtonNode: ts.JsxElement,
      node: ts.Node
    ) {
      ts.forEachChild(node, (child) => {
        if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
          const opening = ts.isJsxElement(child) ? child.openingElement : child;
          const tagName = getTagName(opening);
          if (tagName === 'button') {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(child.getStart());
            violations.push({
              line: line + 1,
              character: character + 1,
              description: `Nested <button> found inside an outer <button> starting at line ${
                sourceFile.getLineAndCharacterOfPosition(parentButtonNode.getStart()).line + 1
              }`,
            });
          }
        }
        checkDescendantsForButton(parentButtonNode, child);
      });
    }

    function visit(node: ts.Node) {
      if (ts.isJsxElement(node)) {
        const tagName = getTagName(node.openingElement);
        if (tagName === 'button') {
          // Check all children of this button
          for (const child of node.children) {
            checkDescendantsForButton(node, child);
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} nested <button> violations:\n` +
        violations.map((v) => `  Line ${v.line}:${v.character} - ${v.description}`).join('\n')
    );
  });

  test('PracticeContainer question review list uses unnested div container for expand toggle and save note button', () => {
    // Assert the specific structure of question review item
    assert.ok(
      fileContent.includes('toggleQuestionExpanded(q.questionId)'),
      'Question review expand handler must exist'
    );
    assert.ok(
      fileContent.includes('setModalQuestion({'),
      'Save note modal trigger must exist'
    );

    // Verify the collapse trigger button uses absolute overlay rather than wrapping children
    assert.ok(
      fileContent.includes('className="absolute inset-0 w-full h-full text-left cursor-pointer z-0'),
      'Expand button must be an absolute overlay rather than an outer wrapper element'
    );

    // Verify the save note button is positioned in relative z-10 layer
    assert.ok(
      fileContent.includes('className="relative z-10 flex items-center gap-3 shrink-0 font-mono text-zinc-400"'),
      'Action controls must be in an unnested sibling layer (z-10)'
    );
  });
});

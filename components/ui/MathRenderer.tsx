'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Replaces Plain-TeX \buildrel {label} \over \longrightarrow macros with proper LaTeX \xrightarrow{label}.
 */
function replaceBuildrel(latex: string): string {
  let result = latex;
  while (true) {
    const idx = result.indexOf('\\buildrel');
    if (idx === -1) break;

    const overIdx = result.indexOf('\\over', idx);
    if (overIdx === -1) break;

    const topPart = result.slice(idx + 9, overIdx).trim();
    const afterOver = result.slice(overIdx + 5).trimStart();
    let target = '';
    let targetEnd = 0;

    if (afterOver.startsWith('\\longrightarrow')) {
      target = '\\longrightarrow';
      targetEnd = 15;
    } else if (afterOver.startsWith('\\rightarrow')) {
      target = '\\rightarrow';
      targetEnd = 11;
    } else if (afterOver.startsWith('\\longleftarrow')) {
      target = '\\longleftarrow';
      targetEnd = 14;
    } else if (afterOver.startsWith('\\leftarrow')) {
      target = '\\leftarrow';
      targetEnd = 10;
    } else if (afterOver.startsWith('=')) {
      target = '=';
      targetEnd = 1;
    } else {
      const match = afterOver.match(/^(\\[a-zA-Z]+|\S+)/);
      if (match) {
        target = match[0];
        targetEnd = match[0].length;
      }
    }

    let cleanedTop = topPart;
    if (cleanedTop.startsWith('{') && cleanedTop.endsWith('}')) {
      cleanedTop = cleanedTop.slice(1, -1);
    }

    let replacement = '';
    if (target.includes('rightarrow')) {
      replacement = `\\xrightarrow{${cleanedTop}}`;
    } else if (target.includes('leftarrow')) {
      replacement = `\\xleftarrow{${cleanedTop}}`;
    } else {
      replacement = `\\stackrel{${cleanedTop}}{${target}}`;
    }

    const before = result.slice(0, idx);
    const after = afterOver.slice(targetEnd);
    result = before + replacement + after;
  }
  return result;
}

/**
 * Pre-processes LaTeX to normalize TeX macros, operators, and formatting.
 */
function cleanLatex(latex: string): string {
  let cleaned = latex.trim();

  // Fix standalone minus
  if (cleaned === '-' || cleaned === '$$ - $$' || cleaned === '$$-$$') {
    return '-';
  }

  // Normalize Plain-TeX \buildrel reaction arrows
  cleaned = replaceBuildrel(cleaned);

  // Normalize TeX \mathop X \limits_{Y} -> \underset{Y}{X}
  cleaned = cleaned.replace(/\\mathop\s*\{?([^}]+?)\}?\s*\\limits_\{([\s\S]*?)\}/gi, '\\underset{$2}{$1}');
  cleaned = cleaned.replace(/\\mathop\s*(\S+)\s*\\limits_\{([\s\S]*?)\}/gi, '\\underset{$2}{$1}');

  // Normalize common math comparison operators
  cleaned = cleaned.replace(/\\ne(?![a-zA-Z])/g, '\\neq ');
  cleaned = cleaned.replace(/\\ge(?![a-zA-Z])/g, '\\geq ');
  cleaned = cleaned.replace(/\\le(?![a-zA-Z])/g, '\\leq ');

  return cleaned;
}

/**
 * Renders LaTeX using KaTeX, falling back to clean text on parsing error.
 */
function renderKatexToString(latex: string, displayMode: boolean): string {
  try {
    const cleaned = cleanLatex(latex);
    return katex.renderToString(cleaned, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
    });
  } catch {
    return `<span class="font-mono text-xs">${latex}</span>`;
  }
}

/**
 * Parses Match List-I and List-II questions into structured side-by-side tables.
 */
function parseMatchList(text: string): string | null {
  const listMatch = /List\s*[-–]?\s*I\s*[\n\r]+\s*List\s*[-–]?\s*II/i;
  if (!listMatch.test(text)) return null;

  const parts = text.split(listMatch);
  if (parts.length < 2) return null;

  const preText = parts[0];
  const postMatch = parts[1];

  const endMatch = postMatch.search(/Choose the correct answer|Select the correct/i);
  const matchBody = endMatch !== -1 ? postMatch.slice(0, endMatch) : postMatch;
  const postText = endMatch !== -1 ? postMatch.slice(endMatch) : '';

  const itemBlocks = matchBody.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const leftItems: string[] = [];
  const rightItems: string[] = [];

  for (const b of itemBlocks) {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 4) {
      const label1 = lines[0];
      const text1 = lines[1];
      const label2 = lines[2];
      const text2 = lines.slice(3).join(' ');
      leftItems.push(`${label1} ${text1}`);
      rightItems.push(`${label2} ${text2}`);
    }
  }

  if (leftItems.length > 0 && leftItems.length === rightItems.length) {
    let tableHtml = '<div class="my-4 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02]">';
    tableHtml += '<table class="w-full text-xs text-left border-collapse">';
    tableHtml += '<thead class="bg-white/[0.04] text-zinc-300 font-semibold border-b border-white/[0.08]"><tr>';
    tableHtml += '<th class="py-2.5 px-4 font-semibold text-[#FF9D50] w-1/2">List - I</th>';
    tableHtml += '<th class="py-2.5 px-4 font-semibold text-[#20C4D0] w-1/2">List - II</th>';
    tableHtml += '</tr></thead><tbody class="divide-y divide-white/[0.04] text-zinc-300">';

    for (let i = 0; i < leftItems.length; i++) {
      tableHtml += `<tr><td class="py-2.5 px-4 font-medium text-white">${leftItems[i]}</td><td class="py-2.5 px-4">${rightItems[i]}</td></tr>`;
    }

    tableHtml += '</tbody></table></div>';
    return (preText.trim() + '\n\n' + tableHtml + '\n\n' + postText.trim()).trim();
  }

  return null;
}

/**
 * Detects columnar raw data blocks (e.g. van der Waals constants, probability distributions)
 * and converts them into structured HTML tables.
 */
function preprocessJeeTablesAndLists(raw: string): string {
  if (!raw) return '';

  // 1. Strip raw leftover style/colgroup/script tags from scraped dataset
  const cleaned = raw
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<colgroup[\s\S]*?<\/colgroup>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  // 2. Try Match List parser first
  const matchResult = parseMatchList(cleaned);
  if (matchResult) return matchResult;

  // 3. Try columnar table reconstruction
  const blocks = cleaned.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const resultBlocks: string[] = [];

  let i = 0;
  while (i < blocks.length) {
    const currentBlock = blocks[i];
    const lines = currentBlock.split('\n').map((l) => l.trim()).filter(Boolean);

    // Only process lines that do NOT contain math token placeholders
    const hasMathToken = lines.some((l) => l.includes('__MATH_TOKEN_'));

    if (!hasMathToken && lines.length >= 2 && lines.length <= 15) {
      const candidateCols = [lines];
      let j = i + 1;

      while (j < blocks.length) {
        const nextLines = blocks[j].split('\n').map((l) => l.trim()).filter(Boolean);
        const nextHasMath = nextLines.some((l) => l.includes('__MATH_TOKEN_'));
        if (!nextHasMath && nextLines.length === lines.length) {
          candidateCols.push(nextLines);
          j++;
        } else {
          break;
        }
      }

      // Found 2 or more contiguous columns of identical height -> Build structured table!
      if (candidateCols.length >= 2) {
        const numRows = lines.length;
        const headers = candidateCols.map((col) => col[0]);
        const rows: string[][] = [];

        for (let r = 1; r < numRows; r++) {
          const rowData = candidateCols.map((col) => col[r]);
          rows.push(rowData);
        }

        let tableHtml = '<div class="my-4 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02]">';
        tableHtml += '<table class="w-full text-xs text-left border-collapse">';
        tableHtml += '<thead class="bg-white/[0.04] text-zinc-300 font-semibold border-b border-white/[0.08]"><tr>';
        headers.forEach((h) => {
          tableHtml += `<th class="py-2.5 px-4 font-semibold text-zinc-200">${h}</th>`;
        });
        tableHtml += '</tr></thead><tbody class="divide-y divide-white/[0.04] text-zinc-300">';

        rows.forEach((r) => {
          tableHtml += '<tr>';
          r.forEach((cell, cellIdx) => {
            const isFirst = cellIdx === 0;
            tableHtml += `<td class="py-2 px-4 ${isFirst ? 'font-medium text-white' : ''}">${cell}</td>`;
          });
          tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table></div>';
        resultBlocks.push(tableHtml);

        i = j;
        continue;
      }
    }

    resultBlocks.push(currentBlock);
    i++;
  }

  return resultBlocks.join('\n\n');
}

/**
 * Splits input into math and non-math segments, parses tables, sub/sup tags, and returns HTML.
 */
export function formatJeeContent(raw: string): string {
  if (!raw) return '';

  // 1. Mask Math Blocks into tokens first to protect TeX formulas from text splitting!
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  const mathTokens: Array<{ tokenId: string; rendered: string }> = [];
  let tokenCounter = 0;

  const textWithTokens = raw.replace(mathRegex, (match) => {
    const tokenId = `__MATH_TOKEN_${tokenCounter++}__`;
    let isBlock = false;
    let mathContent = '';

    if (match.startsWith('$$') && match.endsWith('$$')) {
      isBlock = false;
      mathContent = match.slice(2, -2);
    } else if (match.startsWith('$') && match.endsWith('$')) {
      isBlock = false;
      mathContent = match.slice(1, -1);
    } else if (match.startsWith('\\[') && match.endsWith('\\]')) {
      isBlock = true;
      mathContent = match.slice(2, -2);
    } else if (match.startsWith('\\(') && match.endsWith('\\)')) {
      isBlock = false;
      mathContent = match.slice(2, -2);
    }

    mathContent = mathContent
      .replace(/<sub>(.*?)<\/sub>/gi, '_{$1}')
      .replace(/<sup>(.*?)<\/sup>/gi, '^{$1}');

    const rendered = renderKatexToString(mathContent, isBlock);
    mathTokens.push({ tokenId, rendered });
    return tokenId;
  });

  // 2. Preprocess non-math text for tables & lists
  const processedText = preprocessJeeTablesAndLists(textWithTokens)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ');

  // 3. Format HTML tags in non-table text
  let formatted = processedText
    .replace(/<sub>(.*?)<\/sub>/gi, '<sub class="text-[0.75em] bottom-[-0.2em] relative">$1</sub>')
    .replace(/<sup>(.*?)<\/sup>/gi, '<sup class="text-[0.75em] top-[-0.3em] relative">$1</sup>')
    .replace(/<b>(.*?)<\/b>/gi, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/<strong>(.*?)<\/strong>/gi, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/<i>(.*?)<\/i>/gi, '<em class="italic">$1</em>')
    .replace(/<em>(.*?)<\/em>/gi, '<em class="italic">$1</em>');

  // Replace line breaks outside tables
  const parts = formatted.split(/(<div class="my-4 overflow-x-auto[\s\S]*?<\/div>)/g);
  const finalParts = parts.map((part) => {
    if (part.startsWith('<div class="my-4 overflow-x-auto')) return part;
    return part.replace(/\n\n/g, '<div class="h-2"></div>').replace(/\n/g, '<br />');
  });

  formatted = finalParts.join('');

  // 4. Restore math tokens
  for (const { tokenId, rendered } of mathTokens) {
    formatted = formatted.replace(tokenId, rendered);
  }

  return formatted;
}

export function MathRenderer({ content, className = '', inline = false }: MathRendererProps) {
  const html = useMemo(() => formatJeeContent(content), [content]);

  if (inline) {
    return (
      <span
        className={`inline-math leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div
      className={`math-rendered-content leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Pre-processes text to normalize JEE math notations, delimiters, and HTML tags.
 */
function cleanLatex(latex: string): string {
  let cleaned = latex.trim();

  // Fix common JEE PYQ LaTeX oddities
  if (cleaned === '-' || cleaned === '$$ - $$' || cleaned === '$$-$$') {
    return '-';
  }

  // Normalize common math operators & symbols
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

    // If block has between 2 and 15 lines, check for adjacent columns of equal height
    if (lines.length >= 2 && lines.length <= 15) {
      const candidateCols = [lines];
      let j = i + 1;

      while (j < blocks.length) {
        const nextLines = blocks[j].split('\n').map((l) => l.trim()).filter(Boolean);
        if (nextLines.length === lines.length) {
          candidateCols.push(nextLines);
          j++;
        } else {
          break;
        }
      }

      // Found 2 or more columns of identical height -> Build structured table!
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

  // 1. Reconstruct tables and clean legacy scraping styles
  let text = preprocessJeeTablesAndLists(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ');

  // 2. Tokenize math blocks: $$...$$, $...$, \[...\], \(...\)
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;

  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text)) !== null) {
    const start = match.index;
    const end = mathRegex.lastIndex;

    // Push preceding text if any
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    const token = match[0];
    let isBlock = false;
    let mathContent = '';

    if (token.startsWith('$$') && token.endsWith('$$')) {
      isBlock = false;
      mathContent = token.slice(2, -2);
    } else if (token.startsWith('$') && token.endsWith('$')) {
      isBlock = false;
      mathContent = token.slice(1, -1);
    } else if (token.startsWith('\\[') && token.endsWith('\\]')) {
      isBlock = true;
      mathContent = token.slice(2, -2);
    } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
      isBlock = false;
      mathContent = token.slice(2, -2);
    }

    // Convert any embedded <sub>/<sup> inside math block into LaTeX _{} / ^{}
    mathContent = mathContent
      .replace(/<sub>(.*?)<\/sub>/gi, '_{$1}')
      .replace(/<sup>(.*?)<\/sup>/gi, '^{$1}');

    const renderedMath = renderKatexToString(mathContent, isBlock);
    parts.push(renderedMath);

    lastIndex = end;
  }

  // Push remainder
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // 3. Process remaining text chunks for standard tags (<sub>, <sup>, <b>, <i>, newlines)
  const processed = parts.map((part) => {
    // If it's already rendered KaTeX HTML or table wrapper, handle appropriately
    if (part.startsWith('<span class="katex') || part.startsWith('<span class="katex-display')) {
      return part;
    }

    // Process HTML formatting tags in text segments
    let chunk = part
      // Subscripts and superscripts
      .replace(/<sub>(.*?)<\/sub>/gi, '<sub class="text-[0.75em] bottom-[-0.2em] relative">$1</sub>')
      .replace(/<sup>(.*?)<\/sup>/gi, '<sup class="text-[0.75em] top-[-0.3em] relative">$1</sup>')
      // Bold and italics
      .replace(/<b>(.*?)<\/b>/gi, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/<strong>(.*?)<\/strong>/gi, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/<i>(.*?)<\/i>/gi, '<em class="italic">$1</em>')
      .replace(/<em>(.*?)<\/em>/gi, '<em class="italic">$1</em>');

    // If chunk contains HTML table markup, don't break table tags with <br />
    if (chunk.includes('<table') || chunk.includes('<div class="my-4 overflow-x-auto')) {
      return chunk;
    }

    // Otherwise apply paragraph and line breaks
    return chunk
      .replace(/\n\n/g, '<div class="h-2"></div>')
      .replace(/\n/g, '<br />');
  });

  return processed.join('');
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

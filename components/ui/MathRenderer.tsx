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
  // Replace standalone $$-$$ or - with proper minus symbol
  if (cleaned === '-' || cleaned === '$$ - $$' || cleaned === '$$-$$') {
    return '-';
  }

  // Normalize common math operators
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
 * Splits input into math and non-math segments, parses sub/sup tags, and returns HTML.
 */
export function formatJeeContent(raw: string): string {
  if (!raw) return '';

  // 1. First normalize HTML breaks
  let text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ');

  // 2. Tokenize math blocks: $$...$$, $...$, \[...\], \(...\)
  // Regex to match math delimiters
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
      isBlock = false; // Render inline within flow unless standalone paragraph
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
    // If it's already rendered KaTeX HTML, preserve it
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
      .replace(/<em>(.*?)<\/em>/gi, '<em class="italic">$1</em>')
      // Clean up newlines into spacing
      .replace(/\n\n/g, '<div class="h-2"></div>')
      .replace(/\n/g, '<br />');

    return chunk;
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

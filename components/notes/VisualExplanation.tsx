'use client';

import React, { useMemo } from 'react';
import { MathRenderer } from '@/components/ui/MathRenderer';
import { QuestionSubject, OptionLabel } from '@prisma/client';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Compass,
  Hash,
} from 'lucide-react';

interface QuestionOption {
  id: string;
  label: OptionLabel;
  text: string;
  position: number;
}

interface VisualExplanationProps {
  question: {
    id: string;
    text: string;
    subject: QuestionSubject;
    chapter: string;
    topic: string | null;
    year: number | null;
    paperTitle: string | null;
    difficulty: string | null;
    correctOption: OptionLabel;
    explanation: string | null;
    options: QuestionOption[];
  };
  keyTakeaway?: string | null;
  userNote?: string | null;
  conceptDiagnostic?: {
    weaknessLevel?: string;
    urgencyScore?: number;
    recommendedAction?: string;
    diagnosticTags?: string[];
  };
  compact?: boolean;
}

/**
 * Extracts discrete logical steps from a worked solution explanation.
 */
function parseExplanationSteps(rawExp: string | null): Array<{ title: string; content: string }> {
  if (!rawExp) return [];

  // Remove raw source image tags first so they don't break step parsing
  const cleaned = rawExp.replace(/<source[\s\S]*?>/gi, '').trim();

  // Split by double newline or numbered marker
  const rawParagraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (rawParagraphs.length <= 1) {
    return [{ title: 'Worked Solution', content: cleaned }];
  }

  const steps: Array<{ title: string; content: string }> = [];
  let currentGroup: string[] = [];
  let stepIndex = 1;

  for (let i = 0; i < rawParagraphs.length; i++) {
    const p = rawParagraphs[i];
    const isStepMarker =
      /^(step\s*\d+|given|now|from|substituting|therefore|hence|so|squaring|let|by|we know)/i.test(p) ||
      p.includes('$$\\Rightarrow$$') ||
      p.includes('$$\\therefore$$');

    if (isStepMarker && currentGroup.length > 0) {
      steps.push({
        title: `Step ${stepIndex++}`,
        content: currentGroup.join('\n\n'),
      });
      currentGroup = [p];
    } else {
      currentGroup.push(p);
    }
  }

  if (currentGroup.length > 0) {
    steps.push({
      title: `Step ${stepIndex}`,
      content: currentGroup.join('\n\n'),
    });
  }

  // If it ended up with only 1 huge step or too many tiny steps, normalize
  if (steps.length > 6) {
    // Group into 3-4 consolidated phases
    const consolidated: Array<{ title: string; content: string }> = [];
    const chunkSize = Math.ceil(steps.length / 3);
    for (let c = 0; c < steps.length; c += chunkSize) {
      const chunk = steps.slice(c, c + chunkSize);
      consolidated.push({
        title: c === 0 ? 'Initial Formulation' : c + chunkSize >= steps.length ? 'Final Deduction' : 'Core Working',
        content: chunk.map((s) => s.content).join('\n\n'),
      });
    }
    return consolidated;
  }

  return steps.length > 0 ? steps : [{ title: 'Step-by-Step Solution', content: cleaned }];
}

/**
 * Safe Cartesian coordinate diagram renderer for 2D geometry/lines.
 */
function CoordinateDiagram({ text, chapter }: { text: string; chapter: string }) {
  const isGeometryOrLines =
    chapter.toLowerCase().includes('straight line') ||
    chapter.toLowerCase().includes('circle') ||
    chapter.toLowerCase().includes('conic') ||
    chapter.toLowerCase().includes('triangle') ||
    text.includes('(2, 3)') ||
    text.includes('(0, 1)');

  if (!isGeometryOrLines) return null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#07090D] p-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 font-medium text-zinc-300">
          <Compass className="w-3.5 h-3.5 text-[#50D97A]" />
          <span>Coordinate Reference & Geometry Plane</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">2D Cartesian Grid</span>
      </div>

      <div className="w-full h-48 sm:h-56 relative rounded-lg border border-white/[0.05] bg-black/40 overflow-hidden flex items-center justify-center select-none">
        <svg viewBox="0 0 400 240" className="w-full h-full text-zinc-600">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="400" height="240" fill="url(#grid)" />

          {/* X and Y Axes */}
          <line x1="20" y1="120" x2="380" y2="120" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
          <line x1="200" y1="10" x2="200" y2="230" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

          {/* Axis Labels */}
          <text x="385" y="124" fill="#A1A1AA" fontSize="10" fontFamily="monospace">x</text>
          <text x="204" y="16" fill="#A1A1AA" fontSize="10" fontFamily="monospace">y</text>
          <text x="188" y="134" fill="#71717A" fontSize="9" fontFamily="monospace">O</text>

          {/* Illustrative Geometry Overlay */}
          <line x1="80" y1="180" x2="320" y2="60" stroke="#FF9D50" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="80" y1="60" x2="320" y2="180" stroke="#20C4D0" strokeWidth="2" />

          {/* Key Reference Points */}
          <circle cx="200" cy="120" r="3" fill="#FFFFFF" />
          <circle cx="260" cy="90" r="4" fill="#FF9D50" />
          <text x="268" y="88" fill="#FF9D50" fontSize="10" fontFamily="monospace" fontWeight="bold">P(x₁, y₁)</text>

          <circle cx="140" cy="150" r="4" fill="#20C4D0" />
          <text x="96" y="152" fill="#20C4D0" fontSize="10" fontFamily="monospace">Q(x₂, y₂)</text>
        </svg>

        <div className="absolute bottom-2 right-3 text-[10px] font-mono text-zinc-500 bg-black/60 px-2 py-0.5 rounded border border-white/[0.06]">
          Scale: Dynamic Norm
        </div>
      </div>
    </div>
  );
}

export function VisualExplanation({
  question,
  keyTakeaway,
  userNote,
  conceptDiagnostic,
  compact = false,
}: VisualExplanationProps) {
  const steps = useMemo(() => parseExplanationSteps(question.explanation), [question.explanation]);

  const subjectBadge = () => {
    switch (question.subject) {
      case 'PHYSICS':
        return { label: 'Physics', color: 'text-[#FF9D50] bg-[#FF9D50]/10 border-[#FF9D50]/30' };
      case 'CHEMISTRY':
        return { label: 'Chemistry', color: 'text-[#20C4D0] bg-[#20C4D0]/10 border-[#20C4D0]/30' };
      case 'MATHEMATICS':
        return { label: 'Mathematics', color: 'text-[#50D97A] bg-[#50D97A]/10 border-[#50D97A]/30' };
      default:
        return { label: question.subject, color: 'text-zinc-300 bg-white/[0.05] border-white/[0.1]' };
    }
  };

  const badge = subjectBadge();

  return (
    <div className={`space-y-6 ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* 1. Header Metadata & Weakness Alert */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-zinc-400 font-medium text-xs">
              {question.chapter}
              {question.topic && <span className="text-zinc-500"> · {question.topic}</span>}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
            {question.year && <span>{question.year}</span>}
            {question.paperTitle && <span>· {question.paperTitle}</span>}
            {question.difficulty && (
              <span className="uppercase text-zinc-400">· {question.difficulty}</span>
            )}
          </div>
        </div>

        {/* Weakness Banner if diagnosed */}
        {conceptDiagnostic && conceptDiagnostic.weaknessLevel && conceptDiagnostic.weaknessLevel !== 'MASTERED' && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.07] text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-red-300">
                  {conceptDiagnostic.weaknessLevel === 'CRITICAL_WEAKNESS' ? 'Critical Weak Concept' : 'Developing Concept'}
                </span>
                {conceptDiagnostic.urgencyScore !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-500/20 text-red-300">
                    Priority {conceptDiagnostic.urgencyScore}/100
                  </span>
                )}
              </div>
              <p className="text-zinc-300 text-[11px] mt-0.5">
                {conceptDiagnostic.recommendedAction || 'Recommended: Review foundational formulas and drill 5 targeted questions.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Original Question Statement */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0C0E14] p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
          <span>Original Question</span>
        </div>

        <div className="text-white leading-relaxed text-sm">
          <MathRenderer content={question.text} />
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
          {question.options.map((opt) => {
            const isCorrect = opt.label === question.correctOption;
            return (
              <div
                key={opt.id}
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                  isCorrect
                    ? 'border-emerald-500/40 bg-emerald-500/[0.08] text-white shadow-sm'
                    : 'border-white/[0.06] bg-white/[0.02] text-zinc-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0 font-mono ${
                    isCorrect
                      ? 'bg-emerald-400 text-[#080A0E]'
                      : 'bg-white/[0.06] text-zinc-400'
                  }`}
                >
                  {opt.label}
                </span>
                <div className="min-w-0 flex-1">
                  <MathRenderer content={opt.text} inline />
                </div>
                {isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 self-center" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. High-Yield Key Takeaway Box */}
      {keyTakeaway && (
        <div className="rounded-xl border border-[#FF9D50]/30 bg-[#FF9D50]/[0.06] p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF9D50]">
            <Lightbulb className="w-4 h-4" />
            <span>Key Principle & Exam Takeaway</span>
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed font-normal">
            {keyTakeaway}
          </p>
        </div>
      )}

      {/* 4. Coordinate Reference Diagram (if applicable) */}
      <CoordinateDiagram text={question.text} chapter={question.chapter} />

      {/* 5. Visual Step-by-Step Worked Solution */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0C0E14] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#FF9D50]" />
            <span>Step-by-Step Visual Solution</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Correct: Option {question.correctOption}
          </span>
        </div>

        {/* Step Breakdown */}
        <div className="space-y-4">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-white/[0.05] bg-white/[0.015] space-y-2"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <span className="w-5 h-5 rounded-md bg-[#FF9D50]/15 text-[#FF9D50] border border-[#FF9D50]/30 flex items-center justify-center text-[10px] font-mono">
                  {idx + 1}
                </span>
                <span>{s.title}</span>
              </div>
              <div className="text-zinc-300 text-xs leading-relaxed pl-7">
                <MathRenderer content={s.content} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. User's Personal Notes & Reflections */}
      {userNote && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0C0E14] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <Hash className="w-3.5 h-3.5 text-zinc-500" />
            <span>My Personal Revision Note</span>
          </div>
          <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {userNote}
          </p>
        </div>
      )}
    </div>
  );
}

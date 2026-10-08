'use client';

import React from 'react';
import { X, BookOpen, Award, Flame, Zap, ShieldCheck } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.12] bg-[#0C0E14] p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF9D50]/10 border border-[#FF9D50]/20 flex items-center justify-center text-[#FF9D50]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Crackrr Guide & Help
              </h2>
              <p className="text-xs text-zinc-400">Everything you need to master your JEE practice</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Close Help"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Sections */}
        <div className="space-y-4 text-xs leading-relaxed text-zinc-300">
          {/* Practice */}
          <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <BookOpen className="w-4 h-4 text-[#FF9D50]" />
              <span>Practice & Real JEE Questions</span>
            </div>
            <p className="text-zinc-400">
              Practice verified 2020–2025 JEE Main questions across Physics, Chemistry, and Mathematics. Filter by chapter or difficulty, and get step-by-step LaTeX explanations after every question.
            </p>
          </div>

          {/* XP & Level Scaling */}
          <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Award className="w-4 h-4 text-[#20C4D0]" />
              <span>XP & Level-Scaled Scoring</span>
            </div>
            <p className="text-zinc-400">
              Correct answers award +20 XP. To reflect competitive exam rigor, wrong answers incur negative XP penalties as your rank tier climbs (Level 1: +1 XP token, Level 2–3: 0 XP, Level 4–6: -2 XP, Level 7–10: -5 XP, Level 11+: -10 XP).
            </p>
          </div>

          {/* Streaks & Daily Rewards */}
          <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Flame className="w-4 h-4 text-[#50D97A]" />
              <span>Daily Rewards & Streaks</span>
            </div>
            <p className="text-zinc-400">
              Log in daily to claim up to +75 XP in streak bonuses across the 7-day reward cycle. Solve at least 1 problem each calendar day to keep your active streak unbroken.
            </p>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#FF9D50]" />
              <span>Keyboard Shortcuts</span>
            </div>
            <p className="text-zinc-400">
              During practice: Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-white font-mono text-[10px]">A</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-white font-mono text-[10px]">B</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-white font-mono text-[10px]">C</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-white font-mono text-[10px]">D</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-white font-mono text-[10px]">1</kbd>–<kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-white font-mono text-[10px]">4</kbd> to pick an option, and <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-white font-mono text-[10px]">Enter</kbd> to submit/continue.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

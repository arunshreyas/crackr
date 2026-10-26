'use client';

import React from 'react';
import Link from 'next/link';
import { RotateCcw, CheckCircle2, Zap, ArrowRight, BookOpen } from 'lucide-react';

interface EmptyRevisionStateProps {
  hasHistory: boolean;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

export function EmptyRevisionState({
  hasHistory,
  onClearFilters,
  hasActiveFilters,
}: EmptyRevisionStateProps) {
  if (!hasHistory) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-8 sm:p-12 text-center space-y-5 max-w-xl mx-auto my-6">
        <div className="w-14 h-14 rounded-2xl bg-[#FF9D50]/10 border border-[#FF9D50]/20 flex items-center justify-center text-[#FF9D50] mx-auto shadow-inner">
          <RotateCcw className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white tracking-tight">
            Smart Revision queue is ready
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
            Solve practice questions across Physics, Chemistry, and Mathematics to automatically uncover weak concepts and missed questions. They will be scheduled here for scientific spaced retention.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/practice"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-bold transition-all shadow-md active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Start Practice Session</span>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-semibold transition-all border border-white/[0.08]"
          >
            <BookOpen className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto my-6">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
        <CheckCircle2 className="w-6 h-6" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-white tracking-tight">
          {hasActiveFilters ? 'No revision items match your filter' : 'All caught up with Smart Revision!'}
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {hasActiveFilters
            ? 'Try clearing your subject, status, or due filters to view the rest of your revision queue.'
            : 'You have reviewed all currently due concepts in this spaced repetition cycle. Continue regular practice to maintain recall.'}
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3">
        {hasActiveFilters && onClearFilters ? (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-semibold transition-all border border-white/[0.08]"
          >
            <span>Clear Filters</span>
          </button>
        ) : null}

        <Link
          href="/practice"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-bold transition-all shadow-sm"
        >
          <span>Start Practice Drill</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

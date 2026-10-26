'use client';

import React from 'react';
import { RevisionProgressSummary } from '@/lib/server/revision/types';
import { Flame, Clock, CheckCircle2, RotateCcw, Target, AlertTriangle } from 'lucide-react';

interface RevisionProgressCardProps {
  progress: RevisionProgressSummary;
  onSelectDueOnly?: () => void;
  isDueOnlyActive?: boolean;
}

export function RevisionProgressCard({
  progress,
  onSelectDueOnly,
  isDueOnlyActive,
}: RevisionProgressCardProps) {
  const {
    totalQueueItems,
    dueTodayCount,
    reviewedCount,
    needsPracticeCount,
    overallMasteryPercent,
    revisionStreakDays,
    subjectDistribution,
  } = progress;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-5 sm:p-6 space-y-5">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF9D50]/10 border border-[#FF9D50]/20 flex items-center justify-center text-[#FF9D50]">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Revision Progress & Spaced Repetition
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Personalised retention intervals based on your error rates and review outcomes
            </p>
          </div>
        </div>

        {/* Streak and Health Badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
            <Flame className="w-4 h-4 fill-current" />
            <span>{revisionStreakDays} Day Streak</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs font-medium">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Mastery: <strong className="text-white">{overallMasteryPercent}%</strong></span>
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Due Today (Clickable Filter) */}
        <button
          onClick={onSelectDueOnly}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            isDueOnlyActive
              ? 'bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/30'
              : 'bg-white/[0.02] border-white/[0.06] hover:border-amber-500/30 hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Due for Review</span>
            <Clock className={`w-4 h-4 ${dueTodayCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold font-mono ${dueTodayCount > 0 ? 'text-amber-400' : 'text-zinc-300'}`}>
              {dueTodayCount}
            </span>
            <span className="text-[11px] text-zinc-500">concepts</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">
            {isDueOnlyActive ? 'Filtering due only' : 'Click to filter'}
          </p>
        </button>

        {/* Reviewed in current cycle */}
        <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Reviewed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {reviewedCount}
            </span>
            <span className="text-[11px] text-zinc-500">retained</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Scheduled for next cycle</p>
        </div>

        {/* Needs Practice */}
        <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Needs Practice</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-orange-400">
              {needsPracticeCount}
            </span>
            <span className="text-[11px] text-zinc-500">drills</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Due within 24h</p>
        </div>

        {/* Total Queue Size */}
        <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Active Queue</span>
            <RotateCcw className="w-4 h-4 text-[#FF9D50]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white">
              {totalQueueItems}
            </span>
            <span className="text-[11px] text-zinc-500">total</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Physics · Chem · Math</p>
        </div>
      </div>

      {/* Subject Distribution Bar */}
      <div className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <span className="text-zinc-400 font-medium">Subject Distribution:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF9D50]/10 border border-[#FF9D50]/25 text-[#FF9D50]">
            <span className="font-semibold">Physics:</span>
            <span>{subjectDistribution.PHYSICS.total} items ({subjectDistribution.PHYSICS.due} due)</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#20C4D0]/10 border border-[#20C4D0]/25 text-[#20C4D0]">
            <span className="font-semibold">Chemistry:</span>
            <span>{subjectDistribution.CHEMISTRY.total} items ({subjectDistribution.CHEMISTRY.due} due)</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#50D97A]/10 border border-[#50D97A]/25 text-[#50D97A]">
            <span className="font-semibold">Mathematics:</span>
            <span>{subjectDistribution.MATHEMATICS.total} items ({subjectDistribution.MATHEMATICS.due} due)</span>
          </div>
        </div>
      </div>
    </section>
  );
}

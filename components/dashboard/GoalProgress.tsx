'use client';

import React from 'react';
import { DashboardData } from '@/lib/services/dashboard';

interface GoalProgressProps {
  today: DashboardData['today'];
}

export function GoalProgress({ today }: GoalProgressProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-6 flex flex-col justify-between space-y-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
            Today&apos;s Target
          </span>
          {today.isCompleted ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#50D97A] bg-[#50D97A]/10 px-2.5 py-0.5 rounded-full border border-[#50D97A]/20">
              Goal completed ✓
            </span>
          ) : (
            <span className="text-xs text-zinc-400 font-medium">
              {today.remaining} to go
            </span>
          )}
        </div>

        {/* Big Numbers & Progress */}
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-white tracking-tight">
                {today.solved}
              </span>
              <span className="text-sm text-zinc-400 font-medium">
                / {today.target} questions
              </span>
            </div>
            <span className="text-xs font-semibold text-zinc-400">
              {today.progressPercentage}%
            </span>
          </div>

          {/* Progress Bar with Crackr Orange/Green */}
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full transition-all duration-700 rounded-full ${
                today.isCompleted ? 'bg-[#50D97A]' : 'bg-[#FF9D50]'
              }`}
              style={{ width: `${today.progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sub-Metrics Row */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
        <div className="rounded-xl bg-white/[0.02] p-2.5 text-center">
          <span className="text-[11px] text-zinc-400 block">Accuracy</span>
          <span className="text-sm font-semibold text-white mt-0.5 block">
            {today.accuracy !== null ? `${today.accuracy}%` : '—'}
          </span>
        </div>
        <div className="rounded-xl bg-white/[0.02] p-2.5 text-center">
          <span className="text-[11px] text-zinc-400 block">Time</span>
          <span className="text-sm font-semibold text-white mt-0.5 block">
            {today.solved > 0 ? `${today.minutesPracticed}m` : '—'}
          </span>
        </div>
        <div className="rounded-xl bg-white/[0.02] p-2.5 text-center">
          <span className="text-[11px] text-zinc-400 block">XP</span>
          <span className="text-sm font-semibold text-[#FFF9D8] mt-0.5 block">
            +{today.xpEarned}
          </span>
        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import { DashboardData } from '@/lib/services/dashboard';

interface ConsistencyProps {
  consistency: DashboardData['consistency'];
}

export function Consistency({ consistency }: ConsistencyProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Study consistency
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {consistency.daysPracticedThisWeek} of 7 days practiced this week
          </p>
        </div>
        <div className="text-xs font-medium text-zinc-400">
          Current streak:{' '}
          <span className="text-[#50D97A] font-semibold">
            {consistency.currentStreak} {consistency.currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>
      </div>

      {/* 7 Days Row */}
      <div className="grid grid-cols-7 gap-2 pt-2">
        {consistency.weekDays.map((d) => (
          <div
            key={d.dateStr}
            className={`rounded-xl p-3 flex flex-col items-center justify-center space-y-2 border transition-all ${
              d.isToday
                ? 'border-[#FF9D50]/60 bg-[#FF9D50]/10'
                : 'border-white/[0.06] bg-white/[0.01]'
            }`}
          >
            <span
              className={`text-[11px] font-medium ${
                d.isToday ? 'text-white' : 'text-zinc-400'
              }`}
            >
              {d.dayName}
            </span>

            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                d.practiced
                  ? 'bg-[#50D97A] text-black font-bold'
                  : d.isToday
                  ? 'border border-[#FF9D50] text-[#FF9D50]'
                  : 'text-zinc-600'
              }`}
            >
              {d.practiced ? '✓' : '·'}
            </div>

            <span className="text-[10px] text-zinc-400 font-normal">
              {d.count > 0 ? `${d.count} Qs` : '—'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

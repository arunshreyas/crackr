'use client';

import React from 'react';
import { DashboardData } from '@/lib/services/dashboard';

interface ConsistencyProps {
  consistency: DashboardData['consistency'];
}

export function Consistency({ consistency }: ConsistencyProps) {
  return (
    <section className="rounded-2xl border border-[#2A3145] bg-[#0C0E14] p-6 space-y-4">
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
          <span className="text-[#578EF5] font-semibold">
            {consistency.currentStreak} {consistency.currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>
      </div>

      {/* Unified 7 Days Row */}
      <div className="grid grid-cols-7 gap-2 pt-2">
        {consistency.weekDays.map((d) => (
          <div
            key={d.dateStr}
            className={`rounded-xl p-3 flex flex-col items-center justify-center space-y-2 border transition-all ${
              d.isToday
                ? 'border-[#2373F4] bg-[#2373F4]/10'
                : 'border-[#2A3145]/40 bg-white/[0.01]'
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
                  ? 'bg-[#2373F4] text-white'
                  : d.isToday
                  ? 'border border-[#2373F4] text-zinc-400'
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

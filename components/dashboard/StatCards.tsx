'use client';

import React from 'react';
import { DashboardData } from '@/lib/services/dashboard';

interface StatCardsProps {
  overview: DashboardData['overview'];
}

export function StatCards({ overview }: StatCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-4">
      {/* 1. Questions Solved */}
      <div className="rounded-2xl border border-[#2A3145] bg-[#0C0E14] p-5 flex flex-col justify-between hover:border-[#578EF5]/40 transition-colors">
        <span className="text-xs font-medium text-zinc-400">Questions solved</span>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {overview.questionsSolved.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-medium">
            {overview.questionsSolvedChange ? (
              <span className="text-[#65D0F4]">
                {overview.questionsSolvedChange.label}
              </span>
            ) : (
              <span className="text-zinc-400">Total practice volume</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Accuracy */}
      <div className="rounded-2xl border border-[#2A3145] bg-[#0C0E14] p-5 flex flex-col justify-between hover:border-[#578EF5]/40 transition-colors">
        <span className="text-xs font-medium text-zinc-400">Accuracy</span>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {overview.accuracy !== null ? `${overview.accuracy}%` : '—'}
          </div>
          <div className="mt-1 text-[11px] font-medium">
            {overview.accuracyChange ? (
              <span className="text-[#65D0F4]">
                {overview.accuracyChange.label}
              </span>
            ) : (
              <span className="text-zinc-400">Across all sessions</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Current Streak */}
      <div className="rounded-2xl border border-[#2A3145] bg-[#0C0E14] p-5 flex flex-col justify-between hover:border-[#578EF5]/40 transition-colors">
        <span className="text-xs font-medium text-zinc-400">Current streak</span>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {overview.currentStreak}{' '}
            <span className="text-base font-normal text-zinc-400">
              {overview.currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 font-medium">
            Best: {overview.longestStreak} days
          </div>
        </div>
      </div>

      {/* 4. Total XP */}
      <div className="rounded-2xl border border-[#2A3145] bg-[#0C0E14] p-5 flex flex-col justify-between hover:border-[#578EF5]/40 transition-colors">
        <span className="text-xs font-medium text-zinc-400">Total XP</span>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold text-[#F2F7A0] tracking-tight">
            {overview.totalXp.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-[#F2F7A0]/70 font-medium">
            +{overview.xpThisWeek.toLocaleString()} this week
          </div>
        </div>
      </div>
    </section>
  );
}

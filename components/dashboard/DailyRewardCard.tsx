'use client';

import React from 'react';
import { DailyLoginStatus } from '@/lib/server/gamification/service';
import { Gift, Flame, Check, Sparkles } from 'lucide-react';

interface DailyRewardCardProps {
  dailyReward: DailyLoginStatus;
}

export function DailyRewardCard({ dailyReward }: DailyRewardCardProps) {
  const { streakDay, rewardsTrack, rewardXp, newlyClaimed } = dailyReward;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-5 sm:p-6 transition-all">
      {/* Background Accent Gradient */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-[#FF9D50]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF9D50]/10 border border-[#FF9D50]/20 flex items-center justify-center text-[#FF9D50]">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Daily Login Rewards
              </h2>
              {newlyClaimed && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                  <Sparkles className="w-3 h-3" /> Claimed Today
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Log in daily to scale your streak multiplier and earn bonus XP.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-xl">
          <Flame className="w-4 h-4 text-[#FF9D50]" />
          <span className="text-xs font-medium text-zinc-300">
            Day <strong className="text-white">{streakDay}</strong> Streak Reward:{' '}
            <strong className="text-[#FF9D50]">+{rewardXp} XP</strong>
          </span>
        </div>
      </div>

      {/* 7-Day Rewards Track */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3 mt-5">
        {rewardsTrack.map((item) => {
          const isToday = item.isCurrent;
          const isPast = item.isClaimed && !isToday;
          const isFuture = !item.isClaimed;

          return (
            <div
              key={item.day}
              className={`relative rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-between min-h-[82px] border transition-all ${
                isToday
                  ? 'border-[#FF9D50] bg-[#FF9D50]/10 shadow-[0_0_15px_rgba(255,157,80,0.15)]'
                  : isPast
                  ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                  : 'border-white/[0.06] bg-white/[0.01]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-[10px] sm:text-[11px] font-medium ${
                    isToday ? 'text-[#FF9D50]' : isPast ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                >
                  D{item.day}
                </span>
                {isPast && <Check className="w-3 h-3 text-emerald-400" />}
                {isToday && (
                  <span className="w-2 h-2 rounded-full bg-[#FF9D50] shadow-[0_0_6px_#FF9D50]" />
                )}
              </div>

              <div className="my-1 flex flex-col items-center">
                <span
                  className={`text-xs sm:text-sm font-bold tracking-tight ${
                    isToday
                      ? 'text-white'
                      : isPast
                      ? 'text-zinc-300'
                      : 'text-zinc-400'
                  }`}
                >
                  +{item.xp}
                </span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">
                  XP
                </span>
              </div>

              <span
                className={`text-[9px] font-medium truncate w-full text-center ${
                  isToday
                    ? 'text-[#FF9D50]'
                    : isPast
                    ? 'text-emerald-400/80'
                    : 'text-zinc-600'
                }`}
              >
                {isPast ? 'Claimed' : isToday ? 'Today' : item.day === 7 ? 'Champion' : `Day ${item.day}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

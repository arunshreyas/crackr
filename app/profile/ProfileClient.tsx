'use client';

import React from 'react';
import Link from 'next/link';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { ProfileData } from '@/lib/server/profile/service';
import {
  User,
  Zap,
  Award,
  Flame,
  Target,
  GraduationCap,
  Calendar,
  Settings,
  BookOpen,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface ProfileClientProps {
  data: ProfileData;
}

export function ProfileClient({ data }: ProfileClientProps) {
  const { user, gamification, achievements, stats } = data;
  const unlockedAchievementsCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className="min-h-screen bg-[#080A0E] text-zinc-100 flex selection:bg-[#FF9D50]/30 selection:text-[#FFF9D8]">
      {/* App Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        {/* Top Header */}
        <header className="border-b border-white/[0.08] bg-[#0C0E14]/70 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <User className="w-5 h-5 text-[#FF9D50]" />
              Student Profile
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Rank, level progression, badges, and learning identity
            </p>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-200 transition-all"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Settings</span>
          </Link>
        </header>

        {/* Profile Body */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
          {/* 1. Student Identity Banner */}
          <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF9D50]/5 blur-3xl rounded-full pointer-events-none -mr-20 -mt-20" />

            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#FF9D50]/10 border border-[#FF9D50]/30 flex items-center justify-center text-3xl sm:text-4xl shrink-0">
                {gamification.rankInfo.badge}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {user.name}
                  </h2>
                  <span className="text-xs text-zinc-400">@{user.username}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FF9D50]/15 text-[#FF9D50] border border-[#FF9D50]/30">
                    {gamification.rankInfo.rank} (Tier {gamification.rankInfo.tier})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                    {user.school || 'JEE Aspirant'}
                  </span>
                  <span>•</span>
                  <span>{user.grade}</span>
                  <span>•</span>
                  <span>{user.stream}</span>
                  <span>•</span>
                  <span className="text-[#20C4D0] font-medium">{user.targetExam}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <Link
                href="/practice"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99]"
              >
                <Zap className="w-4 h-4" />
                <span>Start Practice</span>
              </Link>
            </div>
          </section>

          {/* 2. Gamification & Progression Stats Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Level Progression Card */}
            <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-[#FFF9D8]/10 text-[#FFF9D8]">
                    <Zap className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Level Progress
                  </span>
                </div>
                <span className="text-lg font-bold text-[#FFF9D8]">
                  Level {gamification.levelInfo.level}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-zinc-400">XP in Level</span>
                  <span className="text-white font-medium">
                    {gamification.levelInfo.currentLevelXp} / {gamification.levelInfo.nextLevelXp} XP
                  </span>
                </div>
                <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#FFF9D8] transition-all duration-500"
                    style={{ width: `${gamification.levelInfo.progressPercentage}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-zinc-400 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <span>Total XP</span>
                <span className="text-white font-semibold">{gamification.xp.toLocaleString()} XP</span>
              </div>
            </div>

            {/* Rank Tier Card */}
            <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-[#FF9D50]/10 text-[#FF9D50]">
                    <Award className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Current Rank
                  </span>
                </div>
                <span className="text-2xl">{gamification.rankInfo.badge}</span>
              </div>

              <div>
                <div className="text-xl font-bold text-white tracking-tight">
                  {gamification.rankInfo.rank}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {gamification.rankInfo.nextRank ? (
                    <span>
                      Needs{' '}
                      <strong className="text-[#FF9D50]">
                        {gamification.rankInfo.xpToNextRank} XP
                      </strong>{' '}
                      for {gamification.rankInfo.nextRank}
                    </span>
                  ) : (
                    <span className="text-[#50D97A]">Maximum Rank Tier Achieved!</span>
                  )}
                </div>
              </div>

              <div className="text-xs text-zinc-400 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <span>Daily Practice Goal</span>
                <span className="text-white font-semibold">{user.dailyGoal} questions / day</span>
              </div>
            </div>

            {/* Consistency & Streaks Card */}
            <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-[#50D97A]/10 text-[#50D97A]">
                    <Flame className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Daily Streak
                  </span>
                </div>
                <span className="text-lg font-bold text-[#50D97A]">
                  {gamification.streakInfo.currentStreak} Days
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center py-1">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5">
                  <div className="text-[11px] text-zinc-400">Current Streak</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {gamification.streakInfo.currentStreak}d
                  </div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5">
                  <div className="text-[11px] text-zinc-400">Longest Streak</div>
                  <div className="text-lg font-bold text-[#FF9D50] mt-0.5">
                    {gamification.streakInfo.longestStreak}d
                  </div>
                </div>
              </div>

              <div className="text-xs text-zinc-400 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <span>Accuracy</span>
                <span className="text-[#20C4D0] font-semibold">
                  {stats.accuracy !== null ? `${stats.accuracy}%` : '—'} ({stats.questionsCorrect}/{stats.questionsAnswered})
                </span>
              </div>
            </div>
          </section>

          {/* 3. Competitive Rank Ladder */}
          <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <Award className="w-5 h-5 text-[#FF9D50]" />
                JEE Rank Ladder
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Progress through 7 mastery tiers by solving questions and keeping consistency
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {(gamification.allRanks || []).map((tier, idx) => {
                const isCurrent = gamification.rankInfo.rank === tier.name;
                const isUnlocked = gamification.xp >= tier.minXp;

                return (
                  <div
                    key={tier.name}
                    className={`rounded-xl p-4 border flex flex-col justify-between text-center transition-all ${
                      isCurrent
                        ? 'bg-[#FF9D50]/15 border-[#FF9D50] ring-1 ring-[#FF9D50]/30 shadow-lg'
                        : isUnlocked
                        ? 'bg-white/[0.03] border-white/[0.12]'
                        : 'bg-white/[0.01] border-white/[0.04] opacity-50'
                    }`}
                  >
                    <div className="space-y-2">
                      <span className="text-3xl block">{tier.badge}</span>
                      <div className="font-semibold text-xs text-white tracking-tight">
                        {tier.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium">
                        Tier {idx + 1}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px]">
                      {isCurrent ? (
                        <span className="text-[#FF9D50] font-bold">Current</span>
                      ) : isUnlocked ? (
                        <span className="text-[#50D97A] font-medium">Unlocked ✓</span>
                      ) : (
                        <span className="text-zinc-500 font-medium">{tier.minXp.toLocaleString()} XP</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. Level Roadmap & Milestones */}
          <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#FFF9D8]" />
                Level Progression Roadmap
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Track your journey across 25 mastery levels. Each question and session propels you forward.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2.5">
              {(gamification.levelThresholds || []).slice(0, 25).map((threshold, index) => {
                const lvl = index + 1;
                const isCurrent = gamification.levelInfo.level === lvl;
                const isPassed = gamification.levelInfo.level > lvl;

                return (
                  <div
                    key={lvl}
                    className={`rounded-xl p-3 border text-center transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-[#FFF9D8]/10 border-[#FFF9D8] ring-1 ring-[#FFF9D8]/30 shadow-md'
                        : isPassed
                        ? 'bg-white/[0.03] border-white/[0.1]'
                        : 'bg-white/[0.01] border-white/[0.04] opacity-40'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-400 block uppercase">
                        Lv.{lvl}
                      </span>
                      <span className="text-xs font-bold text-white block mt-0.5">
                        {threshold.toLocaleString()} XP
                      </span>
                    </div>

                    <div className="mt-2 text-[9px]">
                      {isCurrent ? (
                        <span className="text-[#FFF9D8] font-bold">Active</span>
                      ) : isPassed ? (
                        <span className="text-[#50D97A] font-medium">Done</span>
                      ) : (
                        <span className="text-zinc-600">Locked</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. Achievements Trophy Case */}
          <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#FFF9D8]" />
                  Achievements Trophy Case
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Unlock badges and bonus XP by achieving study milestones
                </p>
              </div>

              <div className="text-xs font-medium px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#FFF9D8] self-start sm:self-auto">
                {unlockedAchievementsCount} / {achievements.length} Unlocked
              </div>
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((ach) => {
                return (
                  <div
                    key={ach.code}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                      ach.isUnlocked
                        ? 'bg-white/[0.03] border-white/[0.12] hover:border-white/[0.2]'
                        : 'bg-white/[0.01] border-white/[0.04] opacity-60'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                          {ach.icon}
                        </span>
                        {ach.isUnlocked ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#50D97A] bg-[#50D97A]/10 px-2 py-0.5 rounded-full border border-[#50D97A]/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Unlocked
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                            <Lock className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-semibold text-white text-sm">
                          {ach.title}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {ach.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="text-[#FF9D50] font-semibold">+{ach.xpReward} XP</span>
                      {ach.isUnlocked && ach.unlockedAt && (
                        <span className="text-zinc-400 text-[11px]">
                          {new Date(ach.unlockedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

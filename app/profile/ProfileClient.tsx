'use client';

import React, { useState } from 'react';
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
  Trophy,
  Crown,
  Medal,
  Crosshair,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ProfileClientProps {
  data: ProfileData;
}

type LeaderboardCategory = 'accuracy' | 'xp' | 'streak' | 'volume';
type LadderCategory = 'mastery' | 'accuracy' | 'streak' | 'volume';

export function ProfileClient({ data }: ProfileClientProps) {
  const { user, gamification, leaderboards, achievements, stats } = data;
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<LeaderboardCategory>('accuracy');
  const [selectedLadder, setSelectedLadder] = useState<LadderCategory>('accuracy');

  const unlockedAchievementsCount = achievements.filter((a) => a.isUnlocked).length;
  const currentLeaderboard = leaderboards[selectedLeaderboard];

  const currentCategoryRank = gamification.categoryRanks[selectedLadder];

  return (
    <div className="min-h-screen bg-[#080A0E] text-zinc-100 flex selection:bg-[#FF9D50]/30 selection:text-[#FFF9D8]">
      {/* App Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        {/* Top Header */}
        <header className="hidden md:flex border-b border-white/[0.08] bg-[#0C0E14]/70 backdrop-blur-md px-6 py-4 items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#FF9D50]" />
              Ranks, Levels & Leaderboards
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live competitive ranks across Accuracy, Mastery XP, Streaks, and Problem Volume
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

          {/* 2. Four Multi-Dimension Rank & Progression Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Accuracy & Correct Answers Rank */}
            <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-[#20C4D0]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#20C4D0] uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5" />
                  Accuracy Rank
                </span>
                <span className="text-2xl">{gamification.categoryRanks.accuracy.badge}</span>
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">
                  {gamification.categoryRanks.accuracy.rank}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {stats.questionsCorrect} Correct ({stats.accuracy !== null ? `${stats.accuracy}%` : '0%'})
                </div>
              </div>
              <div className="pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Leaderboard Standing</span>
                <strong className="text-white">#{leaderboards.accuracy.userRank}</strong>
              </div>
            </div>

            {/* Global Mastery XP Rank */}
            <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-[#FF9D50]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#FF9D50] uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  Mastery XP Rank
                </span>
                <span className="text-2xl">{gamification.categoryRanks.mastery.badge}</span>
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">
                  {gamification.categoryRanks.mastery.rank}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {gamification.xp.toLocaleString()} Total XP · Lv.{gamification.levelInfo.level}
                </div>
              </div>
              <div className="pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Leaderboard Standing</span>
                <strong className="text-white">#{leaderboards.xp.userRank}</strong>
              </div>
            </div>

            {/* Daily Streak Rank */}
            <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-[#50D97A]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#50D97A] uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  Streak Rank
                </span>
                <span className="text-2xl">{gamification.categoryRanks.streak.badge}</span>
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">
                  {gamification.categoryRanks.streak.rank}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {gamification.streakInfo.currentStreak}d Active · Best {gamification.streakInfo.longestStreak}d
                </div>
              </div>
              <div className="pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Leaderboard Standing</span>
                <strong className="text-white">#{leaderboards.streak.userRank}</strong>
              </div>
            </div>

            {/* Volume Grinder Rank */}
            <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-amber-400/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Volume Rank
                </span>
                <span className="text-2xl">{gamification.categoryRanks.volume.badge}</span>
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">
                  {gamification.categoryRanks.volume.rank}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {stats.questionsAnswered.toLocaleString()} Problems Attempted
                </div>
              </div>
              <div className="pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Leaderboard Standing</span>
                <strong className="text-white">#{leaderboards.volume.userRank}</strong>
              </div>
            </div>
          </section>

          {/* 3. Live Interactive Leaderboards Section */}
          <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#FF9D50]" />
                  Live Competitive Leaderboards
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time rankings across registered JEE aspirants on Crackrr
                </p>
              </div>

              {/* Category Pills Switcher */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/[0.06] overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedLeaderboard('accuracy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedLeaderboard === 'accuracy'
                      ? 'bg-[#20C4D0] text-[#080A0E] shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🎯 Most Correct
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLeaderboard('xp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedLeaderboard === 'xp'
                      ? 'bg-[#FF9D50] text-[#080A0E] shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  💎 Global XP
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLeaderboard('streak')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedLeaderboard === 'streak'
                      ? 'bg-[#50D97A] text-[#080A0E] shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🔥 Streaks
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLeaderboard('volume')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedLeaderboard === 'volume'
                      ? 'bg-amber-400 text-[#080A0E] shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  📚 Questions
                </button>
              </div>
            </div>

            {/* Active Leaderboard Meta Banner */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">{currentLeaderboard.title}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">{currentLeaderboard.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="px-3 py-1 rounded-lg bg-[#FF9D50]/10 border border-[#FF9D50]/30 text-xs">
                  <span className="text-zinc-400">Your Standing: </span>
                  <strong className="text-[#FF9D50] font-bold">
                    Rank #{currentLeaderboard.userRank}
                  </strong>
                  <span className="text-zinc-500 text-[10px]"> / {currentLeaderboard.totalParticipants}</span>
                </div>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="space-y-2">
              {currentLeaderboard.entries.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 bg-white/[0.01] rounded-xl border border-white/[0.04]">
                  No entries yet in this category. Start practicing to take the #1 spot!
                </div>
              ) : (
                currentLeaderboard.entries.map((entry) => {
                  const isTop1 = entry.rank === 1;
                  const isTop2 = entry.rank === 2;
                  const isTop3 = entry.rank === 3;

                  const rankBadgeColor = isTop1
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                    : isTop2
                    ? 'bg-zinc-300/20 text-zinc-200 border-zinc-300/40'
                    : isTop3
                    ? 'bg-amber-700/20 text-amber-500 border-amber-600/40'
                    : 'bg-white/[0.04] text-zinc-400 border-white/[0.08]';

                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all ${
                        entry.isCurrentUser
                          ? 'bg-[#FF9D50]/10 border-[#FF9D50] ring-1 ring-[#FF9D50]/30 shadow-md'
                          : isTop1
                          ? 'bg-amber-500/[0.04] border-amber-500/20'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {/* Rank Position Pill */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${rankBadgeColor}`}
                        >
                          {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${entry.rank}`}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-xs sm:text-sm truncate">
                              {entry.name}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono">
                              @{entry.username}
                            </span>
                            {entry.isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FF9D50] text-[#080A0E]">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 truncate">
                            <span>{entry.badge} {entry.rankTitle}</span>
                            <span>•</span>
                            <span>{entry.school || 'JEE Aspirant'}</span>
                            <span>•</span>
                            <span>{entry.grade}</span>
                          </div>
                        </div>
                      </div>

                      {/* Metric Values */}
                      <div className="text-right shrink-0 pl-3">
                        <div className="text-xs sm:text-sm font-bold text-white font-mono">
                          {entry.primaryValue}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {entry.secondaryValue}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 4. Multi-Category Rank Ladders */}
          <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#FF9D50]" />
                  Mastery Tier Ladders
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Explore rank tiers, unlock requirements, and next milestones
                </p>
              </div>

              {/* Ladder Filter */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
                {(
                  [
                    { id: 'accuracy', label: 'Accuracy' },
                    { id: 'mastery', label: 'Mastery XP' },
                    { id: 'streak', label: 'Streaks' },
                    { id: 'volume', label: 'Volume' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedLadder(tab.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedLadder === tab.id
                        ? 'bg-white/[0.12] text-white font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ladder Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {currentCategoryRank.allTiers.map((tier, idx) => {
                const isCurrent = currentCategoryRank.rank === tier.name;
                const isUnlocked = idx + 1 <= currentCategoryRank.tier;

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
                      {'desc' in tier && (
                        <p className="text-[10px] text-zinc-400 leading-tight pt-1">
                          {(tier as any).desc}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px]">
                      {isCurrent ? (
                        <span className="text-[#FF9D50] font-bold">Current Tier</span>
                      ) : isUnlocked ? (
                        <span className="text-[#50D97A] font-medium">Unlocked ✓</span>
                      ) : (
                        <span className="text-zinc-500 font-medium">
                          {'minCorrect' in tier
                            ? `${(tier as any).minCorrect} Correct`
                            : 'minXp' in tier
                            ? `${(tier as any).minXp.toLocaleString()} XP`
                            : 'minStreak' in tier
                            ? `${(tier as any).minStreak}d Streak`
                            : `${(tier as any).minQuestions} Qs`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5. Achievements Trophy Case */}
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

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import {
  ProgressData,
  ChapterMastery,
} from '@/lib/server/progress/service';
import { QuestionSubject } from '@prisma/client';
import {
  TrendingUp,
  Target,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Filter,
  Search,
  Calendar,
  Layers,
} from 'lucide-react';

interface ProgressClientProps {
  data: ProgressData;
}

export function ProgressClient({ data }: ProgressClientProps) {
  const [selectedSubjectTab, setSelectedSubjectTab] = useState<'ALL' | QuestionSubject>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter chapter mastery list
  const filteredChapters = data.chapterMastery.filter((ch) => {
    if (selectedSubjectTab !== 'ALL' && ch.subject !== selectedSubjectTab) {
      return false;
    }
    if (statusFilter !== 'ALL' && ch.status !== statusFilter) {
      return false;
    }
    if (
      searchQuery.trim() !== '' &&
      !ch.chapter.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Calculate 30-day max for chart normalization
  const maxSolvedInTrend = Math.max(1, ...data.dailyTrends.map((d) => d.solved));

  return (
    <div className="min-h-screen bg-[#080A0E] text-zinc-100 flex selection:bg-[#FF9D50]/30 selection:text-[#FFF9D8]">
      {/* App Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        {/* Header */}
        <header className="border-b border-white/[0.08] bg-[#0C0E14]/70 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#20C4D0]" />
              Progress & Mastery
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Comprehensive analytics, chapter mastery, and practice history
            </p>
          </div>

          <Link
            href="/practice"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold tracking-wide transition-all shadow-sm"
          >
            <Zap className="w-4 h-4" />
            <span>Practice Now</span>
          </Link>
        </header>

        {/* Body */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
          {/* 1. Lifetime High-Level Overview Stats */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Questions Solved */}
            <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">Total Solved</span>
                <span className="p-2 rounded-lg bg-[#FF9D50]/10 text-[#FF9D50]">
                  <Target className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-[#FFF9D8] tracking-tight">
                  {data.summary.totalSolved}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {data.summary.totalCorrect} correct answers
                </div>
              </div>
            </div>

            {/* Overall Accuracy */}
            <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">Overall Accuracy</span>
                <span className="p-2 rounded-lg bg-[#20C4D0]/10 text-[#20C4D0]">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-[#20C4D0] tracking-tight">
                  {data.summary.overallAccuracy !== null ? `${data.summary.overallAccuracy}%` : '—'}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Across all subjects
                </div>
              </div>
            </div>

            {/* Total Practice Time */}
            <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">Practice Time</span>
                <span className="p-2 rounded-lg bg-[#50D97A]/10 text-[#50D97A]">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {data.summary.totalPracticeMinutes < 60
                    ? `${data.summary.totalPracticeMinutes}m`
                    : `${(data.summary.totalPracticeMinutes / 60).toFixed(1)}h`}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {data.summary.totalSessions} completed sessions
                </div>
              </div>
            </div>

            {/* Total XP Balance */}
            <div className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">Total XP</span>
                <span className="p-2 rounded-lg bg-[#FFF9D8]/10 text-[#FFF9D8]">
                  <Zap className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-[#FFF9D8] tracking-tight">
                  {data.summary.totalXp.toLocaleString()}
                </div>
                <div className="text-xs text-[#FF9D50] mt-1 font-medium">
                  Level {data.profile.level} • {data.profile.currentStreak}d Streak
                </div>
              </div>
            </div>
          </section>

          {/* 2. Subject Summary Cards */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FF9D50]" />
              Subject Breakdown
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.subjectSummaries.map((subj) => {
                const isPhysics = subj.subject === 'PHYSICS';
                const isChemistry = subj.subject === 'CHEMISTRY';
                const accentColor = isPhysics ? '#FF9D50' : isChemistry ? '#20C4D0' : '#50D97A';

                return (
                  <div
                    key={subj.subject}
                    className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-5 space-y-4 hover:border-white/[0.15] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white text-base">{subj.label}</h3>
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${accentColor}1A`,
                          color: accentColor,
                        }}
                      >
                        {subj.accuracy !== null ? `${subj.accuracy}% Accuracy` : 'Not Started'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/[0.06]">
                      <div>
                        <div className="text-xs text-zinc-400">Solved</div>
                        <div className="text-sm font-semibold text-white mt-0.5">
                          {subj.attempted}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-400">Mastered</div>
                        <div className="text-sm font-semibold text-[#50D97A] mt-0.5">
                          {subj.masteredCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-400">Needs Work</div>
                        <div className="text-sm font-semibold text-[#FF9D50] mt-0.5">
                          {subj.needsWorkCount}
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${subj.accuracy || 0}%`,
                          backgroundColor: accentColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. 30-Day Activity Chart */}
          <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#20C4D0]" />
                  30-Day Practice Activity
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Daily question volume and accuracy trend
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FF9D50]" />
                  <span className="text-zinc-400">Questions Solved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#50D97A]" />
                  <span className="text-zinc-400">Active Days</span>
                </div>
              </div>
            </div>

            {/* Bars container */}
            <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 px-1 overflow-x-auto">
              {data.dailyTrends.map((day, idx) => {
                const heightPercent =
                  day.solved > 0 ? Math.max(12, Math.round((day.solved / maxSolvedInTrend) * 100)) : 4;
                const isPracticed = day.solved > 0;

                return (
                  <div
                    key={day.date}
                    className="flex-1 min-w-[12px] flex flex-col items-center gap-1.5 group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 z-20 bg-zinc-900 border border-white/20 px-2.5 py-1.5 rounded-lg text-[11px] whitespace-nowrap shadow-xl transition-all">
                      <p className="font-semibold text-white">{day.label}</p>
                      <p className="text-[#FF9D50]">{day.solved} questions ({day.correct} correct)</p>
                      {day.accuracy !== null && (
                        <p className="text-[#20C4D0]">{day.accuracy}% accuracy</p>
                      )}
                    </div>

                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        isPracticed
                          ? 'bg-[#FF9D50] group-hover:bg-[#FFF9D8]'
                          : 'bg-white/[0.04]'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />

                    {/* Label every 5 days */}
                    {idx % 5 === 0 && (
                      <span className="text-[9px] text-zinc-400 select-none whitespace-nowrap">
                        {day.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. Chapter-by-Chapter Mastery Table & Filters */}
          <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#FF9D50]" />
                  Chapter Mastery Matrix
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Track your mastery status across all syllabus chapters
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Subject Tab Filter */}
                <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
                  {(['ALL', 'PHYSICS', 'CHEMISTRY', 'MATHEMATICS'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedSubjectTab(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        selectedSubjectTab === tab
                          ? 'bg-[#FF9D50] text-[#080A0E] font-semibold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter chapters by mastery status"
                  className="bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#FF9D50]"
                >
                  <option value="ALL" className="bg-[#0C0E14]">All Statuses</option>
                  <option value="MASTERED" className="bg-[#0C0E14]">Mastered (≥80%)</option>
                  <option value="DEVELOPING" className="bg-[#0C0E14]">Developing (50-79%)</option>
                  <option value="NEEDS_WORK" className="bg-[#0C0E14]">Needs Work (&lt;50%)</option>
                  <option value="UNATTEMPTED" className="bg-[#0C0E14]">Unattempted</option>
                </select>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search chapter..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/[0.04] border border-white/[0.06] pl-8 pr-3 py-1.5 rounded-xl text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-[#FF9D50] w-40 sm:w-48"
                  />
                </div>
              </div>
            </div>

            {/* Chapter Matrix Grid */}
            {filteredChapters.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-xs">
                No chapters matching the selected filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredChapters.map((ch) => {
                  let badgeBg = 'bg-white/[0.06] text-zinc-400 border-white/[0.08]';
                  let statusLabel = 'Unattempted';
                  if (ch.status === 'MASTERED') {
                    badgeBg = 'bg-[#50D97A]/10 text-[#50D97A] border-[#50D97A]/30';
                    statusLabel = 'Mastered';
                  } else if (ch.status === 'DEVELOPING') {
                    badgeBg = 'bg-[#20C4D0]/10 text-[#20C4D0] border-[#20C4D0]/30';
                    statusLabel = 'Developing';
                  } else if (ch.status === 'NEEDS_WORK') {
                    badgeBg = 'bg-[#FF9D50]/10 text-[#FF9D50] border-[#FF9D50]/30';
                    statusLabel = 'Needs Work';
                  }

                  return (
                    <div
                      key={`${ch.subject}-${ch.chapter}`}
                      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between hover:border-white/[0.12] transition-all"
                    >
                      <div className="space-y-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                            {ch.subject}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeBg}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-white truncate">
                          {ch.chapter}
                        </h4>
                        <div className="text-xs text-zinc-400">
                          {ch.attempted} solved / {ch.totalInBank} in bank
                          {ch.accuracy !== null && ` • ${ch.accuracy}% accuracy`}
                        </div>
                      </div>

                      <Link
                        href={`/practice`}
                        className="p-2 rounded-lg bg-white/[0.04] hover:bg-[#FF9D50] hover:text-[#080A0E] text-zinc-400 transition-all shrink-0"
                        title="Practice this chapter"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 5. Practice Session History Log */}
          <section className="bg-[#0C0E14] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#50D97A]" />
              Recent Practice History
            </h2>

            {data.recentSessions.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-xs">
                No practice sessions completed yet.{' '}
                <Link href="/practice" className="text-[#FF9D50] underline">
                  Start your first practice session
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {data.recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="py-3.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {session.chapter || session.subject || 'Mixed Practice'}
                        </span>
                        {session.subject && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/[0.06] text-zinc-400">
                            {session.subject}
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-400">
                        {new Date(session.completedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {session.durationSeconds}s duration
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="font-semibold text-white">
                          {session.correctAnswers} / {session.totalQuestions} ({session.accuracy}%)
                        </div>
                        <div className="text-[#FF9D50] font-medium">+{session.xpEarned} XP</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { DashboardData } from '@/lib/services/dashboard';

interface DashboardClientProps {
  data: DashboardData;
}

type TimeRange = '7d' | '30d' | '90d';
type SubjectSort = 'accuracy' | 'questions';

export function DashboardClient({ data }: DashboardClientProps) {
  const [questionsRange, setQuestionsRange] = useState<TimeRange>('30d');
  const [accuracyRange, setAccuracyRange] = useState<TimeRange>('30d');
  const [subjectSort, setSubjectSort] = useState<SubjectSort>('accuracy');

  // Selected chart data
  const currentQuestionsData = useMemo(() => {
    if (questionsRange === '7d') return data.charts.days7.questions;
    if (questionsRange === '90d') return data.charts.days90.questions;
    return data.charts.days30.questions;
  }, [questionsRange, data.charts]);

  const currentAccuracyData = useMemo(() => {
    if (accuracyRange === '7d') return data.charts.days7.accuracy;
    if (accuracyRange === '90d') return data.charts.days90.accuracy;
    return data.charts.days30.accuracy;
  }, [accuracyRange, data.charts]);

  // Sorted subjects
  const sortedSubjects = useMemo(() => {
    const list = [...data.subjectPerformance];
    if (subjectSort === 'accuracy') {
      return list.sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));
    }
    return list.sort((a, b) => b.questionsSolved - a.questionsSolved);
  }, [subjectSort, data.subjectPerformance]);

  const hasAnyPractice = data.overview.questionsSolved > 0;

  return (
    <div className="min-h-screen bg-[#080a0e] text-zinc-100 flex flex-col selection:bg-[#2373f4]/30 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-white/[0.08] bg-[#0c0e14]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-1.5 group">
              <span className="font-semibold text-lg tracking-tight text-white group-hover:text-[#578ef5] transition-colors">
                crackr<span className="text-[#2373f4]">•</span>
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/[0.06]">
                Dashboard
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-medium text-white block">{data.profile.name}</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                {data.profile.grade} • {data.profile.stream}
              </span>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* 1. Greeting / Header */}
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              {data.greeting.headline}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {data.greeting.subline}
            </p>
          </div>

          <Link
            href="/practice"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2373f4] hover:bg-[#578ef5] text-white text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99] self-start sm:self-auto"
          >
            <span>{data.recommendation.actionText}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        {/* 2. Today's Progress & Key Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Today's Goal Card (5 cols on lg) */}
          <section className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  Today&apos;s Target
                </span>
                {data.today.isCompleted ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#50d97a] bg-[#50d97a]/10 px-2.5 py-0.5 rounded-full border border-[#50d97a]/20">
                    Goal completed ✓
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400 font-medium">
                    {data.today.remaining} to go
                  </span>
                )}
              </div>

              {/* Progress Count & Bar */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-white tracking-tight">
                    {data.today.solved}
                  </span>
                  <span className="text-sm text-zinc-400 font-medium">
                    / {data.today.target} questions
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 rounded-full ${
                      data.today.isCompleted ? 'bg-[#50d97a]' : 'bg-[#2373f4]'
                    }`}
                    style={{ width: `${data.today.progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Today Sub-Metrics */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
              <div className="rounded-xl bg-white/[0.02] p-2.5 text-center">
                <span className="text-[11px] text-zinc-400 block">Accuracy</span>
                <span className="text-sm font-semibold text-white mt-0.5 block">
                  {data.today.accuracy !== null ? `${data.today.accuracy}%` : '—'}
                </span>
              </div>
              <div className="rounded-xl bg-white/[0.02] p-2.5 text-center">
                <span className="text-[11px] text-zinc-400 block">Time</span>
                <span className="text-sm font-semibold text-white mt-0.5 block">
                  {data.today.solved > 0 ? `${data.today.minutesPracticed}m` : '—'}
                </span>
              </div>
              <div className="rounded-xl bg-white/[0.02] p-2.5 text-center">
                <span className="text-[11px] text-zinc-400 block">XP</span>
                <span className="text-sm font-semibold text-[#f2f7a0] mt-0.5 block">
                  +{data.today.xpEarned}
                </span>
              </div>
            </div>
          </section>

          {/* Key Stats (7 cols on lg) */}
          <section className="lg:col-span-7 grid grid-cols-2 gap-4">
            {/* Stat 1: Questions Solved */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5 flex flex-col justify-between">
              <span className="text-xs font-medium text-zinc-400">Questions solved</span>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {data.overview.questionsSolved.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-zinc-400 font-medium">
                  {data.overview.questionsSolvedChange ? (
                    <span className="text-[#65d0f4]">
                      {data.overview.questionsSolvedChange.label}
                    </span>
                  ) : (
                    <span className="text-zinc-400">Total practice volume</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stat 2: Accuracy */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5 flex flex-col justify-between">
              <span className="text-xs font-medium text-zinc-400">Accuracy</span>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {data.overview.accuracy !== null ? `${data.overview.accuracy}%` : '—'}
                </div>
                <div className="mt-1 text-[11px] text-zinc-400 font-medium">
                  {data.overview.accuracyChange ? (
                    <span className="text-[#50d97a]">
                      {data.overview.accuracyChange.label}
                    </span>
                  ) : (
                    <span className="text-zinc-400">Across all sessions</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stat 3: Streak */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5 flex flex-col justify-between">
              <span className="text-xs font-medium text-zinc-400">Current streak</span>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {data.overview.currentStreak}{' '}
                  <span className="text-base font-normal text-zinc-400">
                    {data.overview.currentStreak === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-zinc-400 font-medium">
                  Best: {data.overview.longestStreak} days
                </div>
              </div>
            </div>

            {/* Stat 4: Total XP */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5 flex flex-col justify-between">
              <span className="text-xs font-medium text-zinc-400">Total XP</span>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold text-[#f2f7a0] tracking-tight">
                  {data.overview.totalXp.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-zinc-400 font-medium">
                  +{data.overview.xpThisWeek.toLocaleString()} this week
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 3. Consistency / Weekly Activity */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Study consistency
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {data.consistency.daysPracticedThisWeek} of 7 days practiced this week
              </p>
            </div>
            <div className="text-xs font-medium text-zinc-400">
              Current streak: <span className="text-white font-semibold">{data.consistency.currentStreak} days</span>
            </div>
          </div>

          {/* 7 Days Row */}
          <div className="grid grid-cols-7 gap-2 pt-2">
            {data.consistency.weekDays.map((d) => (
              <div
                key={d.dateStr}
                className={`rounded-xl p-3 flex flex-col items-center justify-center space-y-2 border transition-all ${
                  d.isToday
                    ? 'border-[#2373f4]/50 bg-[#2373f4]/10'
                    : 'border-white/[0.06] bg-white/[0.02]'
                }`}
              >
                <span className={`text-[11px] font-medium ${d.isToday ? 'text-white' : 'text-zinc-400'}`}>
                  {d.dayName}
                </span>

                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    d.practiced
                      ? 'bg-[#50d97a] text-black'
                      : d.isToday
                      ? 'border border-dashed border-white/30 text-zinc-400'
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

        {/* 4. Charts Section: Questions Solved & Accuracy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Questions Solved Chart */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Questions solved
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Practice volume over time
                </p>
              </div>

              {/* Range Selector */}
              <div className="inline-flex rounded-lg bg-white/[0.04] p-0.5 border border-white/[0.06]">
                {(['7d', '30d', '90d'] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setQuestionsRange(r)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                      questionsRange === r
                        ? 'bg-[#2373f4] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-56 w-full pt-2">
              {hasAnyPractice ? (
                <QuestionsLineChart data={currentQuestionsData} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/[0.08] rounded-xl">
                  <span className="text-xs text-zinc-400">
                    Your practice volume will appear here after your first session.
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Accuracy Chart */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Accuracy
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Performance across active days
                </p>
              </div>

              {/* Range Selector */}
              <div className="inline-flex rounded-lg bg-white/[0.04] p-0.5 border border-white/[0.06]">
                {(['7d', '30d', '90d'] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setAccuracyRange(r)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                      accuracyRange === r
                        ? 'bg-[#2373f4] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-56 w-full pt-2">
              {currentAccuracyData.length > 0 ? (
                <AccuracyLineChart data={currentAccuracyData} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/[0.08] rounded-xl">
                  <span className="text-xs text-zinc-400">
                    Accuracy trends will calculate as you solve questions.
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 5. Subject Performance & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Subject Performance (7 cols) */}
          <section className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Subject performance
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Mastery and volume by subject
                </p>
              </div>

              {/* Sort Toggle */}
              <div className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="text-[11px]">Sort:</span>
                <button
                  onClick={() => setSubjectSort('accuracy')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    subjectSort === 'accuracy'
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Accuracy
                </button>
                <button
                  onClick={() => setSubjectSort('questions')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    subjectSort === 'questions'
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Questions
                </button>
              </div>
            </div>

            {/* Subjects List */}
            <div className="space-y-3">
              {sortedSubjects.map((s) => (
                <div
                  key={s.rawSubject}
                  className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{s.subject}</span>
                      <StatusBadge status={s.status} />
                    </div>
                    <span className="text-xs text-zinc-400 block">
                      {s.questionsSolved} questions solved
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-32 hidden sm:block">
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-[#578ef5] rounded-full"
                          style={{ width: `${s.accuracy ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right min-w-[54px]">
                      <span className="text-base font-bold text-white">
                        {s.accuracy !== null ? `${s.accuracy}%` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Activity (5 cols) */}
          <section className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Recent activity
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Latest practice sessions
                </p>
              </div>

              {/* Sessions List */}
              {data.recentSessions.length > 0 ? (
                <div className="space-y-2.5">
                  {data.recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3.5 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-white block">
                          {session.subject} • {session.chapter}
                        </span>
                        <span className="text-[11px] text-zinc-400 block">
                          {session.questionsCount} questions · {session.accuracy}% accuracy
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {session.timeAgo}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-white/[0.08]">
                  <p className="text-xs text-zinc-400">
                    No practice sessions recorded yet.
                  </p>
                  <Link
                    href="/practice"
                    className="inline-block mt-3 text-xs font-semibold text-[#578ef5] hover:underline"
                  >
                    Start your first session →
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Practice Card Footer */}
            <div className="pt-4 border-t border-white/[0.06] mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-zinc-400 block">Ready to practice?</span>
                  <span className="text-xs font-medium text-white block">
                    {data.recommendation.actionText}
                  </span>
                </div>
                <Link
                  href="/practice"
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white transition-colors"
                >
                  Practice →
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Helper Components: Status Badge & Pure SVG Line Charts
// ----------------------------------------------------------------------------

function StatusBadge({
  status,
}: {
  status: 'Strong' | 'Improving' | 'Needs attention' | 'Starting' | 'Not started';
}) {
  if (status === 'Strong') {
    return (
      <span className="text-[10px] font-medium text-[#50d97a] bg-[#50d97a]/10 px-2 py-0.5 rounded-full border border-[#50d97a]/20">
        Strong
      </span>
    );
  }
  if (status === 'Improving') {
    return (
      <span className="text-[10px] font-medium text-[#65d0f4] bg-[#65d0f4]/10 px-2 py-0.5 rounded-full border border-[#65d0f4]/20">
        Improving
      </span>
    );
  }
  if (status === 'Needs attention') {
    return (
      <span className="text-[10px] font-medium text-[#f2f7a0] bg-[#f2f7a0]/10 px-2 py-0.5 rounded-full border border-[#f2f7a0]/20">
        Needs work
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
      {status}
    </span>
  );
}

interface QuestionPoint {
  date: string;
  label: string;
  count: number;
}

function QuestionsLineChart({ data }: { data: QuestionPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 28;

  const maxVal = Math.max(...data.map((d) => d.count), 5);
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;

  const points = data.map((d, idx) => {
    const x = paddingX + (idx / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.count / maxVal) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  // Step labels on X axis
  const labelStep = Math.max(1, Math.floor(data.length / 5));

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2373f4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2373f4" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        <line
          x1={paddingX}
          y1={paddingTop}
          x2={width - paddingX}
          y2={paddingTop}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingX}
          y1={paddingTop + chartHeight / 2}
          x2={width - paddingX}
          y2={paddingTop + chartHeight / 2}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={width - paddingX}
          y2={height - paddingBottom}
          stroke="rgba(255,255,255,0.08)"
        />

        {/* Gradient fill area */}
        <path d={areaD} fill="url(#qGrad)" />

        {/* Main Line */}
        <path d={pathD} fill="none" stroke="#2373f4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points & hover triggers */}
        {points.map((p, idx) => (
          <g key={p.date}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === idx ? 4.5 : 2.5}
              fill={hoveredIdx === idx ? '#fff' : '#2373f4'}
              stroke="#080a0e"
              strokeWidth="2"
              className="transition-all"
            />
            <rect
              x={p.x - 10}
              y={0}
              width={20}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            />
          </g>
        ))}

        {/* X-axis Date Labels */}
        {points.map((p, idx) => {
          if (idx % labelStep === 0 || idx === points.length - 1) {
            return (
              <text
                key={p.date}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(255,255,255,0.4)"
              >
                {p.label}
              </text>
            );
          }
          return null;
        })}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="absolute pointer-events-none bg-[#12151d] border border-white/[0.15] text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(points[hoveredIdx].x / width) * 100}%`,
            top: `${(points[hoveredIdx].y / height) * 100 - 8}%`,
          }}
        >
          <span className="font-semibold block">{points[hoveredIdx].count} questions</span>
          <span className="text-[10px] text-zinc-400">{points[hoveredIdx].label}</span>
        </div>
      )}
    </div>
  );
}

interface AccuracyPoint {
  date: string;
  label: string;
  accuracy: number;
  total: number;
}

function AccuracyLineChart({ data }: { data: AccuracyPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 28;

  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;

  const points = data.map((d, idx) => {
    const x = paddingX + (idx / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.accuracy / 100) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  const labelStep = Math.max(1, Math.floor(data.length / 5));

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        {/* Horizontal gridlines for 100%, 50%, 0% */}
        <line
          x1={paddingX}
          y1={paddingTop}
          x2={width - paddingX}
          y2={paddingTop}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />
        <text x={paddingX - 4} y={paddingTop + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.3)">
          100%
        </text>

        <line
          x1={paddingX}
          y1={paddingTop + chartHeight / 2}
          x2={width - paddingX}
          y2={paddingTop + chartHeight / 2}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />
        <text x={paddingX - 4} y={paddingTop + chartHeight / 2 + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.3)">
          50%
        </text>

        <line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={width - paddingX}
          y2={height - paddingBottom}
          stroke="rgba(255,255,255,0.08)"
        />

        {/* Main Line */}
        <path d={pathD} fill="none" stroke="#50d97a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points & hover triggers */}
        {points.map((p, idx) => (
          <g key={p.date}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === idx ? 5 : 3}
              fill={hoveredIdx === idx ? '#fff' : '#50d97a'}
              stroke="#080a0e"
              strokeWidth="2"
              className="transition-all"
            />
            <rect
              x={p.x - 12}
              y={0}
              width={24}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            />
          </g>
        ))}

        {/* X-axis Date Labels */}
        {points.map((p, idx) => {
          if (idx % labelStep === 0 || idx === points.length - 1) {
            return (
              <text
                key={p.date}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(255,255,255,0.4)"
              >
                {p.label}
              </text>
            );
          }
          return null;
        })}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="absolute pointer-events-none bg-[#12151d] border border-white/[0.15] text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(points[hoveredIdx].x / width) * 100}%`,
            top: `${(points[hoveredIdx].y / height) * 100 - 8}%`,
          }}
        >
          <span className="font-semibold block text-[#50d97a]">{points[hoveredIdx].accuracy}% accuracy</span>
          <span className="text-[10px] text-zinc-400">
            {points[hoveredIdx].total} Qs · {points[hoveredIdx].label}
          </span>
        </div>
      )}
    </div>
  );
}

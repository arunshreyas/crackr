'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardData } from '@/lib/services/dashboard';
import { Play, RotateCcw, ArrowRight, Sparkles, BookOpen, Layers } from 'lucide-react';
import { QuestionSubject } from '@prisma/client';

interface PrimaryActionHeroProps {
  activeSession: DashboardData['activeSession'];
  activeSessionsCount: number;
  recommendation: DashboardData['recommendation'];
  today: DashboardData['today'];
}

export function PrimaryActionHero({
  activeSession,
  activeSessionsCount,
  recommendation,
  today,
}: PrimaryActionHeroProps) {
  // Format subject title
  const formatSubjectName = (subj: QuestionSubject | null) => {
    if (!subj) return 'JEE Main';
    return subj.charAt(0) + subj.slice(1).toLowerCase();
  };

  if (activeSession) {
    const subjName = formatSubjectName(activeSession.subject);
    const progressPct =
      activeSession.totalQuestions > 0
        ? Math.round((activeSession.answeredCount / activeSession.totalQuestions) * 100)
        : 0;

    return (
      <section className="relative overflow-hidden rounded-2xl border border-[#FF9D50]/30 bg-gradient-to-br from-[#FF9D50]/10 via-[#0C0E14] to-[#0C0E14] p-5 sm:p-7 shadow-[0_0_30px_rgba(255,157,80,0.06)]">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#FF9D50]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FF9D50]/20 text-[#FF9D50] border border-[#FF9D50]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9D50] animate-pulse" />
                In-Progress Practice Session
              </span>
              {activeSessionsCount > 1 && (
                <span className="text-[11px] text-zinc-400">
                  +{activeSessionsCount - 1} other active
                </span>
              )}
            </div>

            {/* Headline */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Resume {subjName} Session
              </h2>
              <p className="text-sm text-zinc-300 mt-1">
                <strong className="text-white font-medium">{activeSession.chapter}</strong> ·{' '}
                <span className="text-[#FF9D50] font-medium">{activeSession.remainingQuestions} questions remaining</span>
              </p>
            </div>

            {/* In-Progress Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-zinc-400 font-mono">
                <span>
                  Question {activeSession.answeredCount + 1} of {activeSession.totalQuestions}
                </span>
                <span className="text-[#FF9D50] font-semibold">{progressPct}% completed</span>
              </div>
              <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF9D50] to-[#FFAA66] rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, progressPct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Button Group */}
          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              href={`/practice?resume=${activeSession.sessionId}`}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-sm font-bold tracking-wide transition-all shadow-md active:scale-[0.99] text-center"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resume Session</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/practice"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-zinc-300 hover:text-white transition-all text-center"
            >
              <Play className="w-3.5 h-3.5 text-zinc-400" />
              <span>New Session</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // State B: No Active Session -> Primary "Start New Practice Session"
  const recSubjectName = formatSubjectName(recommendation.targetSubject);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-br from-[#0C0E14] via-[#0C0E14] to-white/[0.02] p-5 sm:p-7 shadow-sm">
      {/* Decorative background flare */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#20C4D0]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Ready to Practice
            </span>
            <span className="text-xs text-zinc-400">
              {today.remaining > 0
                ? `${today.remaining} Qs left to daily goal`
                : 'Daily target reached!'}
            </span>
          </div>

          {/* Headline */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Start New Practice Session
            </h2>
            <p className="text-sm text-zinc-300 mt-1 leading-relaxed">
              Recommended next step:{' '}
              <strong className="text-white font-semibold">
                {recommendation.actionText}
              </strong>
              {recommendation.targetChapter && (
                <span className="text-zinc-400"> · {recommendation.targetChapter}</span>
              )}
            </p>
          </div>

          {/* Fast Subject Launcher Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider mr-1">
              Quick pick:
            </span>
            {(['PHYSICS', 'CHEMISTRY', 'MATHEMATICS'] as QuestionSubject[]).map((subj) => (
              <Link
                key={subj}
                href={`/practice?subject=${subj}`}
                className={`text-xs px-3 py-1 rounded-lg border transition-all font-medium ${
                  subj === recommendation.targetSubject
                    ? 'border-[#FF9D50]/40 bg-[#FF9D50]/10 text-white font-semibold'
                    : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
                }`}
              >
                {formatSubjectName(subj)}
              </Link>
            ))}
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="shrink-0">
          <Link
            href={`/practice?subject=${recommendation.targetSubject}`}
            className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-sm font-bold tracking-wide transition-all shadow-md active:scale-[0.99]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Practice Session</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

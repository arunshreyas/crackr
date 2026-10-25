'use client';

import React from 'react';
import Link from 'next/link';
import { UserConceptDiagnosticsSummary } from '@/lib/server/concepts/analysis';
import { AlertCircle, ArrowRight, Clock, Target, Zap, CheckCircle2, Bookmark } from 'lucide-react';
import { QuestionSubject } from '@prisma/client';

interface WeakConceptsCardProps {
  diagnostics: UserConceptDiagnosticsSummary;
}

export function WeakConceptsCard({ diagnostics }: WeakConceptsCardProps) {
  const { topWeakConcepts, criticalCount, overallHealthScore, totalConceptsAttempted } = diagnostics;

  const getSubjectColor = (subj: QuestionSubject) => {
    switch (subj) {
      case 'PHYSICS':
        return 'text-[#FF9D50] bg-[#FF9D50]/10 border-[#FF9D50]/30';
      case 'CHEMISTRY':
        return 'text-[#20C4D0] bg-[#20C4D0]/10 border-[#20C4D0]/30';
      case 'MATHEMATICS':
        return 'text-[#50D97A] bg-[#50D97A]/10 border-[#50D97A]/30';
      default:
        return 'text-zinc-300 bg-white/[0.05] border-white/[0.1]';
    }
  };

  const getTagLabel = (tag: string) => {
    switch (tag) {
      case 'CONCEPT_GAP':
        return { label: 'Conceptual Gap', icon: AlertCircle, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
      case 'TIME_TRAP':
        return { label: 'Pacing Friction (>2m)', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'CARELESS_RUSH':
        return { label: 'Rushed (<15s)', icon: Zap, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
      case 'DIFFICULTY_CEILING':
        return { label: 'Difficulty Wall', icon: Target, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      default:
        return { label: tag, icon: AlertCircle, color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' };
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0C0E14] p-5 sm:p-6 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Weak Concept Diagnostics
              </h2>
              {criticalCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  {criticalCount} Critical
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Identified from your question attempts, error rates, and pacing metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-medium self-start sm:self-auto">
          <div className="bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-xl text-zinc-300">
            Health: <strong className="text-white">{overallHealthScore}%</strong>
          </div>
          <Link
            href="/notes?weakOnly=true"
            className="text-xs text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#FF9D50]" />
            <span>Weak Notes</span>
          </Link>
          <Link
            href="/practice"
            className="text-xs text-[#FF9D50] hover:text-[#FFAA66] font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Targeted Drills</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      {topWeakConcepts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
          {topWeakConcepts.map((concept) => {
            const isCritical = concept.weaknessLevel === 'CRITICAL_WEAKNESS';

            return (
              <div
                key={concept.conceptKey}
                className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 transition-all ${
                  isCritical
                    ? 'border-red-500/25 bg-red-500/[0.03] hover:border-red-500/40'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                }`}
              >
                {/* Concept Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getSubjectColor(
                        concept.subject
                      )}`}
                    >
                      {concept.subject}
                    </span>

                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isCritical
                          ? 'text-red-400 bg-red-500/10 border-red-500/25'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                      }`}
                    >
                      {isCritical ? 'Critical Weakness' : 'Needs Review'}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white tracking-tight pt-1">
                    {concept.topic}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">
                    {concept.chapter}
                  </p>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-white/[0.04] text-center">
                  <div className="bg-black/20 rounded-lg p-1.5">
                    <span className="text-[10px] text-zinc-500 block">Accuracy</span>
                    <span className={`text-xs font-bold ${concept.accuracy < 40 ? 'text-red-400' : 'text-amber-400'}`}>
                      {concept.accuracy}%
                    </span>
                  </div>
                  <div className="bg-black/20 rounded-lg p-1.5">
                    <span className="text-[10px] text-zinc-500 block">Attempts</span>
                    <span className="text-xs font-semibold text-zinc-200">
                      {concept.totalAttempts} Qs
                    </span>
                  </div>
                  <div className="bg-black/20 rounded-lg p-1.5">
                    <span className="text-[10px] text-zinc-500 block">Avg Time</span>
                    <span className="text-xs font-semibold text-zinc-200">
                      {concept.avgTimeSeconds}s
                    </span>
                  </div>
                </div>

                {/* Diagnostic Tags & Recommended Action */}
                <div className="space-y-2">
                  {concept.diagnosticTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {concept.diagnosticTags.map((tag) => {
                        const tagInfo = getTagLabel(tag);
                        const TagIcon = tagInfo.icon;
                        return (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${tagInfo.color}`}
                          >
                            <TagIcon className="w-3 h-3" />
                            {tagInfo.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-400 leading-snug">
                    {concept.recommendedAction}
                  </p>
                </div>

                {/* Direct Action Links */}
                <div className="pt-2 flex items-center gap-2">
                  <Link
                    href={`/practice?subject=${concept.subject}&chapter=${encodeURIComponent(
                      concept.chapter
                    )}&topic=${encodeURIComponent(concept.topic)}`}
                    className="inline-flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-[#FF9D50] text-zinc-200 hover:text-[#080A0E] text-xs font-semibold transition-all border border-white/[0.06] hover:border-[#FF9D50]"
                  >
                    <span>Drill Weak Concept</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/notes?conceptKey=${encodeURIComponent(concept.conceptKey)}`}
                    title="View saved notes for this concept"
                    className="inline-flex items-center justify-center p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06] transition-colors"
                  >
                    <Bookmark className="w-4 h-4 text-[#FF9D50]" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Clean Slate / Healthy State */
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-semibold text-white">
              {totalConceptsAttempted > 0
                ? 'No critical weak concepts detected'
                : 'Diagnose your weak concepts'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {totalConceptsAttempted > 0
                ? 'All tested topics show healthy accuracy and pacing. Continue with regular practice drills to maintain mastery.'
                : 'Solve practice questions across Physics, Chemistry, and Mathematics to automatically uncover conceptual gaps and pacing issues.'}
            </p>
          </div>
          <div className="pt-1">
            <Link
              href="/practice"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Start Practice Drill</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

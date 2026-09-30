'use client';

import React, { useState, useMemo } from 'react';
import { DashboardData } from '@/lib/services/dashboard';

interface SubjectPerformanceProps {
  subjects: DashboardData['subjectPerformance'];
}

type SubjectSort = 'accuracy' | 'questions';

export function SubjectPerformance({ subjects }: SubjectPerformanceProps) {
  const [sortMode, setSortMode] = useState<SubjectSort>('accuracy');

  const sortedList = useMemo(() => {
    const list = [...subjects];
    if (sortMode === 'accuracy') {
      return list.sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));
    }
    return list.sort((a, b) => b.questionsSolved - a.questionsSolved);
  }, [subjects, sortMode]);

  return (
    <section className="rounded-2xl border border-[#2A3145] bg-[#0C0E14] p-6 space-y-5">
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
            onClick={() => setSortMode('accuracy')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              sortMode === 'accuracy'
                ? 'bg-white/[0.08] text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Accuracy
          </button>
          <button
            onClick={() => setSortMode('questions')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              sortMode === 'questions'
                ? 'bg-white/[0.08] text-white font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Questions
          </button>
        </div>
      </div>

      {/* Subjects List */}
      <div className="space-y-3">
        {sortedList.map((s) => (
          <div
            key={s.rawSubject}
            className="rounded-xl bg-white/[0.01] border border-[#2A3145]/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#578EF5]/40 transition-colors"
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
                <div className="w-full h-1.5 rounded-full bg-[#1A202C] overflow-hidden">
                  <div
                    className="h-full bg-[#578EF5] rounded-full transition-all duration-500"
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
  );
}

function StatusBadge({
  status,
}: {
  status: 'Strong' | 'Improving' | 'Needs attention' | 'Starting' | 'Not started';
}) {
  if (status === 'Strong') {
    return (
      <span className="text-[10px] font-medium text-[#65D0F4] bg-[#65D0F4]/10 px-2 py-0.5 rounded-full border border-[#65D0F4]/20">
        Strong
      </span>
    );
  }
  if (status === 'Improving') {
    return (
      <span className="text-[10px] font-medium text-[#578EF5] bg-[#578EF5]/10 px-2 py-0.5 rounded-full border border-[#578EF5]/20">
        Improving
      </span>
    );
  }
  if (status === 'Needs attention') {
    return (
      <span className="text-[10px] font-medium text-[#F2F7A0] bg-[#F2F7A0]/10 px-2 py-0.5 rounded-full border border-[#F2F7A0]/20">
        Needs work
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-[#2A3145]">
      {status}
    </span>
  );
}

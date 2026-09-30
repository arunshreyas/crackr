'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardData } from '@/lib/services/dashboard';

interface RecentActivityProps {
  sessions: DashboardData['recentSessions'];
  recommendation: DashboardData['recommendation'];
}

export function RecentActivity({ sessions, recommendation }: RecentActivityProps) {
  return (
    <section className="rounded-2xl border border-[#2A3145] bg-[#0C0E14] p-6 space-y-5 flex flex-col justify-between">
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
        {sessions.length > 0 ? (
          <div className="space-y-2.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl bg-white/[0.01] border border-[#2A3145]/60 p-3.5 flex items-center justify-between hover:border-[#578EF5]/40 transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-white block">
                    {session.subject} • {session.chapter}
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    {session.questionsCount} questions ·{' '}
                    <span className="text-[#65D0F4] font-medium">{session.accuracy}% accuracy</span>
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 font-normal">
                  {session.timeAgo}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-[#2A3145] space-y-2">
            <p className="text-xs font-medium text-zinc-300">
              No practice sessions recorded yet.
            </p>
            <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
              Complete your first practice session to start reviewing your history.
            </p>
            <Link
              href="/practice"
              className="inline-block mt-2 text-xs font-semibold text-[#578EF5] hover:underline"
            >
              Start your first session →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Practice Card Footer */}
      <div className="pt-4 border-t border-[#2A3145]/60 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400 block">Ready to practice?</span>
            <span className="text-xs font-medium text-white block">
              {recommendation.actionText}
            </span>
          </div>
          <Link
            href="/practice"
            className="px-3.5 py-1.5 rounded-xl bg-[#2373F4] hover:bg-[#578EF5] text-white text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99]"
          >
            Practice →
          </Link>
        </div>
      </div>
    </section>
  );
}

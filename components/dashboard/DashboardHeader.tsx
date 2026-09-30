'use client';

import React from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { Award, Zap } from 'lucide-react';

interface DashboardHeaderProps {
  name: string;
  grade: string;
  stream: string;
  rankInfo?: {
    rank: string;
    badge: string;
    tier: number;
  };
  levelInfo?: {
    level: number;
    progressPercentage: number;
  };
}

export function DashboardHeader({ name, grade, stream, rankInfo, levelInfo }: DashboardHeaderProps) {
  return (
    <header className="h-16 border-b border-white/[0.08] bg-[#0C0E14]/80 backdrop-blur-md sticky top-0 z-30 px-6 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-white tracking-tight">
          Dashboard
        </h2>
        <span className="hidden sm:inline-block text-[11px] text-[#FFF9D8]/80 font-normal px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">
          {grade} • {stream}
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {rankInfo && levelInfo && (
          <Link
            href="/profile"
            className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-[#FF9D50]/40 transition-all text-xs"
          >
            <span className="text-base">{rankInfo.badge}</span>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-[11px] font-semibold text-white">
                {rankInfo.rank} · Lv.{levelInfo.level}
              </span>
              <span className="text-[9px] text-[#FF9D50]">
                {levelInfo.progressPercentage}% to next level
              </span>
            </div>
          </Link>
        )}

        <span className="hidden md:inline-block text-xs font-medium text-zinc-300">
          {name}
        </span>
        <UserButton />
      </div>
    </header>
  );
}

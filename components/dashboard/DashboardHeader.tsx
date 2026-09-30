'use client';

import React from 'react';
import { UserButton } from '@clerk/nextjs';

interface DashboardHeaderProps {
  name: string;
  grade: string;
  stream: string;
}

export function DashboardHeader({ name, grade, stream }: DashboardHeaderProps) {
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

      <div className="flex items-center gap-4">
        <span className="hidden sm:inline-block text-xs font-medium text-zinc-300">
          {name}
        </span>
        <UserButton />
      </div>
    </header>
  );
}

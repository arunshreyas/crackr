import React from 'react';
import { Loader2 } from 'lucide-react';

export default function RevisionLoading() {
  return (
    <div className="flex min-h-screen bg-[#080A0E] text-white">
      <div className="hidden md:block w-60 h-screen bg-[#0C0E14] border-r border-white/[0.08]" />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-white/[0.08] bg-[#0C0E14]" />
        <main className="flex-1 px-4 sm:px-8 py-8 max-w-7xl w-full mx-auto flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF9D50]" />
            <span className="text-xs font-mono">Loading Smart Revision...</span>
          </div>
        </main>
      </div>
    </div>
  );
}

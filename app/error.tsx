'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router Boundary Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#080A0E] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xl font-bold text-rose-400">
          !
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Something went wrong</h1>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            An unexpected error occurred. You can retry the action or return to the dashboard.
          </p>
          {error?.digest && (
            <p className="text-[10px] text-zinc-600 font-mono mt-1">Error ID: {error.digest}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold transition-all cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-xs font-medium transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

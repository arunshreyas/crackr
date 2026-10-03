import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080A0E] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-2xl font-bold text-[#FF9D50]">
          404
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Page Not Found</h1>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            The page you are looking for does not exist or has been moved to a different URL.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-[#FF9D50] hover:bg-[#FFAA66] text-[#080A0E] text-xs font-semibold transition-all"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-xs font-medium transition-all"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

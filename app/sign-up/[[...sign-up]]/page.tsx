import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#080a0e] flex flex-col items-center justify-center p-4 sm:p-6 relative isolate overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#ff9e4f]/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-[#16cfd9]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Brand Header */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] transition-all"
        >
          <span className="text-base font-bold tracking-tight text-white">
            crackrr<span className="text-[#ff9e4f]">•</span>
          </span>
        </Link>
        <p className="text-xs text-zinc-400">Join Crackrr and accelerate your preparation</p>
      </div>

      {/* Clerk SignUp Component */}
      {!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#0C0E14] border border-amber-500/30 text-center space-y-3">
          <p className="text-sm font-semibold text-amber-300">Clerk Configuration Required</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            <code className="text-white bg-white/[0.08] px-1.5 py-0.5 rounded font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> is not configured in your production environment variables (e.g. Vercel).
          </p>
          <div className="pt-2 text-[11px] text-zinc-500 text-left bg-black/40 p-3 rounded-lg border border-white/[0.06] space-y-1 font-mono">
            <p>1. Go to Vercel Dashboard → Project Settings → Environment Variables</p>
            <p>2. Add: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_...</p>
            <p>3. Add: CLERK_SECRET_KEY = sk_live_...</p>
            <p>4. Redeploy your latest deployment.</p>
          </div>
        </div>
      ) : (
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/onboarding"
          forceRedirectUrl="/onboarding"
        />
      )}
    </div>
  );
}

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
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
            crackr<span className="text-[#ff9e4f]">•</span>
          </span>
        </Link>
        <p className="text-xs text-zinc-400">Welcome back to your practice workspace</p>
      </div>

      {/* Clerk SignIn Component */}
      <SignIn
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}

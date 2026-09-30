import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await currentUser();

  // 1. Unauthenticated check -> /sign-in
  if (!user) {
    redirect('/sign-in');
  }

  // 2. Query UserProfile from database via Prisma (server-only)
  const profile = await prisma.userProfile.findUnique({
    where: { clerkId: user.id },
  });

  // 3. Incomplete onboarding check -> /onboarding
  if (!profile || !profile.onboardingCompleted) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen bg-[#080a0e] text-zinc-100 flex flex-col selection:bg-[#ff9e4f]/30 selection:text-[#fff9d9]">
      {/* Navigation Header */}
      <header className="border-b border-white/[0.08] bg-[#0c0e14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1.5 group">
            <span className="font-semibold text-lg tracking-tight text-white group-hover:text-[#ff9e4f] transition-colors">
              crackr<span className="text-[#ff9e4f]">•</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-medium text-white block">{profile.name}</span>
              <span className="text-[11px] text-zinc-400 font-normal">@{profile.username}</span>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-[#ff9e4f] font-medium tracking-wide uppercase">
                Welcome back
              </span>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mt-1">
                {profile.name}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                {profile.grade} • {profile.stream} • {profile.school}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-center">
                <span className="text-xs text-zinc-400 block">Daily Target</span>
                <span className="text-sm font-semibold text-white">{profile.dailyGoal} Qs</span>
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-center">
                <span className="text-xs text-zinc-400 block">Difficulty</span>
                <span className="text-sm font-semibold text-[#50d97a]">{profile.preferredDifficulty || 'Moderate'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Shell */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-6 sm:p-8 text-center py-16 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#ff9e4f]/10 border border-[#ff9e4f]/20 flex items-center justify-center mx-auto text-[#ff9e4f] text-lg font-bold">
            ✓
          </div>
          <h2 className="text-lg font-medium text-white tracking-tight">
            Onboarding Completed
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Your profile has been saved to the database. Ready for practice sessions.
          </p>
        </div>
      </main>
    </div>
  );
}

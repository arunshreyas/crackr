import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { getSubjectChapterCatalog } from '@/lib/server/questions/service';
import { getActivePracticeSessions } from '@/lib/server/practice/service';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { PracticeContainer } from './PracticeContainer';

export const dynamic = 'force-dynamic';

export default async function PracticePage() {
  const { userId } = await auth();

  // 1. Unauthenticated check -> /sign-in
  if (!userId) {
    redirect('/sign-in');
  }

  const authCtx = await getAuthenticatedUser();

  // 2. Incomplete onboarding / profile check -> /onboarding
  if (!authCtx || !authCtx.profile.onboardingCompleted) {
    redirect('/onboarding');
  }

  // 3. Load catalog and check all active persistent sessions concurrently
  const [catalog, activeSessions] = await Promise.all([
    getSubjectChapterCatalog(),
    getActivePracticeSessions(),
  ]);

  return (
    <div className="min-h-screen bg-[#080A0E] text-zinc-100 flex selection:bg-[#FF9D50]/30 selection:text-[#FFF9D8]">
      {/* App Sidebar */}
      <AppSidebar />

      {/* Practice Workstation Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8">
          <Suspense fallback={<div className="p-8 text-center text-zinc-400 text-sm">Loading practice workstation...</div>}>
            <PracticeContainer
              catalog={catalog}
              preferredDifficulty={authCtx.profile.preferredDifficulty}
              initialActiveSessions={activeSessions}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

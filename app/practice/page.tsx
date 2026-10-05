import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { getSubjectChapterCatalog } from '@/lib/server/questions/service';
import { getActivePracticeSession } from '@/lib/server/practice/service';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { PracticeContainer } from './PracticeContainer';

export const dynamic = 'force-dynamic';

export default async function PracticePage() {
  const authCtx = await getAuthenticatedUser();

  // 1. Unauthenticated check -> /sign-in
  if (!authCtx) {
    redirect('/sign-in');
  }

  // 2. Incomplete onboarding check -> /onboarding
  if (!authCtx.profile.onboardingCompleted) {
    redirect('/onboarding');
  }

  // 3. Load catalog and check for active persistent session concurrently
  const [catalog, activeSession] = await Promise.all([
    getSubjectChapterCatalog(),
    getActivePracticeSession(),
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
              initialActiveSession={activeSession}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

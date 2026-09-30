import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/server/db';
import { getSubjectChapterCatalog } from '@/lib/server/questions/service';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { PracticeContainer } from './PracticeContainer';

export const dynamic = 'force-dynamic';

export default async function PracticePage() {
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

  // 4. Load dynamic chapter & question catalog from server-only DB query
  const catalog = await getSubjectChapterCatalog();

  return (
    <div className="min-h-screen bg-[#080A0E] text-zinc-100 flex selection:bg-[#FF9D50]/30 selection:text-[#FFF9D8]">
      {/* App Sidebar */}
      <AppSidebar />

      {/* Practice Workstation Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8">
          <PracticeContainer
            catalog={catalog}
            preferredDifficulty={profile.preferredDifficulty}
          />
        </main>
      </div>
    </div>
  );
}

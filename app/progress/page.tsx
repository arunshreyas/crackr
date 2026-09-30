import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/server/db';
import { getProgressData } from '@/lib/server/progress/service';
import { ProgressClient } from './ProgressClient';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
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

  // 4. Fetch aggregated progress analytics from server-only DB service
  const data = await getProgressData(profile.id);

  if (!data) {
    redirect('/onboarding');
  }

  return <ProgressClient data={data} />;
}

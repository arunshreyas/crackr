import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getDashboardData } from '@/lib/services/dashboard';
import { DashboardClient } from './DashboardClient';

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

  // 4. Fetch aggregated real dashboard statistics from server service
  const data = await getDashboardData(user.id);

  if (!data) {
    redirect('/onboarding');
  }

  return <DashboardClient data={data} />;
}

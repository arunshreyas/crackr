import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { getDashboardData } from '@/lib/services/dashboard';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
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

  // 3. Fetch aggregated real dashboard statistics from server service
  const data = await getDashboardData(authCtx.clerkId);

  if (!data) {
    redirect('/onboarding');
  }

  return <DashboardClient data={data} />;
}

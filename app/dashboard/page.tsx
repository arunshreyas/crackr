import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { getDashboardData } from '@/lib/services/dashboard';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const authCtx = await getAuthenticatedUser();

  // 1. Unauthenticated check -> /sign-in
  if (!authCtx) {
    redirect('/sign-in');
  }

  // 2. Incomplete onboarding check -> /onboarding
  if (!authCtx.profile.onboardingCompleted) {
    redirect('/onboarding');
  }

  // 3. Fetch aggregated real dashboard statistics from server service
  const data = await getDashboardData(authCtx.clerkId);

  if (!data) {
    redirect('/onboarding');
  }

  return <DashboardClient data={data} />;
}

import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { getProgressData } from '@/lib/server/progress/service';
import { ProgressClient } from './ProgressClient';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
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

  // 3. Fetch aggregated progress analytics from server-only DB service
  const data = await getProgressData(authCtx.profile.id);

  if (!data) {
    redirect('/onboarding');
  }

  return <ProgressClient data={data} />;
}

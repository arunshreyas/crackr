import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { getProgressData } from '@/lib/server/progress/service';
import { ProgressClient } from './ProgressClient';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const authCtx = await getAuthenticatedUser();

  // 1. Unauthenticated check -> /sign-in
  if (!authCtx) {
    redirect('/sign-in');
  }

  // 2. Incomplete onboarding check -> /onboarding
  if (!authCtx.profile.onboardingCompleted) {
    redirect('/onboarding');
  }

  // 3. Fetch aggregated progress analytics from server-only DB service
  const data = await getProgressData(authCtx.profile.id);

  if (!data) {
    redirect('/onboarding');
  }

  return <ProgressClient data={data} />;
}

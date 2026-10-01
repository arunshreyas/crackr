import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { getProfileData } from '@/lib/server/profile/service';
import { ProfileClient } from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const authCtx = await getAuthenticatedUser();

  // 1. Unauthenticated check -> /sign-in
  if (!authCtx) {
    redirect('/sign-in');
  }

  // 2. Incomplete onboarding check -> /onboarding
  if (!authCtx.profile.onboardingCompleted) {
    redirect('/onboarding');
  }

  // 3. Load comprehensive profile data from server-only DB service
  const data = await getProfileData(authCtx.profile.id);

  if (!data) {
    redirect('/onboarding');
  }

  return <ProfileClient data={data} />;
}

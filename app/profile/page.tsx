import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { getProfileData } from '@/lib/server/profile/service';
import { ProfileClient } from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
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

  // 3. Load comprehensive profile data from server-only DB service
  const data = await getProfileData(authCtx.profile.id);

  if (!data) {
    redirect('/onboarding');
  }

  return <ProfileClient data={data} />;
}

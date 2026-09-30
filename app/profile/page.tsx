import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/server/db';
import { getProfileData } from '@/lib/server/profile/service';
import { ProfileClient } from './ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
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

  // 4. Load comprehensive profile data from server-only DB service
  const data = await getProfileData(profile.id);

  if (!data) {
    redirect('/onboarding');
  }

  return <ProfileClient data={data} />;
}

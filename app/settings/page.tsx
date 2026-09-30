import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/server/db';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
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

  const initialProfile = {
    name: profile.name,
    username: profile.username,
    email: profile.email,
    school: profile.school,
    grade: profile.grade,
    stream: profile.stream,
    dailyGoal: profile.dailyGoal,
    preferredDifficulty: profile.preferredDifficulty,
  };

  return <SettingsClient initialProfile={initialProfile} />;
}

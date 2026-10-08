import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
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

  const initialProfile = {
    name: authCtx.profile.name,
    username: authCtx.profile.username,
    email: authCtx.profile.email,
    school: authCtx.profile.school,
    grade: authCtx.profile.grade,
    stream: authCtx.profile.stream,
    dailyGoal: authCtx.profile.dailyGoal,
    preferredDifficulty: authCtx.profile.preferredDifficulty,
  };

  return <SettingsClient initialProfile={initialProfile} />;
}

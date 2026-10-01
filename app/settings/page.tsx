import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const authCtx = await getAuthenticatedUser();

  // 1. Unauthenticated check -> /sign-in
  if (!authCtx) {
    redirect('/sign-in');
  }

  // 2. Incomplete onboarding check -> /onboarding
  if (!authCtx.profile.onboardingCompleted) {
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

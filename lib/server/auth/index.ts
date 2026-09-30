import 'server-only';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/server/db';
import { UserProfile } from '@prisma/client';

export interface AuthenticatedUserContext {
  clerkId: string;
  email: string;
  profile: UserProfile;
}

/**
 * Resolves the authenticated Clerk identity and links to the canonical UserProfile.
 * Never relies on client-provided IDs.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUserContext | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const profile = await prisma.userProfile.findUnique({
    where: { clerkId: clerkUser.id },
  });

  if (!profile) return null;

  const email =
    clerkUser.emailAddresses?.[0]?.emailAddress || profile.email || '';

  return {
    clerkId: clerkUser.id,
    email,
    profile,
  };
}

/**
 * Throws an error if the user is unauthenticated or has not completed onboarding.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUserContext> {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    throw new Error('UNAUTHORIZED: You must be signed in to perform this action.');
  }
  if (!auth.profile.onboardingCompleted) {
    throw new Error('ONBOARDING_REQUIRED: Profile onboarding must be completed.');
  }
  return auth;
}

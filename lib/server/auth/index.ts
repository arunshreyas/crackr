import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/server/db';
import { UserProfile } from '@prisma/client';

export interface AuthenticatedUserContext {
  clerkId: string;
  email: string;
  profile: UserProfile;
}

/**
 * Resolves the authenticated Clerk identity via local JWT verification (0ms network overhead)
 * and links to the canonical UserProfile in PostgreSQL.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUserContext | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const profile = await prisma.userProfile.findUnique({
    where: { clerkId: userId },
  });

  if (!profile) return null;

  return {
    clerkId: userId,
    email: profile.email || '',
    profile,
  };
}

/**
 * Throws an error if the user is unauthenticated or has not completed onboarding.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUserContext> {
  const authCtx = await getAuthenticatedUser();
  if (!authCtx) {
    throw new Error('UNAUTHORIZED: You must be signed in to perform this action.');
  }
  if (!authCtx.profile.onboardingCompleted) {
    throw new Error('ONBOARDING_REQUIRED: Profile onboarding must be completed.');
  }
  return authCtx;
}

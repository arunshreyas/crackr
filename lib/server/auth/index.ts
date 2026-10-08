import 'server-only';
import { auth, clerkClient } from '@clerk/nextjs/server';
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
 * Supports automatic email-linking for returning users so existing data is never lost.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUserContext | null> {
  const { userId } = await auth();
  if (!userId) return null;

  let profile = await prisma.userProfile.findUnique({
    where: { clerkId: userId },
  });

  // If not found by clerkId, attempt email-based lookup for existing user profiles
  if (!profile) {
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      const primaryEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

      if (primaryEmail) {
        const existingByEmail = await prisma.userProfile.findFirst({
          where: { email: primaryEmail },
        });

        if (existingByEmail) {
          // Re-link existing profile to the current Clerk user ID
          profile = await prisma.userProfile.update({
            where: { id: existingByEmail.id },
            data: { clerkId: userId },
          });
        }
      }
    } catch {
      // Ignore fallback error and proceed
    }
  }

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

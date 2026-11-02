import 'server-only';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma, withDatabaseRetry, DatabaseUnavailableError, isTransientDatabaseError } from '@/lib/server/db';
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
 * 
 * Handles transient database failures with bounded exponential-backoff retries.
 * If the database remains unreachable, throws DatabaseUnavailableError so callers
 * can distinguish a temporary database outage from an unauthenticated user.
 */
export async function getAuthenticatedUser(knownUserId?: string): Promise<AuthenticatedUserContext | null> {
  const userId = knownUserId ?? (await auth()).userId;
  if (!userId) return null;

  let profile: UserProfile | null = null;

  profile = await withDatabaseRetry(
    () =>
      prisma.userProfile.findUnique({
        where: { clerkId: userId },
      }),
    { operationName: 'user profile lookup' }
  );

  // If not found by clerkId, attempt email-based lookup for existing user profiles
  if (!profile) {
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      const primaryEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

      if (primaryEmail) {
        const existingByEmail = await withDatabaseRetry(
          () =>
            prisma.userProfile.findFirst({
              where: { email: primaryEmail },
            }),
          { operationName: 'email profile lookup' }
        );

        if (existingByEmail) {
          // Re-link existing profile to the current Clerk user ID
          profile = await withDatabaseRetry(
            () =>
              prisma.userProfile.update({
                where: { id: existingByEmail.id },
                data: { clerkId: userId },
              }),
            { operationName: 'profile clerkId relink' }
          );
        }
      }
    } catch (err) {
      if (err instanceof DatabaseUnavailableError || isTransientDatabaseError(err)) {
        throw err;
      }
      // Ignore fallback Clerk client errors and proceed
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

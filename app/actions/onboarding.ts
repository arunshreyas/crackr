'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/server/db';
import {
  toServerActionError,
  withDatabaseRetry,
  isTransientDatabaseError,
  DatabaseUnavailableError,
} from '@/lib/server/db/resilience';
import { Stream } from '@prisma/client';

export type OnboardingInput = {
  name: string;
  username: string;
  school: string;
  grade: string;
  stream: Stream;
  dailyGoal: number;
  preferredDifficulty?: string;
};

export async function submitOnboarding(data: OnboardingInput) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please sign in.', code: 'UNAUTHORIZED' };
    }

    let email = '';
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
    } catch (e) {
      console.warn('Could not fetch user details from Clerk client:', e);
    }

    // Clean and validate name & school
    const name = typeof data?.name === 'string' ? data.name.trim() : '';
    if (!name || name.length < 2) {
      return { success: false, error: 'Full name must be at least 2 characters.' };
    }

    const school = typeof data?.school === 'string' ? data.school.trim() : '';
    if (!school) {
      return { success: false, error: 'School / Institution cannot be empty.' };
    }

    const validStreams: Stream[] = ['PCM', 'PCMC', 'PCB', 'PCMB'];
    if (!validStreams.includes(data?.stream)) {
      return { success: false, error: 'Invalid study stream selected.' };
    }

    // Clean and validate username
    const username = typeof data?.username === 'string'
      ? data.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      : '';
    if (username.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }

    // Check if username is already taken by someone else
    const existingUser = await withDatabaseRetry(() =>
      prisma.userProfile.findUnique({
        where: { username },
      })
    );

    if (existingUser && existingUser.clerkId !== userId) {
      return { success: false, error: 'This username is already taken. Please choose another.' };
    }

    // Upsert user profile in database
    const profile = await withDatabaseRetry(() =>
      prisma.userProfile.upsert({
        where: { clerkId: userId },
        update: {
          ...(email ? { email } : {}),
          name: data.name.trim(),
          username,
          school: data.school.trim(),
          grade: data.grade,
          stream: data.stream as Stream,
          dailyGoal: Number(data.dailyGoal) || 10,
          preferredDifficulty: data.preferredDifficulty || 'Moderate',
          onboardingCompleted: true,
        },
        create: {
          clerkId: userId,
          email: email || `${username}@user.crackrr`,
          name: data.name.trim(),
          username,
          school: data.school.trim(),
          grade: data.grade,
          stream: data.stream as Stream,
          dailyGoal: Number(data.dailyGoal) || 10,
          preferredDifficulty: data.preferredDifficulty || 'Moderate',
          onboardingCompleted: true,
        },
      })
    );

    return { success: true, profile };
  } catch (error) {
    console.error('Error in submitOnboarding:', error);
    return toServerActionError(error, 'An unexpected error occurred while saving profile.');
  }
}

export async function checkOnboardingStatus() {
  try {
    const { userId } = await auth();
    if (!userId) return { isAuthenticated: false, onboardingCompleted: false };

    const profile = await withDatabaseRetry(() =>
      prisma.userProfile.findUnique({
        where: { clerkId: userId },
      })
    );

    return {
      isAuthenticated: true,
      onboardingCompleted: !!profile?.onboardingCompleted,
      profile,
    };
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    if (isTransientDatabaseError(error) || error instanceof DatabaseUnavailableError) {
      throw error;
    }
    return { isAuthenticated: false, onboardingCompleted: false };
  }
}

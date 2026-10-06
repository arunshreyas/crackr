'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/server/db';
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
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    let email = '';
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
    } catch (e) {
      console.warn('Could not fetch user details from Clerk client:', e);
    }

    // Clean and validate username
    const username = data.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (username.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }

    // Check if username is already taken by someone else
    const existingUser = await prisma.userProfile.findUnique({
      where: { username },
    });

    if (existingUser && existingUser.clerkId !== userId) {
      return { success: false, error: 'This username is already taken. Please choose another.' };
    }

    // Upsert user profile in database
    const profile = await prisma.userProfile.upsert({
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
    });

    return { success: true, profile };
  } catch (error) {
    console.error('Error in submitOnboarding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while saving profile.',
    };
  }
}

export async function checkOnboardingStatus() {
  try {
    const { userId } = await auth();
    if (!userId) return { isAuthenticated: false, onboardingCompleted: false };

    const profile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });

    return {
      isAuthenticated: true,
      onboardingCompleted: !!profile?.onboardingCompleted,
      profile,
    };
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return { isAuthenticated: false, onboardingCompleted: false };
  }
}

'use server';

import { currentUser } from '@clerk/nextjs/server';
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
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const email = user.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return { success: false, error: 'Valid email required from authentication provider.' };
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

    if (existingUser && existingUser.clerkId !== user.id) {
      return { success: false, error: 'This username is already taken. Please choose another.' };
    }

    // Upsert user profile in database
    const profile = await prisma.userProfile.upsert({
      where: { clerkId: user.id },
      update: {
        email,
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
        clerkId: user.id,
        email,
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
    const user = await currentUser();
    if (!user) return { isAuthenticated: false, onboardingCompleted: false };

    const profile = await prisma.userProfile.findUnique({
      where: { clerkId: user.id },
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

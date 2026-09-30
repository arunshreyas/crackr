'use server';

import { requireAuthenticatedUser } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { Stream } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export interface UpdateSettingsInput {
  name: string;
  school: string;
  grade: string;
  stream: Stream;
  dailyGoal: number;
  preferredDifficulty: string | null;
}

export async function updateSettingsAction(data: UpdateSettingsInput) {
  try {
    const auth = await requireAuthenticatedUser();

    const name = data.name.trim();
    if (!name || name.length < 2) {
      return { success: false, error: 'Full name must be at least 2 characters.' };
    }

    const school = data.school.trim();
    if (!school) {
      return { success: false, error: 'School / Institution cannot be empty.' };
    }

    const validStreams: Stream[] = ['PCM', 'PCMC', 'PCB', 'PCMB'];
    if (!validStreams.includes(data.stream)) {
      return { success: false, error: 'Invalid study stream selected.' };
    }

    const dailyGoal = Number(data.dailyGoal);
    if (!dailyGoal || dailyGoal < 5 || dailyGoal > 200) {
      return { success: false, error: 'Daily practice goal must be between 5 and 200 questions.' };
    }

    await prisma.userProfile.update({
      where: { id: auth.profile.id },
      data: {
        name,
        school,
        grade: data.grade,
        stream: data.stream,
        dailyGoal,
        preferredDifficulty: data.preferredDifficulty || 'ALL',
      },
    });

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    revalidatePath('/profile');
    revalidatePath('/progress');
    revalidatePath('/practice');

    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings.',
    };
  }
}

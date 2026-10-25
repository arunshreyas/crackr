import 'server-only';
import React from 'react';
import { requireAuthenticatedUser } from '@/lib/server/auth';
import { getUserRevisionNotes, getNotesSummary } from '@/lib/server/notes/service';
import { NotesClient } from './NotesClient';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Smart Revision Notes · Crackrr',
  description: 'Review your saved questions, visual worked solutions, and weak concepts for JEE preparation.',
};

export default async function NotesPage() {
  let authCtx;
  try {
    authCtx = await requireAuthenticatedUser();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('ONBOARDING_REQUIRED')) {
      redirect('/onboarding');
    }
    redirect('/sign-in');
  }

  const [notes, summary] = await Promise.all([
    getUserRevisionNotes(authCtx.profile.id),
    getNotesSummary(authCtx.profile.id),
  ]);

  return (
    <div className="flex min-h-screen bg-[#080A0E] text-white">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          name={authCtx.profile.name}
          grade={authCtx.profile.grade}
          stream={authCtx.profile.stream}
        />
        <main className="flex-1 px-4 sm:px-8 py-8 max-w-7xl w-full mx-auto space-y-8">
          <NotesClient initialNotes={notes} initialSummary={summary} />
        </main>
      </div>
    </div>
  );
}

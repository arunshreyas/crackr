import 'server-only';
import React from 'react';
import { requireAuthenticatedUser } from '@/lib/server/auth';
import { getRevisionDashboardData } from '@/lib/server/revision/service';
import { RevisionClient } from './RevisionClient';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Smart Revision · Crackrr',
  description: 'Revisit weak concepts and missed questions with intelligent spaced repetition for JEE preparation.',
};

export default async function RevisionPage() {
  let authCtx;
  try {
    authCtx = await requireAuthenticatedUser();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('ONBOARDING_REQUIRED')) {
      redirect('/onboarding');
    }
    redirect('/sign-in');
  }

  const dashboardData = await getRevisionDashboardData(authCtx.profile.id);

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
          <RevisionClient initialData={dashboardData} />
        </main>
      </div>
    </div>
  );
}

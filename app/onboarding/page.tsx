import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/server/db';
import { OnboardingForm } from './OnboardingForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Check if profile already completed
  const existingProfile = await prisma.userProfile.findUnique({
    where: { clerkId: userId },
  });

  if (existingProfile?.onboardingCompleted) {
    redirect('/dashboard');
  }

  let initialEmail = existingProfile?.email || '';
  let initialName = existingProfile?.name || '';
  let suggestedUsername = existingProfile?.username || '';

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    if (clerkUser) {
      initialEmail = clerkUser.emailAddresses?.[0]?.emailAddress || initialEmail;
      const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
      if (fullName) initialName = fullName;
      if (clerkUser.username) {
        suggestedUsername = clerkUser.username;
      } else if (clerkUser.firstName) {
        suggestedUsername = `${clerkUser.firstName.toLowerCase()}_${userId.slice(-4).toLowerCase()}`;
      }
    }
  } catch {
    // Fallback smoothly if clerkClient user fetch fails
  }

  return (
    <div className="min-h-screen bg-[#080a0e] text-zinc-100 flex flex-col justify-between py-10 px-4 sm:px-6">
      {/* Brand Header */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 group">
          <span className="text-xl font-semibold tracking-tight text-white group-hover:text-[#ff9d50] transition-colors">
            crackr<span className="text-[#ff9d50]">•</span>
          </span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center my-8">
        <div className="w-full max-w-xl mx-auto">
          {/* Confident, Human Page Heading */}
          <div className="mb-6 text-left">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Let&apos;s get you set up.
            </h1>
            <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
              A few quick questions to personalize your practice.
            </p>
          </div>

          {/* Interactive Form Component */}
          <OnboardingForm
            initialEmail={initialEmail}
            initialName={initialName}
            suggestedUsername={suggestedUsername}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-xl mx-auto text-center text-xs text-zinc-500 py-4">
        Crackr • Practice smarter.
      </footer>
    </div>
  );
}

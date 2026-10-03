import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Crackr',
  description: 'Understand how Crackr collects, uses, and protects your practice and personal data.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'October 3, 2026';

  return (
    <div className="min-h-screen bg-[#080A0E] text-zinc-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header Navigation */}
        <header className="flex items-center justify-between pb-8 mb-8 border-b border-white/[0.08]">
          <Link href="/" className="inline-flex items-center gap-1.5 group">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#FF9D50] transition-colors">
              crackr<span className="text-[#FF9D50]">•</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </header>

        {/* Content */}
        <main className="space-y-8 text-sm text-zinc-300 leading-relaxed">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Privacy Policy</h1>
            <p className="text-xs text-zinc-400 mt-2">Last Updated: {lastUpdated}</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">1. Introduction</h2>
            <p>
              Crackr (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides an adaptive practice platform for students preparing for competitive examinations like JEE. This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you access or use our web application at <code className="text-white font-mono text-xs">crackrr.vercel.app</code>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">2. Information We Collect</h2>
            <p>We collect only the information necessary to provide and personalize your practice experience:</p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300">
              <li>
                <strong className="text-white">Account Information:</strong> Name, email address, username, and authentication identifiers provided through our authentication provider (Clerk).
              </li>
              <li>
                <strong className="text-white">Academic & Profile Details:</strong> Current grade/class, subject stream (PCM, PCB, etc.), school or coaching institution, and daily practice targets.
              </li>
              <li>
                <strong className="text-white">Practice & Diagnostic Data:</strong> Question attempts, selected options, response times, session durations, accuracy metrics, chapter mastery, XP earned, streaks, and achievement progress.
              </li>
              <li>
                <strong className="text-white">Technical Usage Data:</strong> Standard server logs, device types, browser user-agents, and IP addresses used strictly for security, rate-limiting, and error diagnostics.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">3. How We Use Your Information</h2>
            <p>Your data is used strictly for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300">
              <li>Providing, maintaining, and personalizing the practice experience and question recommendations.</li>
              <li>Calculating performance analytics, chapter mastery, and gamification rewards (XP, streaks, ranks).</li>
              <li>Authenticating your identity and preventing unauthorized access or abuse.</li>
              <li>Communicating critical service updates, account notifications, or support responses.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">4. Third-Party Service Providers</h2>
            <p>We rely on trusted third-party cloud infrastructure providers to operate the platform:</p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300">
              <li>
                <strong className="text-white">Clerk:</strong> User authentication and session management.
              </li>
              <li>
                <strong className="text-white">Vercel:</strong> Cloud hosting, serverless edge compute, and CDN.
              </li>
              <li>
                <strong className="text-white">Supabase / PostgreSQL:</strong> Secure database storage and persistence.
              </li>
            </ul>
            <p>We do not sell, rent, or monetize student personal information to third parties or advertising networks.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">5. Data Retention and Account Deletion</h2>
            <p>
              We retain your personal data for as long as your account remains active. You can permanently delete your entire account and all associated practice history, answers, XP, and personal information at any time directly through the <Link href="/settings" className="text-[#FF9D50] underline">Settings</Link> page (&quot;Danger Zone&quot;). Upon confirmation, your data is permanently removed from our active database and authentication systems.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">6. Data Security</h2>
            <p>
              We implement industry-standard security measures including HTTPS/TLS encryption in transit, strict server-side authorization checks, database row-level security (RLS), and principle-of-least-privilege secret management. However, no internet transmission is 100% secure, and we encourage users to maintain secure login credentials.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">7. Contact Us</h2>
            <p>
              If you have any questions or concerns regarding this Privacy Policy, please contact us at <code className="text-white font-mono text-xs">privacy@crackr.app</code> or through our GitHub repository.
            </p>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-white/[0.08] text-center text-xs text-zinc-500">
          Crackr • Practice smarter. Get better. Faster.
        </footer>
      </div>
    </div>
  );
}

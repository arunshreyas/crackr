import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Crackrr',
  description: 'Terms and conditions governing the use of Crackrr practice platform.',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'October 3, 2026';

  return (
    <div className="min-h-screen bg-[#080A0E] text-zinc-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header Navigation */}
        <header className="flex items-center justify-between pb-8 mb-8 border-b border-white/[0.08]">
          <Link href="/" className="inline-flex items-center gap-1.5 group">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#FF9D50] transition-colors">
              crackrr<span className="text-[#FF9D50]">•</span>
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
            <h1 className="text-3xl font-bold text-white tracking-tight">Terms of Service</h1>
            <p className="text-xs text-zinc-400 mt-2">Last Updated: {lastUpdated}</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By creating an account or accessing the Crackrr platform (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">2. Educational & Practice Use</h2>
            <p>
              Crackrr is an independent academic preparation and diagnostic tool designed to help students practice and review questions for competitive examinations (such as JEE Main and Advanced). Crackrr is not affiliated with, sponsored by, or endorsed by the National Testing Agency (NTA), the Joint Admission Board (JAB), or any government body.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">3. Intellectual Property & Content Disclaimer</h2>
            <p>
              The platform code, UI design, analytics algorithms, and branding are the property of Crackrr. Previous year examination questions included in our practice repository are used solely for educational, nominative, and transformative review purposes.
            </p>
            <p>
              If you believe any content on Crackrr infringes your copyright or intellectual property rights, please notify us immediately at <code className="text-white font-mono text-xs">copyright@crackrr.app</code> with details of the affected item for prompt review and resolution.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">4. User Accounts & Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300">
              <li>Attempt to reverse-engineer, exploit, or bypass server-side validation, rate limits, or gamification logic.</li>
              <li>Scrape, crawl, or extract questions or platform data using automated scripts without explicit authorization.</li>
              <li>Impersonate another individual or provide false academic credentials.</li>
              <li>Interfere with the normal operation, security, or availability of the Service.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">5. Account Termination</h2>
            <p>
              You may terminate your account at any time via the Settings page. We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent or abusive activities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">6. Disclaimers & Limitation of Liability</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. CRACKRR DOES NOT GUARANTEE SPECIFIC EXAMINATION RESULTS, RANK OUTCOMES, OR ERROR-FREE QUESTION FORMULAS. IN NO EVENT SHALL CRACKRR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">7. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Continued use of the Service following any updates constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">8. Contact Information</h2>
            <p>
              For legal notices or questions regarding these Terms, please contact <code className="text-white font-mono text-xs">legal@crackrr.app</code>.
            </p>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-white/[0.08] text-center text-xs text-zinc-500">
          Crackrr • Practice smarter. Get better. Faster.
        </footer>
      </div>
    </div>
  );
}

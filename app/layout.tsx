import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { Geist, Geist_Mono } from 'next/font/google'
import 'katex/dist/katex.min.css'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const BASE_URL = 'https://crackrr.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Crackrr — JEE MCQ Practice & Diagnostic Mastery',
    template: '%s | Crackrr',
  },
  description:
    'Targeted JEE Main & Advanced practice platform with real PYQs, atomic answer validation, chapter-level diagnostics, and gamified progress tracking.',
  keywords: [
    'JEE Main practice',
    'JEE Advanced questions',
    'JEE PYQs',
    'Physics practice',
    'Chemistry practice',
    'Mathematics practice',
    'Crackrr',
  ],
  authors: [{ name: 'Crackrr Team' }],
  creator: 'Crackrr',
  publisher: 'Crackrr',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    title: 'Crackrr — JEE MCQ Practice & Diagnostic Mastery',
    description:
      'Practice smarter with verified JEE questions, instant step-by-step diagnostic feedback, and structured mastery tracking.',
    siteName: 'Crackrr',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crackrr — JEE MCQ Practice & Diagnostic Mastery',
    description:
      'Practice smarter with verified JEE questions, instant step-by-step diagnostic feedback, and structured mastery tracking.',
    creator: '@crackrrapp',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Crackrr',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any (Web Browser)',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description:
    'Targeted JEE Main & Advanced practice engine featuring verified PYQs, chapter mastery diagnostics, and adaptive study tracking.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        ...dark,
        variables: {
          ...dark.variables,
          colorPrimary: '#ff9e4f',
          colorBackground: '#0c0e14',
        },
        elements: {
          card: 'bg-[#0c0e14] border border-white/[0.08] shadow-2xl rounded-2xl text-white',
          headerTitle: 'text-white font-bold text-lg',
          headerSubtitle: 'text-zinc-400 text-xs',
          socialButtonsBlockButton: 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white',
          socialButtonsBlockButtonText: 'text-white font-medium',
          formButtonPrimary: 'bg-[#ff9e4f] hover:bg-[#ffaa66] text-[#080a0e] font-semibold transition-all',
          formFieldInput: 'bg-[#12161f] border border-white/[0.1] text-white focus:border-[#ff9e4f]',
          formFieldLabel: 'text-zinc-300 text-xs',
          footerActionLink: 'text-[#ff9e4f] hover:text-[#ffaa66]',
          footerActionText: 'text-zinc-400',
          dividerLine: 'bg-white/[0.08]',
          dividerText: 'text-zinc-500 text-xs',
        },
      }}
    >
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body className="min-h-full flex flex-col bg-[#080a0e] text-zinc-100 font-sans selection:bg-[#ff9e4f]/30 selection:text-[#fff9d9]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
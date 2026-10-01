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

export const metadata: Metadata = {
  title: 'Crackr — Practice smarter. Get better. Faster.',
  description: 'AI-assisted adaptive practice engine for JEE, NEET, and competitive exams.',
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
        <body className="min-h-full flex flex-col bg-[#080a0e] text-zinc-100 font-sans selection:bg-[#ff9e4f]/30 selection:text-[#fff9d9]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://crackrr.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/privacy', '/terms', '/sign-in', '/sign-up'],
        disallow: [
          '/dashboard',
          '/practice',
          '/progress',
          '/profile',
          '/settings',
          '/onboarding',
          '/api/',
          '/_next/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

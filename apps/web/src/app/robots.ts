import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard',
          '/forge',
          '/inbox',
          '/contacts',
          '/agent',
          '/knowledge',
          '/whatsapp',
          '/team',
          '/integrations',
          '/billing',
          '/settings',
          '/automations',
          '/analytics',
          '/onboarding',
        ],
      },
    ],
    sitemap: `${base.replace(/\/$/, '')}/sitemap.xml`,
  };
}

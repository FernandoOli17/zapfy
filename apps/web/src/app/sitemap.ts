import type { MetadataRoute } from 'next';

import { listSlugs } from '@/lib/blog';

const VERTICALS = ['ecommerce', 'clinica', 'restaurante', 'infoproduto', 'servico'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, priority: 1.0, changeFrequency: 'weekly' },
    { url: `${base}/precos`, lastModified: now, priority: 0.9, changeFrequency: 'monthly' },
    { url: `${base}/sobre`, lastModified: now, priority: 0.6, changeFrequency: 'monthly' },
    { url: `${base}/contato`, lastModified: now, priority: 0.6, changeFrequency: 'monthly' },
    { url: `${base}/blog`, lastModified: now, priority: 0.8, changeFrequency: 'weekly' },
    { url: `${base}/termos`, lastModified: now, priority: 0.3, changeFrequency: 'yearly' },
    { url: `${base}/privacidade`, lastModified: now, priority: 0.3, changeFrequency: 'yearly' },
    { url: `${base}/lgpd`, lastModified: now, priority: 0.4, changeFrequency: 'yearly' },
    { url: `${base}/login`, lastModified: now, priority: 0.2, changeFrequency: 'yearly' },
    { url: `${base}/signup`, lastModified: now, priority: 0.7, changeFrequency: 'yearly' },
  ];

  const verticalRoutes: MetadataRoute.Sitemap = VERTICALS.map((v) => ({
    url: `${base}/casos/${v}`,
    lastModified: now,
    priority: 0.7,
    changeFrequency: 'monthly' as const,
  }));

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const slugs = await listSlugs();
    blogRoutes = slugs.map((slug) => ({
      url: `${base}/blog/${slug}`,
      lastModified: now,
      priority: 0.5,
      changeFrequency: 'monthly' as const,
    }));
  } catch {
    // sem posts → pula
  }

  return [...staticRoutes, ...verticalRoutes, ...blogRoutes];
}

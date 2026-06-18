import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zapfy',
    short_name: 'Zapfy',
    description: 'O WhatsApp da sua empresa, com cérebro próprio.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#05070f',
    theme_color: '#00E676',
    lang: 'pt-BR',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['business', 'productivity', 'communication'],
  };
}

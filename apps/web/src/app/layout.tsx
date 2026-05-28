import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

import { Suspense } from 'react';

import { ToastProvider, Toaster } from '@zapfy/ui';

import { ThemeProvider } from '@/components/theme-provider';
import { PostHogProvider } from '@/components/posthog-provider';

import './globals.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Zapfy — Agente IA para WhatsApp',
    template: '%s · Zapfy',
  },
  description:
    'Crie seu agente de WhatsApp com IA em minutos. O Forge entrevista seu negócio e monta tudo automaticamente.',
  metadataBase: new URL(process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'),
  openGraph: {
    title: 'Zapfy — Agente IA para WhatsApp',
    description:
      'Crie seu agente de WhatsApp com IA em minutos. O Forge entrevista seu negócio e monta tudo automaticamente.',
    images: ['/brand/logo-primary.svg'],
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Suspense fallback={null}>
            <PostHogProvider>
              <ToastProvider>
                {children}
                <Toaster />
              </ToastProvider>
            </PostHogProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}

import Script from 'next/script';

import { MarketingFooter } from '@/components/marketing/footer';
import { MarketingHeader } from '@/components/marketing/header';

const ORGANIZATION_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Trato',
  url: 'https://trato.dev',
  logo: 'https://trato.dev/icon-512.png',
  description:
    'SaaS multi-tenant de agente IA pra WhatsApp Business. O Forge constrói o agente conversando com você — sem fluxograma.',
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'oi@trato.dev',
    contactType: 'customer support',
    availableLanguage: ['Portuguese'],
  },
};

const SOFTWARE_APP_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Trato',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Agente IA pro WhatsApp da sua empresa. Construído pela própria IA via Forge — sem fluxograma, sem código.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '97',
      priceCurrency: 'BRL',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '297',
      priceCurrency: 'BRL',
    },
    {
      '@type': 'Offer',
      name: 'Premium',
      price: '697',
      priceCurrency: 'BRL',
    },
  ],
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950" style={{ overflowX: 'clip' }}>
      <Script
        id="ld-organization"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_LD) }}
      />
      <Script
        id="ld-softwareapp"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APP_LD) }}
      />
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}

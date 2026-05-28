import Link from 'next/link';
import { ZapfyLogo } from '@zapfy/ui';

const COLUMNS = [
  {
    title: 'Produto',
    links: [
      { href: '/', label: 'Início' },
      { href: '/precos', label: 'Preços' },
      { href: '/casos/ecommerce', label: 'E-commerce' },
      { href: '/casos/clinica', label: 'Clínicas' },
      { href: '/casos/restaurante', label: 'Restaurantes' },
      { href: '/casos/infoproduto', label: 'Infoproduto' },
      { href: '/casos/servico', label: 'Serviços' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { href: '/sobre', label: 'Sobre' },
      { href: '/blog', label: 'Blog' },
      { href: '/contato', label: 'Contato' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/termos', label: 'Termos de uso' },
      { href: '/privacidade', label: 'Privacidade' },
      { href: '/lgpd', label: 'LGPD' },
    ],
  },
  {
    title: 'Redes sociais',
    links: [
      { href: 'https://instagram.com/zapfybr', label: 'Instagram', external: true },
      { href: 'https://twitter.com/zapfybr', label: 'Twitter / X', external: true },
      { href: 'https://linkedin.com/company/zapfy', label: 'LinkedIn', external: true },
      { href: 'https://github.com/zapfy', label: 'GitHub', external: true },
    ],
  },
] as const;

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[#1a1a1a] bg-[#080808]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="Zapfy" className="inline-flex">
              <ZapfyLogo variant="white" height={26} />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-[#666]">
              O WhatsApp da sua empresa, com cérebro próprio. Configure conversando, atenda
              24/7.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Cloud API oficial Meta', 'AES-256-GCM', 'LGPD-friendly'].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-full border border-[#1a1a1a] bg-[#111] px-2.5 py-1 text-[10px] font-medium text-[#666]"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#888]">
                {col.title}
              </h4>
              <ul className="mt-5 space-y-3 text-sm">
                {col.links.map((link) => {
                  const isExternal = 'external' in link && link.external;
                  const cls = 'text-[#666] transition-colors hover:text-[#00E676]';
                  return (
                    <li key={link.href}>
                      {isExternal ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={cls}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className={cls}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-[#1a1a1a] pt-6 md:flex-row md:items-center">
          <p className="text-xs text-[#444]">
            © {year} Zapfy · Todos os direitos reservados
          </p>
          <p className="text-xs text-[#444]">Feito no Brasil 🇧🇷</p>
        </div>
      </div>
    </footer>
  );
}

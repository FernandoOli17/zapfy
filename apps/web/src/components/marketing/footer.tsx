import Link from 'next/link';

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
] as const;

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/[0.06] bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-white"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white shadow-lg shadow-violet-900/40">
                O
              </span>
              Orbe
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              O WhatsApp da sua empresa, com cérebro próprio. Configure conversando, atenda
              24/7.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Cloud API oficial Meta', 'AES-256-GCM', 'LGPD-friendly'].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-zinc-500"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-zinc-500 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/[0.06] pt-6 md:flex-row md:items-center">
          <p className="text-xs text-zinc-600">© {year} Orbe · Todos os direitos reservados</p>
          <p className="text-xs text-zinc-600">Feito no Brasil 🇧🇷</p>
        </div>
      </div>
    </footer>
  );
}

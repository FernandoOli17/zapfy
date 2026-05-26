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
    <footer className="relative border-t border-white/[0.06]">
      {/* Subtle blue glow no topo do footer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32"
        style={{
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, hsl(213 93% 55% / 0.08), transparent 70%)',
        }}
      />
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              className="group inline-flex items-center gap-2 font-semibold tracking-tight"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground shadow-md shadow-primary/30">
                O
              </span>
              Orbe
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              O WhatsApp da sua empresa, com cérebro próprio. Configure conversando, atenda
              24/7.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                Cloud API oficial Meta
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                AES-256-GCM
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                LGPD-friendly
              </span>
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-primary"
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
          <p className="text-xs text-muted-foreground">
            © {year} Orbe · Todos os direitos reservados
          </p>
          <p className="text-xs text-muted-foreground">Feito no Brasil 🇧🇷</p>
        </div>
      </div>
    </footer>
  );
}

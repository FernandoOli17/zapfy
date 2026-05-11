import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Produto',
    links: [
      { href: '/', label: 'Início' },
      { href: '/precos', label: 'Preços' },
      { href: '/casos/ecommerce', label: 'Casos · E-commerce' },
      { href: '/casos/clinica', label: 'Casos · Clínica' },
      { href: '/casos/restaurante', label: 'Casos · Restaurante' },
      { href: '/casos/infoproduto', label: 'Casos · Infoproduto' },
      { href: '/casos/servico', label: 'Casos · Serviços' },
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
    <footer className="border-t border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
              ZapAI
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              O WhatsApp da sua empresa, com cérebro próprio. Configure conversando, atenda 24/7.
            </p>
            <p className="mt-6 text-xs text-muted-foreground">
              Cloud API oficial da Meta · LGPD-friendly · Cifra AES-256-GCM nos tokens
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground">{col.title}</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 md:flex-row md:items-center">
          <p className="text-xs text-muted-foreground">
            © {year} ZapAI. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Feito no Brasil 🇧🇷
          </p>
        </div>
      </div>
    </footer>
  );
}

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@zapai/ui';

import { ThemeToggle } from '@/components/theme-toggle';

const NAV = [
  { href: '/precos', label: 'Preços' },
  { href: '/casos/ecommerce', label: 'Casos' },
  { href: '/blog', label: 'Blog' },
  { href: '/sobre', label: 'Sobre' },
] as const;

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
          ZapAI
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">
              Criar conta
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

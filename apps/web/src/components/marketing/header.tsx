import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@zapai/ui';

const NAV = [
  { href: '/precos', label: 'Preços' },
  { href: '/casos/ecommerce', label: 'Casos' },
  { href: '/blog', label: 'Blog' },
  { href: '/sobre', label: 'Sobre' },
] as const;

export function MarketingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white shadow-lg shadow-violet-900/40">
            O
          </span>
          <span>Orbe</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden text-zinc-400 hover:bg-white/[0.06] hover:text-white sm:inline-flex">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="bg-violet-600 text-white shadow-lg shadow-violet-900/30 hover:bg-violet-500">
            <Link href="/signup">
              Criar conta
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

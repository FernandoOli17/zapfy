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
    <header
      className="sticky top-0 z-50 border-b border-white/[0.08]"
      style={{
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
    >
      {/* Glass overlay: dark glass leve que funciona sobre seções claras E escuras */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to bottom, hsl(225 50% 6% / 0.58), hsl(225 50% 6% / 0.42))',
        }}
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link
          href="/"
          className="group flex items-center gap-2 font-semibold tracking-tight text-foreground"
        >
          <span className="relative flex h-7 w-7 items-center justify-center">
            {/* Logo: blue square com glow no hover */}
            <span
              className="absolute inset-0 rounded-lg bg-primary/20 blur-md transition-opacity group-hover:opacity-100"
              aria-hidden
            />
            <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/30">
              O
            </span>
          </span>
          <span>Orbe</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors duration-200 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-muted-foreground hover:bg-white/[0.04] hover:text-foreground sm:inline-flex"
          >
            <Link href="/login">Entrar</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30"
          >
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

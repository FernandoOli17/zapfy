'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Button } from '@zapai/ui';

const NAV = [
  { href: '/precos', label: 'Preços' },
  { href: '/casos/ecommerce', label: 'Casos' },
  { href: '/blog', label: 'Blog' },
  { href: '/sobre', label: 'Sobre' },
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha drawer quando muda de rota
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloqueia scroll do body quando o menu mobile está aberto
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  // Esc fecha
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold tracking-tight text-white"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white shadow-lg shadow-violet-900/40">
              O
            </span>
            <span>Trato</span>
          </Link>

          <nav
            className="hidden items-center gap-7 text-sm text-zinc-400 md:flex"
            aria-label="Principal"
          >
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
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden text-zinc-400 hover:bg-white/[0.06] hover:text-white sm:inline-flex"
            >
              <Link href="/login">Entrar</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-violet-600 text-white shadow-lg shadow-violet-900/30 hover:bg-violet-500"
            >
              <Link href="/signup">
                Criar conta
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 z-40 transition-opacity md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!open}
      >
        <div
          className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        <nav
          className={`absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-1 border-l border-white/[0.06] bg-zinc-950 px-5 pb-6 pt-20 shadow-2xl transition-transform ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
          aria-label="Menu mobile"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-3 text-base text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <Link
              href="/login"
              className="block rounded-md px-3 py-3 text-base text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="mt-2 flex items-center justify-between rounded-md bg-violet-600 px-3 py-3 text-base font-medium text-white shadow-lg shadow-violet-900/30 transition-colors hover:bg-violet-500"
            >
              Criar conta
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}

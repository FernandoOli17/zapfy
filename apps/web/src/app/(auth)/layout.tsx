import Link from 'next/link';

import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-[5fr_7fr] lg:grid-cols-[2fr_3fr]">
      <BrandPanel />
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight md:hidden">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
            ZapAI
          </Link>
          <span className="hidden md:block text-sm text-muted-foreground">Falta pouco.</span>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-12 md:px-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="px-6 py-5 md:px-10 text-xs text-muted-foreground">
          ZapAI ©{' '}
          <span suppressHydrationWarning>{new Date().getFullYear()}</span>
          {' · '}
          <Link href="/termos" className="hover:text-foreground">
            Termos
          </Link>
          {' · '}
          <Link href="/privacidade" className="hover:text-foreground">
            Privacidade
          </Link>
        </footer>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-zinc-950 text-zinc-100 md:flex md:flex-col md:justify-between md:p-10 lg:p-14">
      <div className="bg-dot-grid absolute inset-0 opacity-25" aria-hidden />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 100%, color-mix(in srgb, hsl(142 76% 36%) 25%, transparent), transparent 60%)',
        }}
      />
      <Link href="/" className="relative flex items-center gap-2 font-semibold tracking-tight">
        <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
        ZapAI
      </Link>

      <div className="relative">
        <p className="text-xs uppercase tracking-widest text-zinc-500">A diferença</p>
        <h2 className="mt-4 text-3xl font-medium leading-[1.1] tracking-tight lg:text-4xl">
          O segredo não é a IA que atende.{' '}
          <span className="font-serif italic font-normal text-primary">
            É a IA que constrói a IA que atende.
          </span>
        </h2>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-zinc-400">
          Sem formulário de 40 campos. Você conversa com o Forge, ele entrevista seu negócio e
          monta o agente — system prompt, tom, tools, fluxos, handoff. Em minutos.
        </p>
      </div>

      <div className="relative text-xs text-zinc-500">
        Cloud API oficial da Meta · LGPD-friendly · Cifra AES-256-GCM nos tokens
      </div>
    </aside>
  );
}

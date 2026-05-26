import Link from 'next/link';

import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-[5fr_7fr] lg:grid-cols-[2fr_3fr]">
      <BrandPanel />
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight md:hidden">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <span className="text-[10px] font-bold text-primary-foreground">O</span>
            </div>
            Orbe
          </Link>
          <span className="hidden md:block text-sm text-muted-foreground">Falta pouco.</span>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-12 md:px-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="px-6 py-5 md:px-10 text-xs text-muted-foreground">
          Orbe ©{' '}
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
      <div className="bg-dot-grid absolute inset-0 opacity-20" aria-hidden />
      {/* radial blue glow */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 100%, color-mix(in srgb, hsl(213 93% 55%) 30%, transparent), transparent 60%)',
        }}
      />
      {/* secondary nebula glow */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 100% 0%, color-mix(in srgb, hsl(263 70% 50%) 20%, transparent), transparent 65%)',
        }}
      />
      {/* top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        aria-hidden
        style={{
          background:
            'linear-gradient(90deg, transparent, hsl(213 93% 68%), transparent)',
        }}
      />

      <Link href="/" className="relative flex items-center gap-2.5 font-semibold tracking-tight">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <span className="text-xs font-bold text-white">O</span>
        </div>
        Orbe
      </Link>

      <div className="relative">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Por que Orbe</p>
        <h2 className="mt-4 text-3xl font-medium leading-[1.1] tracking-tight lg:text-4xl">
          Não é um bot.{' '}
          <span className="font-serif italic font-normal text-primary">
            É um funcionário que nunca dorme.
          </span>
        </h2>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-zinc-400">
          Você conversa com o Forge, ele entrevista seu negócio e monta o agente —
          system prompt, tom, fluxos e handoff pra equipe. Sem formulário. Em minutos.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {[
            ['24/7', 'Atendimento contínuo'],
            ['< 2s', 'Tempo de resposta'],
            ['Cloud API', 'Meta oficial'],
            ['LGPD', 'Privacidade garantida'],
          ].map(([val, desc]) => (
            <div key={val} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="text-sm font-semibold text-primary">{val}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative text-xs text-zinc-600">
        Cloud API oficial da Meta · AES-256-GCM · LGPD-friendly
      </div>
    </aside>
  );
}

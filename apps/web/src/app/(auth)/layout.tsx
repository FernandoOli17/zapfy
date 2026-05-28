import Link from 'next/link';
import { ZapfyLogo } from '@zapfy/ui';

import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-[#0a0a0a] md:grid-cols-[5fr_7fr] lg:grid-cols-[2fr_3fr]">
      <BrandPanel />
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" aria-label="Zapfy" className="md:hidden">
            <ZapfyLogo variant="white" height={24} />
          </Link>
          <span className="hidden text-sm text-[#888] md:block">Falta pouco.</span>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-12 md:px-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="px-6 py-5 text-xs text-[#666] md:px-10">
          Zapfy ©{' '}
          <span suppressHydrationWarning>{new Date().getFullYear()}</span>
          {' · '}
          <Link href="/termos" className="transition-colors hover:text-[#00E676]">
            Termos
          </Link>
          {' · '}
          <Link href="/privacidade" className="transition-colors hover:text-[#00E676]">
            Privacidade
          </Link>
        </footer>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#080808] text-zinc-100 md:flex md:flex-col md:justify-between md:p-10 lg:p-14">
      {/* dot grid sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* glow verde inferior */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 100%, rgba(0,230,118,0.25), transparent 60%)',
        }}
      />
      {/* glow verde topo direita */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 100% 0%, rgba(0,230,118,0.10), transparent 65%)',
        }}
      />
      {/* top accent line verde */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, #00E676, transparent)',
        }}
      />

      <Link href="/" aria-label="Zapfy" className="relative inline-flex">
        <ZapfyLogo variant="white" height={28} />
      </Link>

      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
          Por que Zapfy
        </p>
        <h2 className="mt-4 text-3xl font-medium leading-[1.1] tracking-tight lg:text-4xl">
          Não é um bot.{' '}
          <span className="font-serif italic font-normal text-[#00E676]">
            É um funcionário que nunca dorme.
          </span>
        </h2>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-[#888]">
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
            <div
              key={val}
              className="rounded-xl border border-[#1a1a1a] bg-[#111] p-3"
            >
              <p className="text-sm font-semibold text-[#00E676]">{val}</p>
              <p className="mt-0.5 text-xs text-[#666]">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative text-xs text-[#444]">
        Cloud API oficial da Meta · AES-256-GCM · LGPD-friendly
      </div>
    </aside>
  );
}

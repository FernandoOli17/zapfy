import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  Database,
  Inbox,
  Star,
  Users,
  Workflow,
} from 'lucide-react';

import { MarketingFaq } from '@/components/marketing/faq';
import { ForgeDemo } from '@/components/marketing/forge-demo';
import { UrgencyBanner } from '@/components/marketing/urgency-banner';
import { ComparisonTable } from '@/components/marketing/comparison-table';

export default function HomePage() {
  return (
    <div className="bg-[#0a0a0a] text-white">
      <UrgencyBanner />
      <Hero />
      <LogosStrip />
      <HowItWorks />
      <Features />
      <ForgeDemo />
      <ComparisonTable />
      <Testimonials />
      <MarketingFaq />
      <FinalCta />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HERO — contraste brutal: headline gigante, body discreto, CTA verde
   ───────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-20 text-center">
      <BackgroundDecor />

      <div className="animate-fade-up relative mb-8 inline-flex items-center gap-2 rounded-full border border-[#00E676]/25 bg-[#00E676]/[0.06] px-3 py-1.5 text-xs font-medium text-[#00E676]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00E676] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00E676]" />
        </span>
        Agente IA · WhatsApp Cloud API oficial Meta
      </div>

      <h1 className="animate-fade-up animate-delay-1 relative max-w-4xl text-[clamp(3rem,9vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white">
        Seu WhatsApp,{' '}
        <span className="text-[#00E676]">com inteligência real.</span>
      </h1>

      <p className="animate-fade-up animate-delay-2 relative mt-8 max-w-xl text-lg leading-relaxed text-[#888]">
        Configure conversando com o Forge. Publica em minutos no Cloud API oficial da Meta.
        Atende 24/7, faz handoff pra equipe, nunca fica em risco de ban.
      </p>

      <div className="animate-fade-up animate-delay-3 relative mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="group inline-flex items-center gap-2 rounded-full bg-[#00E676] px-7 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-transform hover:scale-[1.02]"
        >
          Criar meu agente grátis
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="#como-funciona"
          className="inline-flex items-center gap-2 rounded-full border border-[#1a1a1a] bg-[#111] px-7 py-3.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-[#00E676]/30 hover:bg-[#181818] hover:text-white"
        >
          Ver como funciona
        </Link>
      </div>

      <p className="animate-fade-up animate-delay-4 relative mt-5 text-xs text-[#666]">
        7 dias grátis · sem cartão · cancele quando quiser
      </p>
    </section>
  );
}

function BackgroundDecor() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right,rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.025) 1px,transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* glow verde sutil saindo do topo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(0,230,118,0.15),transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 inset-x-0 h-48"
        style={{ background: 'linear-gradient(to top,#0a0a0a,transparent)' }}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LOGOS STRIP — infraestrutura conhecida (texto em wordmark grayscale)
   Sem dependência de assets externos. Tipografia faz o trabalho.
   ───────────────────────────────────────────────────────────────── */

const LOGOS = ['WhatsApp Cloud API', 'Meta', 'Anthropic', 'Stripe', 'Vercel', 'Neon', 'Upstash'];

function LogosStrip() {
  return (
    <section className="border-t border-[#1a1a1a] bg-[#0a0a0a] py-14">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#666]">
          Infraestrutura que você já conhece
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 md:gap-x-14">
          {LOGOS.map((name) => (
            <span
              key={name}
              className="text-base font-semibold tracking-tight text-white/40 transition-colors hover:text-white/80 md:text-lg"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COMO FUNCIONA — 3 steps com número GIGANTE de marca d'água
   ───────────────────────────────────────────────────────────────── */

interface Step {
  n: string;
  title: string;
  body: string;
  icon: typeof Bot;
}

const STEPS: Step[] = [
  {
    n: '01',
    title: 'Conecte seu número',
    body: 'WhatsApp Business + credenciais Meta cifradas no seu workspace. Sem libs não-oficiais.',
    icon: Workflow,
  },
  {
    n: '02',
    title: 'Converse com o Forge',
    body: 'Descreva seu negócio em português. O Forge entrevista, decide tools e monta o agente.',
    icon: Bot,
  },
  {
    n: '03',
    title: 'Publique e atenda 24/7',
    body: 'Agente no ar em minutos. Responde, agenda, transfere pra equipe quando precisa.',
    icon: Inbox,
  },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t border-[#1a1a1a] py-[120px]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
            Como funciona
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Três passos.{' '}
            <span className="font-serif italic font-normal text-[#888]">Nenhum fluxograma.</span>
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <StepCard key={step.n} step={step} delay={i + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, delay }: { step: Step; delay: number }) {
  const Icon = step.icon;
  return (
    <div
      className={`animate-fade-up delay-${delay} group relative overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#111] p-8 transition-colors hover:border-[#00E676]/30`}
    >
      {/* Watermark number gigante */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 -top-6 select-none text-[120px] font-bold leading-none tracking-tighter text-[#00E676]/[0.05] transition-colors group-hover:text-[#00E676]/[0.10]"
      >
        {step.n}
      </span>

      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00E676]/10 ring-1 ring-[#00E676]/20">
          <Icon className="h-6 w-6 text-[#00E676]" strokeWidth={1.75} />
        </div>
        <h3 className="mt-8 text-xl font-semibold tracking-tight text-white">{step.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[#888]">{step.body}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FEATURES — grid 2×3, ícone verde 32px, hover borda verde
   ───────────────────────────────────────────────────────────────── */

interface Feature {
  title: string;
  body: string;
  icon: typeof Bot;
}

const FEATURES: Feature[] = [
  {
    title: 'Agente IA com contexto',
    body: 'Claude Sonnet 4.5 com prompt caching. Responde em <3s, lembra do histórico, não inventa quando não sabe.',
    icon: Brain,
  },
  {
    title: 'Forge Builder',
    body: 'State machine declarativa que entrevista o cliente em 10 fases. Gera system prompt, escolhe tools, publica versão.',
    icon: Workflow,
  },
  {
    title: 'RAG nativo',
    body: 'Base de conhecimento com busca híbrida (semântica via Voyage AI + FTS Postgres). Upload por URL ou arquivo.',
    icon: Database,
  },
  {
    title: 'Inbox humano',
    body: 'Assume conversa numa tecla, devolve pra IA quando quiser. Atalhos J/K/R/A/E. Pusher real-time sub-segundo.',
    icon: Inbox,
  },
  {
    title: 'Analytics tempo real',
    body: 'Tickets resolvidos, % handoff, tempo até primeira resposta, top intents. Sparklines + drill-down por conversa.',
    icon: BarChart3,
  },
  {
    title: 'Multi-tenant nativo',
    body: 'Vários números, vários workspaces, uma plataforma. Cada workspace tem agente, equipe, billing e auditoria isolados.',
    icon: Users,
  },
];

function Features() {
  return (
    <section className="border-t border-[#1a1a1a] py-[120px]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
            O que tem dentro
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Tudo que precisa pra um agente{' '}
            <span className="font-serif italic font-normal text-white/70">
              que realmente atende.
            </span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} delay={(i % 3) + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, delay }: { feature: Feature; delay: number }) {
  const Icon = feature.icon;
  return (
    <div
      className={`animate-fade-up delay-${delay} group rounded-2xl border border-[#1a1a1a] bg-[#111] p-8 transition-colors hover:border-[#00E676]/30`}
    >
      <Icon className="h-8 w-8 text-[#00E676]" strokeWidth={1.75} />
      <h3 className="mt-7 text-xl font-semibold tracking-tight text-white">{feature.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#888]">{feature.body}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TESTIMONIALS — quote Instrument Serif italic, avatar inicial verde
   ───────────────────────────────────────────────────────────────── */

interface Testimonial {
  quote: string;
  name: string;
  vertical: string;
  city: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Antes perdia cliente que mandava no fim de semana. Agora o agente do Zapfy responde tudo, anota o tutor e marca o banho. Acordo segunda com a agenda lotada.',
    name: 'Ana Lima',
    vertical: 'Dona de pet shop',
    city: 'São Paulo',
    initials: 'AL',
  },
  {
    quote:
      'Configurei em uma manhã, conversando com o Forge. Ele entendeu que clínica odontológica precisa filtrar urgência e já montou o handoff direto pra mim em casos sérios.',
    name: 'Dr. Carlos Mendes',
    vertical: 'Dentista',
    city: 'Belo Horizonte',
    initials: 'CM',
  },
  {
    quote:
      'Recebia 200 dúvidas por dia sobre tamanho e prazo. O Zapfy resolve 70% sozinho e quando precisa transferir já chega com contexto, foto e endereço. Equipe agradeceu.',
    name: 'Loja Moda Clara',
    vertical: 'E-commerce de moda',
    city: 'Fortaleza',
    initials: 'MC',
  },
];

function Testimonials() {
  return (
    <section className="border-t border-[#1a1a1a] py-[120px]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
            Beta privado · pessoas reais
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            O que o pessoal do beta tá{' '}
            <span className="font-serif italic font-normal text-[#888]">falando.</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.name} t={t} delay={i + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ t, delay }: { t: Testimonial; delay: number }) {
  return (
    <figure
      className={`animate-fade-up delay-${delay} flex flex-col rounded-2xl border border-[#1a1a1a] bg-[#111] p-8`}
    >
      <div className="flex gap-1 text-[#00E676]">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <blockquote className="mt-5 flex-1">
        <p className="font-serif text-[18px] italic leading-relaxed text-zinc-100">
          &ldquo;{t.quote}&rdquo;
        </p>
      </blockquote>
      <figcaption className="mt-7 flex items-center gap-3 border-t border-[#1a1a1a] pt-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00E676]/15 text-sm font-bold text-[#00E676]">
          {t.initials}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{t.name}</p>
          <p className="text-[13px] text-[#888]">
            {t.vertical} · {t.city}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FINAL CTA — única seção com fundo verde sólido
   ───────────────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="border-t border-[#1a1a1a] bg-[#00E676] py-[120px] text-[#0a0a0a]">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-5xl font-bold leading-[1.05] tracking-[-0.03em] md:text-6xl">
          Pronto para automatizar
          <br />
          <span className="font-serif italic font-normal">seu atendimento?</span>
        </h2>
        <p className="mt-6 text-base text-[#0a0a0a]/80 md:text-lg">
          7 dias grátis. Sem cartão. Cancele quando quiser.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-[#0a0a0a] px-7 py-3.5 text-sm font-semibold text-[#00E676] transition-transform hover:scale-[1.02]"
          >
            Criar meu agente grátis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/precos"
            className="inline-flex items-center gap-2 rounded-full border border-[#0a0a0a]/20 bg-transparent px-7 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a]/10"
          >
            Ver planos
          </Link>
        </div>
      </div>
    </section>
  );
}

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CreditCard,
  Headset,
  Inbox,
  Link2,
  Lock,
  MessageCircle,
  Phone,
  Rocket,
  Shield,
  Sparkles,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@zapai/ui';

import { BlackHole } from '@/components/black-hole';
import { CosmicBackground } from '@/components/cosmic-bg';
import { MarketingFaq } from '@/components/marketing/faq';
import { SectionTransition } from '@/components/marketing/section-transition';

const COSMIC_DARK = 'hsl(225 50% 4%)';
const WHITE = 'hsl(0 0% 100%)';
const ZINC_950 = 'rgb(9 9 11)';

export default function HomePage() {
  return (
    <>
      <Hero />
      {/* Transição 1: Hero (cosmic dark) → TechStackBar (white).
          Glow sutil pra não brigar com o buraco negro. */}
      <SectionTransition fromColor={COSMIC_DARK} toColor={WHITE} glow="subtle" />
      <TechStackBar />
      <HowItWorks />
      <Features />
      {/* Transição 2: Features (white) → SpecialTools (zinc-950) */}
      <SectionTransition fromColor={WHITE} toColor={ZINC_950} />
      <SpecialTools />
      <InboxSection />
      <Integrations />
      <Comparison />
      {/* Transição 3: Comparison (zinc-950) → Pricing (white) */}
      <SectionTransition fromColor={ZINC_950} toColor={WHITE} />
      <Pricing />
      <Principles />
      <MarketingFaq />
      <FinalCta />
      {/* Transição 4: FinalCta (white) → Footer (cosmic dark, vem do layout) */}
      <SectionTransition fromColor={WHITE} toColor={COSMIC_DARK} />
    </>
  );
}

/* ── HERO (dark cosmic + black hole) ──────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <CosmicBackground intensity="muted" />

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-20 md:pb-24">
        <div className="text-center">
          <div
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur-md"
            style={{ animationDelay: '0ms' }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Agente IA · WhatsApp Business · Cloud API oficial Meta
          </div>
        </div>

        <div className="relative mt-10 flex flex-col items-center md:mt-12">
          <div
            className="animate-fade-up pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ animationDelay: '60ms' }}
          >
            <BlackHole size={560} className="opacity-95" />
          </div>

          <div className="relative z-10 flex max-w-3xl flex-col items-center text-center pt-32 md:pt-40">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-3xl"
              style={{
                background:
                  'radial-gradient(ellipse 70% 60% at 50% 50%, hsl(225 50% 4% / 0.88), transparent 75%)',
              }}
            />
            <h1
              className="animate-fade-up text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[1] tracking-[-0.035em] text-foreground"
              style={{
                animationDelay: '120ms',
                textShadow: '0 0 40px hsl(225 50% 4% / 0.9), 0 0 80px hsl(225 50% 4% / 0.7)',
              }}
            >
              O WhatsApp da sua empresa,{' '}
              <span className="font-serif italic font-normal">
                <span className="bg-gradient-to-r from-primary via-sky-300 to-primary bg-clip-text text-transparent">
                  com cérebro próprio.
                </span>
              </span>
            </h1>

            <p
              className="animate-fade-up mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
              style={{
                animationDelay: '240ms',
                textShadow: '0 0 24px hsl(225 50% 4% / 0.9)',
              }}
            >
              Configure conversando, não preenchendo formulário. O Forge entrevista seu negócio
              e monta o agente — system prompt, tools, handoff. Em minutos no Cloud API oficial
              da Meta.
            </p>

            <div
              className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3"
              style={{ animationDelay: '360ms' }}
            >
              <Button
                asChild
                size="lg"
                className="h-12 px-6 text-base shadow-lg shadow-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/50"
              >
                <Link href="/signup">
                  Criar meu agente em 5 min
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 border-white/[0.20] bg-white/[0.06] px-5 text-base text-foreground backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.12] hover:text-foreground"
              >
                <Link href="#recursos">Ver como funciona</Link>
              </Button>
            </div>

            <p
              className="animate-fade-up mt-5 text-xs text-muted-foreground"
              style={{ animationDelay: '480ms', textShadow: '0 0 16px hsl(225 50% 4%)' }}
            >
              7 dias grátis · sem cartão · cancela em um clique
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}

/* ── TECH STACK BAR (light) ──────────────────────────────────── */

const TECH_STACK = [
  'Meta Cloud API',
  'Anthropic Claude',
  'Voyage AI',
  'Postgres + pgvector',
  'Stripe',
  'Better Auth',
  'Resend',
  'Vercel',
];

function TechStackBar() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="text-sm text-zinc-500">
          Construído sobre stack premium — todas oficiais, todas auditáveis
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {TECH_STACK.map((label, i) => (
            <span
              key={label}
              className="group inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-600 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:text-zinc-900 hover:shadow-md hover:shadow-blue-100"
            >
              <span
                className="relative flex h-1.5 w-1.5"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── HOW IT WORKS (light — Mailchimp-style numbered steps) ──── */

const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    icon: Link2,
    title: 'Conecte seu número',
    description:
      'Crie um Meta App gratuitamente, ative o WhatsApp Cloud API e cole as credenciais. Tudo cifrado com AES-256-GCM. Leva menos de 10 minutos.',
  },
  {
    number: '02',
    icon: MessageCircle,
    title: 'Converse com o Forge',
    description:
      'O Forge entrevista seu negócio em português. Detecta vertical, propõe tom de voz, monta o system prompt e configura as tools certas — sem preencher formulário.',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Publique e atenda 24/7',
    description:
      'Em minutos seu agente está no ar respondendo clientes via WhatsApp Business. IA em < 2s, handoff seamless para equipe humana, métricas em tempo real.',
  },
];

function HowItWorks() {
  return (
    <section className="border-y border-zinc-100 bg-white py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header — Mailchimp-style: label pequeno + headline direto */}
        <div className="flex flex-col items-start gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-500">
              Como funciona
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
              Do zero ao agente em três passos
            </h2>
          </div>
          <Link
            href="/signup"
            className="hidden items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 md:inline-flex"
          >
            Começar grátis <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Steps grid */}
        <div className="relative mt-12 grid gap-0 md:grid-cols-3">
          {/* Linha conectora horizontal (desktop) */}
          <div
            aria-hidden
            className="absolute top-8 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] hidden h-px bg-zinc-200 md:block"
          />

          {HOW_IT_WORKS_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative flex flex-col gap-4 p-6 md:p-8">
                {/* Número grande — Mailchimp usa numeração prominente */}
                <div className="flex items-center gap-4">
                  <span
                    className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white text-2xl font-black tracking-tight text-zinc-900"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {step.number}
                  </span>
                  {/* Seta divisória entre steps (mobile apenas) */}
                  {i < HOW_IT_WORKS_STEPS.length - 1 && (
                    <div className="flex items-center md:hidden">
                      <ArrowRight className="h-4 w-4 text-zinc-300" />
                    </div>
                  )}
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-zinc-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="mt-6 md:hidden">
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
          >
            Começar grátis <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── FEATURES (light) ───────────────────────────────────────── */

function Features() {
  return (
    <section id="recursos" className="bg-white py-24 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">
            Tudo o que você precisa pra escalar — sem contratar
          </h2>
          <p className="mt-4 text-lg text-zinc-500">
            Feito pra quem vende, não pra quem programa
          </p>
        </div>

        {/* Feature 1: Configure conversando */}
        <div className="mt-20 grid items-center gap-16 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
              <Sparkles className="h-3 w-3" />
              Forge
            </span>
            <h3 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900">
              Configure conversando, não preenchendo formulário
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-zinc-500">
              O Forge é outro agente IA que entrevista seu negócio. Detecta vertical, monta
              system prompt, configura tools e regras de handoff. Em torno de 5 minutos você
              publica a v1.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-zinc-600">
              {[
                'Sem dashboard com 200 switches',
                'Versionamento automático (rollback em 1 clique)',
                'Playbooks prontos por vertical',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Check className="h-3 w-3 text-blue-600" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <ForgePreview />
        </div>

        {/* Feature 2: Atendimento 24/7 */}
        <div className="mt-24 grid items-center gap-16 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <InboxPreview />
          </div>
          <div className="order-1 md:order-2">
            <div className="rounded-3xl bg-blue-500 p-8 text-white md:p-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">
                <Bot className="h-3 w-3" />
                Agente IA
              </span>
              <h3 className="mt-3 text-3xl font-bold tracking-tight">
                Atendimento 24/7 que entende contexto
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-blue-50">
                Claude Sonnet 4.5 no raciocínio, Haiku 4.5 na triagem rápida. RAG nativo no
                Postgres pgvector com embeddings Voyage AI. Tempo médio de resposta abaixo de
                2 segundos.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-blue-50">
                {[
                  'Tools por vertical (consultar pedido, agendar, etc.)',
                  'Handoff seamless pra equipe humana',
                  'Prompt caching da Anthropic (latência baixa)',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Feature 3: Métricas */}
        <div className="mt-24 grid items-center gap-16 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
              <BarChart3 className="h-3 w-3" />
              Analytics
            </span>
            <h3 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900">
              Métricas em tempo real — não achismo
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-zinc-500">
              Tempo de primeira resposta, taxa de handoff, conversas resolvidas só pela IA,
              gargalos por horário. Veja o que está funcionando e o que precisa atenção.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-zinc-600">
              {[
                'Conversas IA × humano × handoff',
                'Resposta < 2s sustentável em escala',
                'Export pra CSV ou via API pública (Premium)',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Check className="h-3 w-3 text-blue-600" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <MetricsPreview />
        </div>
      </div>
    </section>
  );
}

/* ── SPECIAL TOOLS (dark cosmic) ─────────────────────────────── */

const TOOLS = [
  {
    name: 'Forge',
    description:
      'Builder conversacional. Entrevista seu negócio em pt-BR, detecta vertical, propõe tom e tools. Gera o system prompt versionado. Sem formulário — você fala, ele monta.',
    icon: Sparkles,
  },
  {
    name: 'Agente IA',
    description:
      'Claude Sonnet 4.5 com prompt caching. Loop de tool calls com timeout e max-iter. RAG via Voyage AI + pgvector. Memória curta de conversa + memória longa do contato.',
    icon: Bot,
  },
  {
    name: 'Inbox híbrida',
    description:
      'IA e humano no mesmo canal. Conversas com status sincronizado (IA, humano, fechada). Handoff manual ou automático por palavra-chave, sentimento ou categoria.',
    icon: Inbox,
  },
  {
    name: 'Tools customizadas',
    description:
      'Por workspace, configure tools que chamam seu endpoint HTTP. Schema Zod tipado, retry e timeout cuidados pra você. Inclusos no plano Pro+.',
    icon: Wrench,
  },
];

function SpecialTools() {
  return (
    <section className="bg-zinc-950 py-24 text-white md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
          Impulsione seu trabalho com ferramentas{' '}
          <span className="font-serif italic font-normal text-primary">especiais</span>
        </h2>
        <div className="mt-16 grid items-start gap-12 md:grid-cols-2">
          <div className="space-y-8">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div key={tool.name} className="border-b border-white/[0.06] pb-8 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="text-xl font-semibold text-white">{tool.name}</h3>
                  </div>
                  <p className="mt-3 leading-relaxed text-zinc-400">{tool.description}</p>
                </div>
              );
            })}
          </div>
          <ForgeFullPreview />
        </div>
      </div>
    </section>
  );
}

/* ── INBOX SECTION (dark, replaces Kanban) ───────────────────── */

const INBOX_CARDS = [
  { name: 'Gabriel S.', text: 'Quero agendar exame de glicose pra sexta de manhã.', tag: 'Agendar' },
  { name: 'Pedro A.', text: 'Boleto da mensalidade caiu? Pago amanhã, ok?', tag: 'Cobrança' },
  { name: 'Lucas O.', text: 'Tem o tênis Air Max 90 tamanho 42 azul em estoque?', tag: 'Estoque' },
  { name: 'Ana S.', text: 'Quero remarcar pra próxima quarta, mesmo horário.', tag: 'Agendar' },
  { name: 'Thiago R.', text: 'Vocês entregam em Curitiba? Tem frete pra hoje?', tag: 'Logística' },
];

const INBOX_FEATURES = [
  {
    title: 'Mantenha tudo organizado',
    description: 'IA, humano, fechada. Filtros por status, tag e atendente.',
    icon: Inbox,
  },
  {
    title: 'Colabore com a equipe',
    description: 'Notas internas, atribuição de conversa e histórico completo de quem atendeu.',
    icon: Headset,
  },
  {
    title: 'Acompanhe o progresso',
    description: 'Veja o que está em IA, o que aguarda humano e o que já foi resolvido.',
    icon: BarChart3,
  },
  {
    title: 'Automatize o caminho',
    description: 'Triggers automáticos: tag por intent, handoff por palavra-chave, broadcast.',
    icon: Zap,
  },
];

function InboxSection() {
  return (
    <section className="bg-zinc-950 py-24 text-white md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-lg text-zinc-400">Apresentando…</p>
          <h2 className="mt-2 text-5xl font-bold tracking-tight">
            Inbox <span className="text-primary">unificada</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Conversas em tempo real, com IA e humano no mesmo canal. Sem WhatsApp pessoal, sem
            grupo no Telegram, sem planilha pra controlar quem atendeu.
          </p>
        </div>

        {/* Cards de conversa preview */}
        <div className="mt-16 grid max-h-80 grid-cols-2 gap-4 overflow-hidden md:grid-cols-3">
          {INBOX_CARDS.map((card) => (
            <div
              key={card.name}
              className="group cursor-default rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {card.name[0]}
                </div>
                <span className="text-sm font-semibold text-white">{card.name}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{card.text}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {card.tag}
                </span>
                <span className="text-[10px] text-zinc-600">há 2 min</span>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {INBOX_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="mt-4 font-semibold text-white">{f.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Button
            asChild
            size="lg"
            className="h-12 px-6 text-base shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5"
          >
            <Link href="/signup">
              Começar agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ── INTEGRATIONS (dark) ─────────────────────────────────────── */

const INTEGRATION_CATEGORIES = [
  {
    title: 'Inteligência Artificial',
    description: 'Raciocínio, embeddings e geração — providers oficiais, sem proxy intermediário.',
    items: ['Claude Sonnet 4.5', 'Claude Haiku 4.5', 'Voyage AI (1024 dims)', 'Prompt caching'],
    accent: 'text-sky-400',
  },
  {
    title: 'WhatsApp & Comunicação',
    description: 'Cloud API oficial da Meta. Nada de scraping, nada de lib não-oficial.',
    items: ['Meta Cloud API v21+', 'Templates HSM', 'Webhook signature SHA-256', 'Janela 24h respeitada'],
    accent: 'text-emerald-400',
  },
  {
    title: 'Pagamentos & Faturamento',
    description: 'Stripe Subscriptions com checkout hospedado e portal de billing nativo.',
    items: ['Stripe Subscriptions', 'Portal de billing', 'PIX e cartão (via Stripe BR)', 'Trial 7 dias sem cartão'],
    accent: 'text-amber-400',
  },
  {
    title: 'Backend & Segurança',
    description: 'Stack auditável, criptografia padrão de indústria, LGPD-friendly por design.',
    items: ['Postgres 16 + pgvector', 'BullMQ + Redis', 'Better Auth (multi-tenant)', 'AES-256-GCM em segredos'],
    accent: 'text-violet-400',
  },
];

function Integrations() {
  return (
    <section className="bg-zinc-950 py-24 text-white md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-5xl font-bold tracking-tight">
            <span className="font-serif italic font-normal text-primary">Stack</span> sem mistério
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Tudo oficial, tudo auditável. Sem caixa-preta, sem dependência exótica, sem lib que
            o Meta vai banir mês que vem.
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {INTEGRATION_CATEGORIES.map((cat) => (
            <div
              key={cat.title}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all hover:-translate-y-1 hover:border-primary/25 hover:bg-white/[0.04] hover:shadow-xl hover:shadow-primary/10"
            >
              <h3 className={`text-xl font-bold ${cat.accent}`}>{cat.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{cat.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {cat.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── COMPARISON (dark) ───────────────────────────────────────── */

const WITHOUT_ITEMS = [
  'WhatsApp pessoal misturado com trabalho',
  'Bot burro com menu de 1, 2, 3',
  'n8n caro pra automação simples',
  'Sem handoff entre IA e humano',
  'Sem RAG — IA não conhece seu produto',
  'Métricas no olhômetro',
];

const WITH_ITEMS = [
  'Cloud API oficial Meta, número de empresa separado',
  'Agente Claude Sonnet 4.5 que entende contexto',
  'Builder em conversa, sem dashboard caro',
  'Handoff seamless com contexto completo',
  'RAG nativo com seus documentos',
  'Métricas em tempo real, export pra CSV',
];

function Comparison() {
  return (
    <section className="bg-zinc-950 py-24 text-white md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            A diferença é prática, não cosmética
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Qualifique, atenda e venda todos os dias — de forma inteligente e auditável
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          <div className="p-8">
            <h3 className="text-xl font-bold text-zinc-500">Sem Orbe</h3>
            <ul className="mt-8 space-y-4">
              {WITHOUT_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
                    <X className="h-3 w-3 text-zinc-600" />
                  </span>
                  <span className="text-zinc-500">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-white/[0.02] p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-xs font-bold">O</span>
              </span>
              <h3 className="text-xl font-bold text-white">Com Orbe</h3>
            </div>
            <ul className="mt-8 space-y-4">
              {WITH_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </span>
                  <span className="text-zinc-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── PRICING (light) ─────────────────────────────────────────── */

type PricingTier = {
  name: string;
  price: number;
  blurb: string;
  highlight?: boolean;
  features: string[];
  sectionTitle?: string;
  cta: string;
};

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    price: 97,
    blurb: 'Pra começar a atender com IA sem dor.',
    cta: 'Começar com Starter',
    features: [
      '1 número WhatsApp Business',
      '1 usuário (você)',
      '1.000 conversas IA por mês',
      '10 documentos no RAG',
      'Forge ilimitado',
      'Templates HSM',
      'Handoff humano',
      'Suporte por e-mail',
    ],
  },
  {
    name: 'Pro',
    price: 297,
    blurb: 'Pra time pequeno escalando atendimento.',
    cta: 'Começar com Pro',
    highlight: true,
    features: [
      '3 números WhatsApp Business',
      '5 usuários no time',
      '10.000 conversas IA por mês',
      '100 documentos no RAG',
      'Tools customizadas por workspace',
      'Webhooks de saída',
      'Broadcasts e campanhas',
      'Integração Google Calendar',
      'Suporte prioritário',
    ],
  },
];

function Pricing() {
  return (
    <section id="precos" className="bg-white py-24 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">
            Planos & Preços
          </h2>
          <p className="mt-4 text-lg text-zinc-500">
            Sem taxa escondida. Sem letra miúda. Cancela em um clique.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.name} tier={tier} />
          ))}
        </div>

        {/* Premium teaser */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 md:flex md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">
              Premium · R$697/mês — operação séria
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Números, usuários e conversas IA ilimitados. API pública (REST + webhooks). SLA
              de uptime, onboarding assistido e Slack com o time.
            </p>
          </div>
          <Link
            href="/precos"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 md:mt-0"
          >
            Ver detalhes do Premium <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Guarantee banner */}
        <div className="mt-10 flex flex-col items-center gap-6 rounded-2xl bg-blue-500 p-8 text-white md:flex-row md:p-10">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
              Garantia sem riscos
            </span>
            <h3 className="mt-2 text-2xl font-bold">Experimente por 7 dias — sem cartão</h3>
            <p className="mt-2 text-sm leading-relaxed text-blue-50">
              Se não bater, peça reembolso total em até 7 dias no plano mensal ou 30 dias no
              anual. Sem ligação pra atendente, sem retenção forçada.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingCard({ tier }: { tier: PricingTier }) {
  const isHighlight = tier.highlight;
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-8 transition-all ${
        isHighlight
          ? 'border-blue-500 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10 hover:-translate-y-1 hover:shadow-blue-500/40'
          : 'border-zinc-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg'
      }`}
    >
      {isHighlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-blue-500 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            Recomendado
          </span>
        </div>
      )}
      <div>
        <h3 className="text-2xl font-bold text-zinc-900">{tier.name}</h3>
        <p className="mt-1 text-sm text-zinc-500">{tier.blurb}</p>
      </div>
      <div className="mt-6">
        <div className="flex items-end gap-1">
          <span className="text-lg text-zinc-400">R$</span>
          <span className="text-5xl font-bold text-zinc-900">{tier.price}</span>
          <span className="mb-2 text-sm text-zinc-400">/mês</span>
        </div>
        <p className="mt-1 text-xs text-zinc-400">7 dias grátis, sem cartão</p>
      </div>
      <ul className="mt-8 flex-1 space-y-3">
        {tier.features.map((feat) => (
          <li key={feat} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                isHighlight ? 'bg-blue-500' : 'bg-zinc-100'
              }`}
            >
              <Check className={`h-3 w-3 ${isHighlight ? 'text-white' : 'text-zinc-500'}`} />
            </span>
            <span className="text-sm text-zinc-600">{feat}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-10 block rounded-full px-8 py-3.5 text-center text-xs font-bold uppercase tracking-widest transition-colors ${
          isHighlight
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 hover:bg-blue-600'
            : 'border border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white'
        }`}
      >
        {tier.cta}
      </Link>
    </div>
  );
}

/* ── PRINCIPLES (light, substitui Testimonials) ──────────────── */

const PRINCIPLES = [
  {
    icon: Shield,
    title: 'Cloud API oficial Meta',
    description:
      'Nada de whatsapp-web.js, nada de scraping. Só Cloud API v21+. Seu número não fica em risco de banimento por uso de lib não-oficial.',
  },
  {
    icon: Lock,
    title: 'Cripto e LGPD por design',
    description:
      'Segredos cifrados AES-256-GCM com IV único. Telefones hasheados (SHA-256) em log. Endpoints de export, delete e opt-out por contato.',
  },
  {
    icon: Zap,
    title: 'Resposta abaixo de 2 segundos',
    description:
      'Claude Haiku 4.5 classifica em < 500ms, Sonnet 4.5 raciocina com prompt caching. Worker BullMQ separado pra não travar webhook (Meta exige 200 em < 1s).',
  },
  {
    icon: CreditCard,
    title: '7 dias grátis, sem cartão',
    description:
      'Trial sem fricção. Trocou de ideia? Cancela em um clique no portal Stripe. Sem ligação pra atendente, sem retenção forçada.',
  },
];

function Principles() {
  return (
    <section className="bg-gradient-to-b from-blue-50/40 via-white to-white py-24 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">
            Por que confiar no Orbe
          </h2>
          <p className="mt-4 text-lg text-zinc-500">
            Honestos sobre o que somos. Em beta privado — sem testimonials forjados.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 font-semibold text-zinc-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{p.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── FINAL CTA (light) ───────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 px-8 py-16 text-center shadow-xl shadow-blue-200/40 ring-1 ring-blue-200/60 md:px-16">
          {/* Cosmic radial accent — sutil glow azul no centro */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 80% at 50% 50%, hsl(213 100% 60% / 0.12), transparent 70%)',
            }}
          />
          {/* Faint cosmic stars */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(1px 1px at 15% 30%, hsl(213 100% 60%) 50%, transparent), radial-gradient(1px 1px at 85% 70%, hsl(213 100% 60%) 50%, transparent), radial-gradient(1px 1px at 40% 80%, hsl(213 100% 60%) 50%, transparent), radial-gradient(1px 1px at 70% 20%, hsl(213 100% 60%) 50%, transparent)',
            }}
          />
          {/* Decorative left/right icons */}
          <div className="absolute left-8 top-1/2 hidden -translate-y-1/2 md:block">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-white shadow-md">
                Z
              </span>
            </div>
          </div>
          <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 md:block">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md">
              <Phone className="h-7 w-7 text-emerald-500" />
            </div>
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">
              Transforme conversas em
              <br />
              vendas{' '}
              <span className="font-serif italic font-normal text-blue-500">ainda hoje</span>
            </h2>
            <p className="mt-4 text-lg text-zinc-500">
              Responda instantaneamente, qualifique e converta mais clientes — a partir de
              agora
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-blue-500 px-12 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-xl"
            >
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-xs text-zinc-400">
              7 dias grátis · sem cartão · cancela em um clique
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── PREVIEW COMPONENTS (mockups inline) ──────────────────────── */

function ForgePreview() {
  const messages = [
    { role: 'forge', text: 'Beleza! Você vende online ou tem loja física?' },
    { role: 'user', text: 'Só online, pela Shopify.' },
    { role: 'forge', text: 'Top. Qual é o ticket médio? E o produto principal?' },
    { role: 'user', text: 'Ticket ~R$280, tênis esportivos.' },
    { role: 'forge', text: 'Detectei: e-commerce de moda esportiva. Sugiro tools de consulta de estoque, rastreio de pedido e cupom. OK?' },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-lg">
      <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-400 text-xs font-bold text-white">
          F
        </span>
        <div>
          <p className="text-xs font-semibold text-zinc-900">Forge</p>
          <p className="text-[10px] text-zinc-500">entrevistando seu negócio…</p>
        </div>
      </div>
      <div className="space-y-2 px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${
                m.role === 'user'
                  ? 'rounded-br-md bg-blue-500 text-white'
                  : 'rounded-bl-md bg-white text-zinc-700 ring-1 ring-zinc-200'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InboxPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
      <div className="grid grid-cols-[140px_1fr]">
        {/* Lista */}
        <div className="border-r border-zinc-200 bg-zinc-50 p-2">
          {['Gabriel', 'Pedro', 'Ana', 'Lucas'].map((name, i) => (
            <div
              key={name}
              className={`mb-1 rounded-md px-2 py-1.5 text-[11px] ${
                i === 0 ? 'bg-blue-100 text-blue-900' : 'text-zinc-600'
              }`}
            >
              <p className="font-semibold">{name}</p>
              <p className="truncate text-[10px] text-zinc-400">há 2 min</p>
            </div>
          ))}
        </div>
        {/* Conversa */}
        <div className="p-3">
          <div className="space-y-2">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-zinc-100 px-3 py-1.5 text-[11px] text-zinc-700">
              Quero agendar exame de glicose
            </div>
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-blue-500 px-3 py-1.5 text-[11px] text-white">
              Posso agendar pra sexta 9h ou 14h. Qual prefere?
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-zinc-100 px-3 py-1.5 text-[11px] text-zinc-700">
              14h tá ótimo
            </div>
            <div className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-600">
              <Bot className="h-2.5 w-2.5" />
              IA agendou
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricsPreview() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-900">Últimas 24h</p>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
          +18%
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Conversas', value: '342' },
          { label: 'Resolvidas IA', value: '278' },
          { label: 'Handoff', value: '64' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-2xl font-bold tracking-tight text-zinc-900">{s.value}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Fake chart bars */}
      <div className="mt-4 flex h-20 items-end gap-1.5">
        {[40, 65, 50, 72, 58, 80, 92, 68, 75, 88, 95, 82].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-blue-400"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-zinc-400">
        <span>00h</span>
        <span>12h</span>
        <span>agora</span>
      </div>
    </div>
  );
}

function ForgeFullPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-2xl">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-xs font-bold text-primary-foreground">
          F
        </span>
        <div>
          <p className="text-xs font-semibold text-white">Forge — sessão #14</p>
          <p className="text-[10px] text-zinc-500">DISCOVERY → VERTICAL_DETECTION</p>
        </div>
        <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          ● ao vivo
        </span>
      </div>
      <div className="space-y-3 px-4 py-5">
        <ChatBubble role="forge">
          Beleza, vamos descobrir o que seu agente precisa fazer. Você vende online, físico ou os dois?
        </ChatBubble>
        <ChatBubble role="user">Só online, pela Shopify. Tênis esportivos.</ChatBubble>
        <ChatBubble role="forge">
          Detectei: <span className="font-semibold text-primary">e-commerce de moda esportiva</span>. Vou
          configurar tools de consulta de estoque, rastreio de pedido e cupom. Tom amigável-jovem,
          handoff por palavra-chave "atendente". OK?
        </ChatBubble>
        <ChatBubble role="user">Perfeito.</ChatBubble>
        <ChatBubble role="forge">
          Publicando v1 do agente… ✓ system prompt gerado · ✓ 3 tools configuradas · ✓ regras de
          handoff ativas. Pronto, sua IA já tá no ar.
        </ChatBubble>
      </div>
    </div>
  );
}

function ChatBubble({ role, children }: { role: 'forge' | 'user'; children: React.ReactNode }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
          isUser
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md bg-white/[0.04] text-zinc-200 ring-1 ring-white/[0.06]'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

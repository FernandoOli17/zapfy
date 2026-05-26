import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CreditCard,
  Inbox,
  Link2,
  Lock,
  MessageCircle,
  Rocket,
  Shield,
  Sparkles,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { MarketingFaq } from '@/components/marketing/faq';

/* ─────────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="bg-zinc-950 text-zinc-100">
      <Hero />
      <TechStrip />
      <Features />
      <FeatureBento />
      <HowItWorks />
      <Comparison />
      <Pricing />
      <Principles />
      <MarketingFaq />
      <FinalCta />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HERO — Stripe/Linear style
   Grid sutil, glow violet no topo, headline enorme, mockup do produto
   ───────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16 text-center">
      {/* Grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right,rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.03) 1px,transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* Violet glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(124,58,237,0.18),transparent 70%)',
        }}
      />
      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 inset-x-0 h-48"
        style={{
          background: 'linear-gradient(to top,rgb(9,9,11),transparent)',
        }}
      />

      {/* Badge */}
      <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
        </span>
        Agente IA · WhatsApp Business · Cloud API oficial Meta
      </div>

      {/* Headline */}
      <h1 className="relative max-w-4xl text-[clamp(2.8rem,8vw,6rem)] font-bold leading-[1] tracking-[-0.04em] text-white">
        Seu WhatsApp,{' '}
        <span
          style={{
            backgroundImage: 'linear-gradient(135deg,#a78bfa 0%,#818cf8 50%,#67e8f9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          com inteligência real.
        </span>
      </h1>

      {/* Subtext */}
      <p className="relative mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
        Configure conversando com o Forge. Publica em minutos no Cloud API oficial da Meta.
        Atende 24/7, faz handoff pra equipe, nunca fica em risco de ban.
      </p>

      {/* CTAs */}
      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:bg-violet-500 hover:-translate-y-0.5"
        >
          Criar meu agente grátis
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="#como-funciona"
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-sm font-semibold text-zinc-300 transition-all hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white"
        >
          Ver como funciona
        </Link>
      </div>
      <p className="relative mt-4 text-xs text-zinc-600">7 dias grátis · sem cartão · cancela quando quiser</p>

      {/* Product mockup */}
      <div className="relative mt-16 w-full max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-900 shadow-2xl shadow-black/60">
          {/* Window chrome */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-zinc-900/80 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-zinc-700" />
            <span className="h-3 w-3 rounded-full bg-zinc-700" />
            <span className="h-3 w-3 rounded-full bg-zinc-700" />
            <div className="mx-auto flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-zinc-800 px-3 py-1 text-[11px] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              orbe.dev/forge
            </div>
          </div>
          {/* Chat content */}
          <div className="grid md:grid-cols-[220px_1fr]">
            {/* Sidebar */}
            <div className="hidden border-r border-white/[0.06] bg-zinc-950/40 p-4 md:block">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Sessões</p>
              {['Loja de tênis', 'Clínica Dr. Ana', 'Pet Shop'].map((label, i) => (
                <div
                  key={label}
                  className={`mb-1 rounded-lg px-3 py-2 text-xs ${i === 0 ? 'bg-violet-600/15 text-violet-300' : 'text-zinc-500 hover:bg-white/[0.04]'}`}
                >
                  {label}
                </div>
              ))}
            </div>
            {/* Forge chat */}
            <div className="p-5">
              <div className="space-y-3">
                {[
                  { role: 'forge', text: 'Beleza! Você vende online ou tem loja física?' },
                  { role: 'user', text: 'Só online, pela Shopify. Tênis esportivos.' },
                  { role: 'forge', text: 'Detectei: e-commerce de moda esportiva. Vou configurar tools de estoque, rastreio e cupom. Tom amigável-jovem, handoff por "atendente". OK?' },
                  { role: 'user', text: 'Perfeito.' },
                  { role: 'forge', text: '✓ system prompt gerado · ✓ 3 tools ativas · ✓ handoff configurado\nSeu agente já está no ar.' },
                ].map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'forge' && (
                      <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-[10px] font-bold text-violet-400">F</div>
                    )}
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                        m.role === 'user'
                          ? 'rounded-br-sm bg-violet-600 text-white'
                          : 'rounded-bl-sm bg-zinc-800 text-zinc-200'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Glow sob o mockup */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-6 inset-x-0 h-24 blur-2xl opacity-20"
          style={{ background: 'radial-gradient(ellipse 60% 100% at 50% 100%,#7c3aed,transparent)' }}
        />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TECH STRIP
   ───────────────────────────────────────────────────────────────── */

const TECH = [
  'Meta Cloud API v21+',
  'Claude Sonnet 4.5',
  'Voyage AI · pgvector',
  'Stripe Subscriptions',
  'Better Auth',
  'BullMQ + Redis',
  'Vercel + Railway',
];

function TechStrip() {
  return (
    <div className="border-y border-white/[0.06] py-5">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-600 shrink-0">Stack oficial</span>
          {TECH.map((t) => (
            <span key={t} className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FEATURES — alternando esquerda/direita
   ───────────────────────────────────────────────────────────────── */

function Features() {
  return (
    <section id="recursos" className="py-28">
      <div className="mx-auto max-w-6xl space-y-28 px-6">

        {/* Feature 1: Forge */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-400">
              <Sparkles className="h-3 w-3" />
              Forge
            </span>
            <h2 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-white">
              Configure conversando,<br />não preenchendo formulário.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-400">
              O Forge é outro agente IA que entrevista seu negócio em português. Detecta vertical,
              propõe tom, monta o system prompt e configura as tools — tudo em conversa.
              A v1 do seu agente fica pronta em minutos.
            </p>
            <ul className="mt-6 space-y-3">
              {['Sem dashboard com 200 switches', 'Versionamento automático', 'Playbooks prontos por vertical'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                  <Check className="h-4 w-4 shrink-0 text-violet-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-900">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600/20 text-[10px] font-bold text-violet-400">F</div>
              <span className="text-xs font-medium text-zinc-400">Forge · descoberta</span>
              <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">● ao vivo</span>
            </div>
            <div className="space-y-3 p-5">
              {[
                { r: 'forge', t: 'Você vende online ou tem loja física?' },
                { r: 'user', t: 'Só online, pela Shopify.' },
                { r: 'forge', t: 'Detectei: e-commerce. Vou configurar tools de estoque, rastreio e cupom. OK?' },
                { r: 'user', t: 'Perfeito.' },
                { r: 'forge', t: '✓ Agente publicado — respondendo clientes agora.' },
              ].map((m, i) => (
                <div key={i} className={`flex ${m.r === 'user' ? 'justify-end' : ''}`}>
                  <div className={`max-w-[80%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${m.r === 'user' ? 'rounded-br-sm bg-violet-600 text-white' : 'rounded-bl-sm bg-zinc-800 text-zinc-200'}`}>{m.t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature 2: Inbox */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-900 lg:order-first">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <span className="text-xs font-medium text-zinc-400">Inbox unificada · 5 conversas ativas</span>
            </div>
            <div className="grid grid-cols-[150px_1fr]">
              <div className="border-r border-white/[0.06] p-3 space-y-1">
                {[
                  { name: 'Gabriel S.', tag: 'IA', status: 'text-violet-400' },
                  { name: 'Pedro A.', tag: 'Humano', status: 'text-amber-400' },
                  { name: 'Ana S.', tag: 'IA', status: 'text-violet-400' },
                  { name: 'Lucas O.', tag: 'Fechada', status: 'text-zinc-600' },
                ].map((c, i) => (
                  <div key={c.name} className={`rounded-lg px-2.5 py-2 ${i === 0 ? 'bg-violet-600/15' : ''}`}>
                    <p className="text-[11px] font-semibold text-zinc-200">{c.name}</p>
                    <p className={`text-[10px] ${c.status}`}>{c.tag}</p>
                  </div>
                ))}
              </div>
              <div className="p-4">
                <div className="space-y-2.5">
                  <div className="max-w-[80%] rounded-xl rounded-bl-sm bg-zinc-800 px-3 py-2 text-[11px] text-zinc-300">Quero agendar exame pra sexta</div>
                  <div className="ml-auto max-w-[80%] rounded-xl rounded-br-sm bg-violet-600 px-3 py-2 text-[11px] text-white">Posso agendar sexta às 9h ou 14h. Qual prefere?</div>
                  <div className="max-w-[80%] rounded-xl rounded-bl-sm bg-zinc-800 px-3 py-2 text-[11px] text-zinc-300">14h tá ótimo</div>
                  <div className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                    <Bot className="h-3 w-3" />
                    IA agendou ✓
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
              <Inbox className="h-3 w-3" />
              Inbox híbrida
            </span>
            <h2 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-white">
              IA e humano<br />no mesmo canal.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-400">
              Sem WhatsApp pessoal misturado com trabalho. Sem grupo no Telegram.
              Inbox unificada com status sincronizado, atribuição de atendente e
              histórico completo de quem atendeu o quê.
            </p>
            <ul className="mt-6 space-y-3">
              {['Handoff automático por sentimento ou palavra-chave', 'Notas internas invisíveis ao cliente', 'Filtros por status, tag e atendente'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                  <Check className="h-4 w-4 shrink-0 text-cyan-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FEATURE BENTO — cards em grid
   ───────────────────────────────────────────────────────────────── */

const BENTO = [
  {
    icon: Bot,
    label: 'Agente IA',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    description: 'Claude Sonnet 4.5 com prompt caching. Loop de tool calls com timeout e max-iter. RAG via Voyage AI + pgvector. Memória de conversa e do contato.',
  },
  {
    icon: Zap,
    label: 'Resposta < 2s',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    description: 'Claude Haiku classifica em < 500ms. Webhook retorna 200 em < 1s pra Meta não pausar. Worker BullMQ separado do servidor web.',
  },
  {
    icon: Wrench,
    label: 'Tools customizadas',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    description: 'Configure endpoints HTTP por workspace. Schema Zod tipado, retry e timeout cuidados. Perfeito pra consultar estoque, criar pedido, agendar consulta.',
  },
  {
    icon: BarChart3,
    label: 'Analytics real-time',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    description: 'Tempo de primeira resposta, taxa de handoff, conversas resolvidas pela IA, gargalos por horário. Export CSV ou API pública no Premium.',
  },
];

function FeatureBento() {
  return (
    <section className="border-t border-white/[0.06] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Ferramentas</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Tudo que você precisa.<br />
            <span className="text-zinc-500">Nada que você não precisa.</span>
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {BENTO.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.label} className={`rounded-2xl border ${b.border} bg-zinc-900 p-6 transition-all hover:-translate-y-0.5 hover:bg-zinc-800/80`}>
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${b.bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${b.color}`} />
                </div>
                <h3 className="mt-4 font-semibold text-white">{b.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{b.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HOW IT WORKS — 3 steps numerados
   ───────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: '01',
    icon: Link2,
    title: 'Conecte seu número',
    description: 'Crie um Meta App, ative o WhatsApp Cloud API e cole as credenciais. Tudo cifrado AES-256-GCM. Menos de 10 minutos.',
  },
  {
    n: '02',
    icon: MessageCircle,
    title: 'Converse com o Forge',
    description: 'O Forge entrevista seu negócio em português. Detecta vertical, monta system prompt e configura tools — sem formulário.',
  },
  {
    n: '03',
    icon: Rocket,
    title: 'Publique e atenda 24/7',
    description: 'Agente no ar em minutos. Responde clientes no WhatsApp Business em < 2s. Handoff para equipe quando necessário.',
  },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t border-white/[0.06] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Como funciona</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Do zero ao agente em 3 passos.
            </h2>
          </div>
          <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
            Começar agora <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.n} className="group rounded-2xl border border-white/[0.07] bg-zinc-900 p-8 transition-all hover:border-violet-500/30 hover:bg-zinc-900/80">
                <div className="flex items-center justify-between">
                  <span className="text-5xl font-black text-white/10 tabular-nums group-hover:text-violet-500/20 transition-colors">{step.n}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                    <Icon className="h-4.5 w-4.5 text-violet-400" />
                  </div>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COMPARISON
   ───────────────────────────────────────────────────────────────── */

const WITHOUT_ITEMS = [
  'WhatsApp pessoal misturado com trabalho',
  'Bot com menu de 1, 2, 3 que ninguém usa',
  'n8n caro pra automação simples',
  'Sem handoff real entre IA e humano',
  'IA que não conhece seu produto',
  'Métricas no olhômetro',
];

const WITH_ITEMS = [
  'Cloud API oficial Meta — número de empresa separado',
  'Agente Claude que entende contexto e intenção',
  'Builder em conversa, sem assinatura de R$1.000+',
  'Handoff seamless com contexto completo',
  'RAG nativo com seus documentos e catálogo',
  'Métricas em tempo real, export CSV ou API',
];

function Comparison() {
  return (
    <section className="border-t border-white/[0.06] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Comparação</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
            A diferença é prática, não cosmética.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Sem Orbe */}
          <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-8">
            <h3 className="mb-6 text-lg font-semibold text-zinc-500">Sem Orbe</h3>
            <ul className="space-y-4">
              {WITHOUT_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                    <X className="h-3 w-3 text-zinc-600" />
                  </span>
                  <span className="text-sm text-zinc-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Com Orbe */}
          <div className="rounded-2xl border border-violet-500/25 bg-violet-950/20 p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600">
                <span className="text-xs font-bold text-white">O</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Com Orbe</h3>
            </div>
            <ul className="space-y-4">
              {WITH_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                  <span className="text-sm text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PRICING
   ───────────────────────────────────────────────────────────────── */

type PricingTier = {
  name: string;
  price: number;
  blurb: string;
  highlight?: boolean;
  features: string[];
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
      '1 usuário',
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
    <section id="precos" className="border-t border-white/[0.06] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Preços</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Simples. Sem taxa escondida.
          </h2>
          <p className="mt-3 text-zinc-500">7 dias grátis em qualquer plano. Cancela quando quiser.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                tier.highlight
                  ? 'border-violet-500/40 bg-violet-950/25 shadow-xl shadow-violet-900/20'
                  : 'border-white/[0.07] bg-zinc-900'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-violet-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Recomendado
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">{tier.blurb}</p>
              </div>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-sm text-zinc-500">R$</span>
                <span className="text-5xl font-bold text-white tabular-nums">{tier.price}</span>
                <span className="mb-1.5 text-sm text-zinc-500">/mês</span>
              </div>
              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-sm text-zinc-400">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${tier.highlight ? 'text-violet-400' : 'text-zinc-600'}`} />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                  tier.highlight
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500'
                    : 'border border-white/[0.1] text-zinc-300 hover:border-white/[0.2] hover:text-white'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
        {/* Premium teaser */}
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-white">Premium · R$697/mês</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Números, usuários e conversas ilimitados. API pública REST + webhooks. SLA + Slack com o time.
            </p>
          </div>
          <Link href="/precos" className="shrink-0 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
            Ver detalhes →
          </Link>
        </div>
        {/* Guarantee */}
        <div className="mt-6 flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-zinc-900 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
            <Lock className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="font-medium text-white">Garantia sem risco</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              Reembolso total em até 7 dias no mensal ou 30 dias no anual. Sem ligação, sem retenção.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PRINCIPLES — 4 pilares
   ───────────────────────────────────────────────────────────────── */

const PRINCIPLES = [
  {
    icon: Shield,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    title: 'Cloud API oficial Meta',
    description: 'Nada de whatsapp-web.js, nada de scraping. Cloud API v21+ — seu número nunca fica em risco de banimento.',
  },
  {
    icon: Lock,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    title: 'Cripto e LGPD por design',
    description: 'Segredos cifrados AES-256-GCM com IV único. Telefones hasheados em log. Endpoints de export, delete e opt-out.',
  },
  {
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    title: 'Resposta abaixo de 2s',
    description: 'Claude Haiku classifica em < 500ms. Sonnet raciocina com prompt caching. Worker BullMQ separado pra não travar o webhook.',
  },
  {
    icon: CreditCard,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    title: '7 dias grátis, sem cartão',
    description: 'Trial sem fricção. Cancela em um clique no portal Stripe. Sem ligação pra atendente, sem retenção forçada.',
  },
];

function Principles() {
  return (
    <section className="border-t border-white/[0.06] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Por que confiar</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Honestos sobre o que somos.
          </h2>
          <p className="mt-3 text-zinc-500">Em beta privado — sem testimonials forjados.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="rounded-2xl border border-white/[0.07] bg-zinc-900 p-6">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${p.bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${p.color}`} />
                </div>
                <h3 className="mt-4 font-semibold text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{p.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FINAL CTA
   ───────────────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="border-t border-white/[0.06] py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-violet-950/20 px-8 py-16 md:px-16">
          {/* Glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 50%,rgba(124,58,237,0.12),transparent 70%)' }}
          />
          <div className="relative">
            <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              Transforme conversas em vendas{' '}
              <span
                style={{
                  backgroundImage: 'linear-gradient(135deg,#a78bfa,#67e8f9)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                ainda hoje.
              </span>
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Responda instantaneamente, qualifique e converta mais clientes.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-900/50 transition-all hover:bg-violet-500 hover:-translate-y-0.5"
            >
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-xs text-zinc-600">7 dias grátis · sem cartão · cancela em um clique</p>
          </div>
        </div>
      </div>
    </section>
  );
}

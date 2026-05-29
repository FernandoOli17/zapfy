import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  Brain,
  CalendarClock,
  Clock,
  Eye,
  FileText,
  Headset,
  Inbox,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Store,
  Stethoscope,
  Tag,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';

import { MarketingFaq } from '@/components/marketing/faq';
import { ForgeDemo } from '@/components/marketing/forge-demo';
import { BrandFilmSection } from '@/components/marketing/brand-film';

export default function HomePage() {
  return (
    <div className="bg-[#0a0a0a] text-white">
      <Hero />
      <ProofStrip />
      <Problem />
      <HowItWorks />
      <Features />
      <ForgeDemo />
      <Segments />
      <Testimonials />
      <BrandFilmSection />
      <MarketingFaq />
      <FinalCta />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HERO
   ───────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-24 text-center">
      <BackgroundDecor />

      <div className="animate-fade-up delay-1 relative mb-8 inline-flex items-center gap-2 rounded-full border border-[#00E676]/25 bg-[#00E676]/[0.06] px-3 py-1.5 text-xs font-medium text-[#00E676]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00E676] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00E676]" />
        </span>
        Veja seu agente pronto antes de pagar 🔥
      </div>

      <h1 className="animate-fade-up delay-2 relative max-w-4xl text-[clamp(3rem,9vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white">
        O WhatsApp da sua empresa,{' '}
        <span className="text-[#00E676]">com cérebro próprio.</span>
      </h1>

      <p className="animate-fade-up delay-3 relative mt-8 max-w-xl text-lg leading-relaxed text-[#888]">
        O Forge entrevista o seu negócio e monta um agente de IA na hora — você vê ele
        funcionando antes de decidir. Quando quiser, é só ligar e ele começa a atender,
        qualificar e vender 24 horas por dia.
      </p>

      <div className="animate-fade-up delay-4 relative mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="group inline-flex items-center gap-2 rounded-full bg-[#00E676] px-7 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-transform hover:scale-[1.02]"
        >
          Montar meu agente grátis
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="#como-funciona"
          className="inline-flex items-center gap-2 rounded-full border border-[#1a1a1a] bg-[#111] px-7 py-3.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-[#00E676]/30 hover:bg-[#181818] hover:text-white"
        >
          Ver como funciona
        </Link>
      </div>

      <p className="animate-fade-up delay-5 relative mt-4 text-xs text-[#666]">
        Sem cartão pra montar. Você só assina quando vir o agente pronto.
      </p>

      <div
        className="animate-fade-up relative mx-auto mt-12 aspect-video w-full max-w-md overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a]"
        style={{ animationDelay: '700ms' }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/brand/logo-primary.svg"
          className="h-full w-full object-cover"
        >
          <source src="/videos/prompt1.mp4" type="video/mp4" />
        </video>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/60 via-transparent to-transparent"
        />
      </div>
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
   PROVA RÁPIDA — faixa de 4 garantias logo abaixo do hero
   ───────────────────────────────────────────────────────────────── */

const PROOF: Array<{ icon: typeof Clock; title: string; body: string }> = [
  { icon: Clock, title: 'Pronto em minutos', body: 'O Forge monta tudo entrevistando você.' },
  { icon: Eye, title: 'Veja antes de pagar', body: 'O agente é demonstrado de graça.' },
  { icon: Headset, title: 'Atende 24/7', body: 'Nenhum cliente fica sem resposta.' },
  { icon: ShieldCheck, title: 'Garantia de 7 dias', body: 'Não gostou, devolvemos.' },
];

function ProofStrip() {
  return (
    <section className="border-t border-[#1a1a1a] bg-[#0a0a0a] py-14">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-8 px-6 md:grid-cols-4">
        {PROOF.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="flex flex-col items-start gap-2">
              <Icon className="h-6 w-6 text-[#00E676]" strokeWidth={1.75} />
              <p className="text-sm font-semibold text-white">{p.title}</p>
              <p className="text-[13px] leading-relaxed text-[#888]">{p.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PROBLEMA — dor
   ───────────────────────────────────────────────────────────────── */

function Problem() {
  return (
    <section className="border-t border-[#1a1a1a] py-32">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl">
          Todo lead que demora a ser respondido é{' '}
          <span className="font-serif italic font-normal text-[#00E676]">
            dinheiro saindo pela porta.
          </span>
        </h2>
        <div className="mt-8 space-y-5 text-lg leading-relaxed text-[#888]">
          <p>
            No WhatsApp, quem responde primeiro vende. Mas você não consegue estar no celular
            o dia inteiro — e contratar mais gente pra atender custa caro. Resultado: mensagem
            sem resposta às 22h, cliente que desistiu, orçamento que ficou pela metade.
          </p>
          <p>
            O Zapfy resolve isso colocando um vendedor incansável dentro do seu WhatsApp. Ele
            conhece o seu negócio, responde na hora, no seu tom, e só te chama quando realmente
            precisa de você.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COMO FUNCIONA — 3 passos do Forge
   ───────────────────────────────────────────────────────────────── */

interface Step {
  n: string;
  title: string;
  body: string;
  icon: typeof Inbox;
}

const STEPS: Step[] = [
  {
    n: '01',
    title: 'O Forge te entrevista',
    body: 'Você conversa com o Forge como conversaria com um funcionário novo. Ele pergunta o que você vende, seus preços, horários, formas de pagamento e o jeito que você fala com o cliente.',
    icon: MessageSquareText,
  },
  {
    n: '02',
    title: 'Ele monta e te mostra funcionando',
    body: 'Com base na entrevista, o Forge constrói o agente completo e te deixa testar ali mesmo. Você vê, na hora e de graça, como ele vai atender seus clientes.',
    icon: Eye,
  },
  {
    n: '03',
    title: 'Gostou? Ligue e venda',
    body: 'Quando você assina, o agente vai ao ar no seu número de WhatsApp e começa a atender no mesmo dia. Não gostou em 7 dias? Devolvemos.',
    icon: ArrowRight,
  },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t border-[#1a1a1a] py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
            Como funciona
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Veja seu agente pronto em 3 passos.{' '}
            <span className="font-serif italic font-normal text-[#888]">
              Sem manual, sem código, sem compromisso.
            </span>
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <StepCard key={step.n} step={step} delay={i + 1} />
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-[#00E676] px-7 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-transform hover:scale-[1.02]"
          >
            Montar meu agente grátis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
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
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 -top-6 select-none text-[120px] font-bold leading-none tracking-tighter text-[#00E676]/[0.05] transition-colors group-hover:text-[#00E676]/[0.10]"
      >
        {step.n}
      </span>

      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00E676]/10 ring-1 ring-[#00E676]/20">
          <Icon className="h-7 w-7 text-[#00E676]" strokeWidth={1.75} />
        </div>
        <h3 className="mt-8 text-xl font-semibold tracking-tight text-white">{step.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[#888]">{step.body}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FEATURES — o que o agente faz (8)
   ───────────────────────────────────────────────────────────────── */

interface Feature {
  title: string;
  body: string;
  icon: typeof Brain;
}

const FEATURES: Feature[] = [
  {
    title: 'Atende na hora, 24/7',
    body: 'Responde toda mensagem em segundos, inclusive de madrugada e fim de semana.',
    icon: Clock,
  },
  {
    title: 'Fala como a sua marca',
    body: 'O tom, as gírias e o jeito do seu negócio, não um robô engessado.',
    icon: MessageSquareText,
  },
  {
    title: 'Qualifica leads',
    body: 'Descobre o que o cliente quer e separa quem está pronto pra comprar.',
    icon: Brain,
  },
  {
    title: 'Agenda e organiza',
    body: 'Marca horários, envia lembretes e mantém tudo no lugar.',
    icon: CalendarClock,
  },
  {
    title: 'Sabe a hora de te chamar',
    body: 'Quando o caso pede você, ele transfere com todo o contexto.',
    icon: BellRing,
  },
  {
    title: 'CRM no WhatsApp',
    body: 'Todas as conversas, etiquetas e funil num lugar só.',
    icon: Inbox,
  },
  {
    title: 'Áudio, imagem e documento',
    body: 'Entende e responde mídia, não só texto.',
    icon: FileText,
  },
  {
    title: 'Aprende com o seu negócio',
    body: 'Quanto mais ele atende, mais afiado ele fica.',
    icon: Sparkles,
  },
];

function Features() {
  return (
    <section className="border-t border-[#1a1a1a] py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
            O que o agente faz
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Um funcionário que nunca dorme, nunca esquece e{' '}
            <span className="font-serif italic font-normal text-white/70">
              nunca perde a paciência.
            </span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} delay={(i % 4) + 1} />
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
      className={`animate-fade-up delay-${delay} group rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-6 transition-all duration-200 hover:scale-[1.01] hover:border-[#00E676]/25 hover:bg-[#111]`}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#00E676]/10">
        <Icon className="h-5 w-5 text-[#00E676]" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-white">{feature.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#888]">{feature.body}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PARA QUEM É — segmentos
   ───────────────────────────────────────────────────────────────── */

const SEGMENTS: Array<{ icon: typeof Store; label: string }> = [
  { icon: Stethoscope, label: 'Clínicas e consultórios' },
  { icon: Store, label: 'Lojas e e-commerce' },
  { icon: UtensilsCrossed, label: 'Restaurantes e delivery' },
  { icon: Wrench, label: 'Prestadores de serviço' },
  { icon: Sparkles, label: 'Salões e estética' },
  { icon: Tag, label: 'Imobiliárias e corretores' },
  { icon: Brain, label: 'Infoprodutores e agências' },
];

function Segments() {
  return (
    <section className="border-t border-[#1a1a1a] py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
            Para quem é
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Feito pra quem vive de{' '}
            <span className="font-serif italic font-normal text-[#888]">
              responder no WhatsApp.
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {SEGMENTS.map((s) => {
            const Icon = s.icon;
            return (
              <span
                key={s.label}
                className="inline-flex items-center gap-2 rounded-full border border-[#1a1a1a] bg-[#0d0d0d] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-[#00E676]/30 hover:text-white"
              >
                <Icon className="h-4 w-4 text-[#00E676]" strokeWidth={1.75} />
                {s.label}
              </span>
            );
          })}
        </div>

        <p className="mt-10 text-center text-base text-[#888]">
          Se o seu cliente chega pelo WhatsApp, o Zapfy foi feito pra você.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TESTIMONIALS
   ───────────────────────────────────────────────────────────────── */

interface Testimonial {
  quote: string;
  name: string;
  vertical: string;
  city: string;
  initials: string;
  metric: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Antes perdia cliente que mandava no fim de semana. Agora o agente do Zapfy responde tudo, anota o tutor e marca o banho. Acordo segunda com a agenda lotada.',
    metric: '+340% de agendamentos no fim de semana',
    name: 'Ana Lima',
    vertical: 'Dona de pet shop',
    city: 'São Paulo',
    initials: 'AL',
  },
  {
    quote:
      'Configurei em uma manhã, conversando com o Forge. Ele entendeu que clínica odontológica precisa filtrar urgência e já montou o handoff direto pra mim em casos sérios.',
    metric: 'Setup completo em 1 manhã',
    name: 'Dr. Carlos Mendes',
    vertical: 'Dentista',
    city: 'Belo Horizonte',
    initials: 'CM',
  },
  {
    quote:
      'Recebia 200 dúvidas por dia sobre tamanho e prazo. O Zapfy resolve 70% sozinho e quando precisa transferir já chega com contexto, foto e endereço. Equipe agradeceu.',
    metric: '70% das dúvidas resolvidas pela IA',
    name: 'Loja Moda Clara',
    vertical: 'E-commerce de moda',
    city: 'Fortaleza',
    initials: 'MC',
  },
];

function Testimonials() {
  return (
    <section className="border-t border-[#1a1a1a] py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
            Prova social
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Quem ligou o agente,{' '}
            <span className="font-serif italic font-normal text-[#888]">não desligou mais.</span>
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
      className={`animate-fade-up delay-${delay} relative flex flex-col overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-8`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-4 right-6 select-none font-serif text-[80px] leading-[0.8] text-[#00E676]/20"
      >
        &ldquo;
      </span>

      <blockquote className="relative flex-1">
        <p className="font-serif text-[18px] italic leading-relaxed text-zinc-100">{t.quote}</p>
      </blockquote>
      <figcaption className="relative mt-7 border-t border-[#1a1a1a] pt-5">
        <p className="mb-2 text-sm font-medium text-[#00E676]">{t.metric}</p>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00E676]/15 text-sm font-bold text-[#00E676]">
            {t.initials}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{t.name}</p>
            <p className="text-[13px] text-[#888]">
              {t.vertical} · {t.city}
            </p>
          </div>
        </div>
      </figcaption>
    </figure>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FINAL CTA
   ───────────────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="border-t border-[#1a1a1a] bg-[#00E676] py-32 text-[#0a0a0a]">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-5xl font-bold leading-[1.05] tracking-[-0.03em] md:text-6xl">
          Seu próximo cliente já está
          <br />
          <span className="font-serif italic font-normal">te chamando no WhatsApp.</span>
        </h2>
        <p className="mt-6 text-base text-[#0a0a0a]/80 md:text-lg">
          Deixe o Forge montar seu agente agora, veja funcionando e decida com calma. Risco zero,
          garantia de 7 dias.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-[#0a0a0a] px-7 py-3.5 text-sm font-semibold text-[#00E676] transition-transform hover:scale-[1.02]"
          >
            Montar meu agente grátis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/precos"
            className="inline-flex items-center gap-2 rounded-full border border-[#0a0a0a]/20 bg-transparent px-7 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a]/10"
          >
            Ver planos
          </Link>
        </div>
        <p className="mt-4 text-xs text-[#0a0a0a]/70">
          Sem cartão pra montar. Você só assina quando ver o agente pronto.
        </p>
      </div>
    </section>
  );
}

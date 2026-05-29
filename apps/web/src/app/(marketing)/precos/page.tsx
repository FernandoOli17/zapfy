import Link from 'next/link';
import { ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { Button, cn } from '@zapfy/ui';

import { CosmicBackground } from '@/components/cosmic-bg';

export const metadata = {
  title: 'Preços',
  description:
    'Monte seu agente de graça. STARTER R$97 · PRO R$247 · BUSINESS R$597 · Enterprise sob consulta. Garantia de 7 dias. Cancele quando quiser.',
};

type Plan = {
  id: 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  name: string;
  price: number | null;
  blurb: string;
  highlight?: boolean;
  features: Array<{ has: boolean; text: string }>;
  cta: string;
  ctaHref: string;
};

const PLANS: Plan[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 97,
    blurb: 'Pra autônomos e negócios começando.',
    features: [
      { has: true, text: '1 número de WhatsApp' },
      { has: true, text: 'Até 1.500 conversas de IA por mês' },
      { has: true, text: 'CRM básico com etiquetas' },
      { has: true, text: '1 usuário' },
      { has: true, text: 'Créditos de marketing à parte' },
      { has: true, text: '🛡️ Garantia de 7 dias' },
    ],
    cta: 'Assinar Starter',
    ctaHref: '/signup',
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 247,
    blurb: 'Pra quem já vende e quer escalar.',
    highlight: true,
    features: [
      { has: true, text: '2 números de WhatsApp' },
      { has: true, text: 'Até 6.000 conversas de IA por mês' },
      { has: true, text: 'CRM com funil em kanban' },
      { has: true, text: 'Agendamento e lembretes' },
      { has: true, text: 'Integrações' },
      { has: true, text: '3 usuários' },
      { has: true, text: '🛡️ Garantia de 7 dias' },
    ],
    cta: 'Assinar Pro',
    ctaHref: '/signup',
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 597,
    blurb: 'Pra operações que precisam de volume.',
    features: [
      { has: true, text: 'Múltiplos números' },
      { has: true, text: 'Conversas reativas ilimitadas' },
      { has: true, text: 'Acesso à API' },
      { has: true, text: 'Multiatendente' },
      { has: true, text: 'Suporte com SLA' },
      { has: true, text: '🛡️ Garantia de 7 dias' },
    ],
    cta: 'Assinar Business',
    ctaHref: '/signup',
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: null,
    blurb: 'Pra grandes operações com necessidades específicas.',
    features: [
      { has: true, text: 'Volume alto e white-label' },
      { has: true, text: 'Integrações dedicadas' },
      { has: true, text: 'Gerente de conta' },
    ],
    cta: 'Falar com vendas',
    ctaHref: '/contato',
  },
];

const FEATURE_MATRIX: Array<{
  feature: string;
  starter: boolean | string;
  pro: boolean | string;
  business: boolean | string;
}> = [
  { feature: 'Números WhatsApp', starter: '1', pro: '2', business: 'Múltiplos' },
  { feature: 'Conversas de IA / mês', starter: '1.500', pro: '6.000', business: 'Ilimitado' },
  { feature: 'Usuários do time', starter: '1', pro: '3', business: 'Ilimitado' },
  { feature: 'CRM com etiquetas', starter: true, pro: true, business: true },
  { feature: 'Funil em kanban', starter: false, pro: true, business: true },
  { feature: 'Agendamento e lembretes', starter: false, pro: true, business: true },
  { feature: 'Forge (builder em conversa)', starter: true, pro: true, business: true },
  { feature: 'Handoff humano', starter: true, pro: true, business: true },
  { feature: 'Integrações', starter: false, pro: true, business: true },
  { feature: 'Multiatendente', starter: false, pro: false, business: true },
  { feature: 'API pública', starter: false, pro: false, business: true },
  { feature: 'Suporte', starter: 'E-mail', pro: 'Prioritário', business: 'SLA' },
  { feature: 'Garantia de 7 dias', starter: true, pro: true, business: true },
];

const FAQ = [
  {
    q: 'Posso testar antes de pagar?',
    a: 'Sim. O Forge monta o seu agente e te mostra funcionando de graça, sem cartão. Você só assina quando ver que vale a pena — e ainda tem 7 dias de garantia depois.',
  },
  {
    q: 'Por que não tem uma conta grátis pra sempre?',
    a: 'Porque agente de IA atendendo de verdade tem custo real. Em vez de um "grátis" limitado e capenga, a gente deixa você ver o agente completo funcionando antes de pagar, e cobre você com garantia. Mais honesto pra todo mundo.',
  },
  {
    q: 'O agente vai falar como um robô?',
    a: 'Não. O Forge aprende o tom do seu negócio na entrevista. O cliente sente que está falando com alguém da sua equipe.',
  },
  {
    q: 'Preciso saber programar ou configurar fluxo?',
    a: 'Não. O Forge entrevista você e monta tudo. Você só conecta o WhatsApp quando assinar.',
  },
  {
    q: 'Como conecto o meu número?',
    a: 'De forma simples e guiada, direto no painel. Em poucos minutos seu agente está no ar.',
  },
  {
    q: 'O agente passa pra mim quando precisa?',
    a: 'Sim. Você define quando ele deve te chamar, e ele transfere a conversa com todo o histórico.',
  },
  {
    q: 'O que conta como "conversa"?',
    a: 'Uma conversa é a interação contínua com um cliente. Mensagens trocadas dentro da mesma conversa não contam separado.',
  },
  {
    q: 'E os disparos de marketing?',
    a: 'Mensagens que você inicia (campanhas, promoções) usam um pacote de créditos transparente, cobrado à parte — assim você só paga pelo que dispara, sem surpresa na fatura.',
  },
  {
    q: 'E a garantia, como funciona?',
    a: 'Se em até 7 dias depois de assinar você achar que não é pra você, devolvemos. Sem letrinha miúda.',
  },
  {
    q: 'Tem fidelidade?',
    a: 'Não. Cancele quando quiser.',
  },
  {
    q: 'Meus dados e dos meus clientes estão seguros?',
    a: 'Sim. Seguimos as boas práticas de segurança e a LGPD.',
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <CosmicBackground intensity="muted" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-12 md:pt-28 md:pb-16 text-center">
          <div
            className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm"
            style={{ animationDelay: '0ms' }}
          >
            <Sparkles className="h-3 w-3" />
            Monte de graça · assine quando ver funcionando
          </div>
          <h1
            className="animate-fade-up mt-6 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl"
            style={{ animationDelay: '120ms' }}
          >
            Monte seu agente de graça.{' '}
            <span className="font-serif italic font-normal">
              <span className="bg-gradient-to-r from-primary via-[#00E676] to-primary bg-clip-text text-transparent">
                Assine só quando ver funcionando.
              </span>
            </span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg"
            style={{ animationDelay: '240ms' }}
          >
            Sem fidelidade. Garantia de 7 dias em todos os planos — não gostou, devolvemos.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {PLANS.map((plan, i) => (
              <div
                key={plan.id}
                className="animate-fade-up"
                style={{ animationDelay: `${120 + i * 100}ms` }}
              >
                <PlanCard plan={plan} />
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Preços em BRL · Cancele quando quiser · Garantia de 7 dias
          </p>

          {/* Nota explicativa — conversas reativas vs disparos de marketing */}
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-[#00E676]/25 bg-[#00E676]/5 p-5 text-sm leading-relaxed text-zinc-200">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#00E676]">
              💡 Como a cobrança funciona
            </p>
            <p>
              <strong className="text-white">Conversas iniciadas pelo cliente não consomem crédito de envio.</strong>{' '}
              O plano cobre suas{' '}
              <span className="text-[#00E676]">conversas de IA no mês</span>. Disparos de
              marketing (mensagens que você inicia) são cobrados em pacotes de créditos
              transparentes, à parte. Sem surpresa em fatura.
            </p>
          </div>
        </div>
      </section>

      {/* Comparativo completo */}
      <section className="border-y border-white/[0.06] bg-white/[0.01] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Comparativo completo
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tudo no mesmo lugar. Sem letrinha miúda.
            </p>
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm shadow-2xl shadow-primary/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-left">
                    <th className="py-4 pl-6 pr-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Funcionalidade
                    </th>
                    <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Starter
                    </th>
                    <th className="bg-primary/[0.06] px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-primary">
                      Pro
                    </th>
                    <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Business
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_MATRIX.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="py-3 pl-6 pr-4 font-medium">{row.feature}</td>
                      <td className="px-4 py-3 text-center">
                        <Cell value={row.starter} />
                      </td>
                      <td className="bg-primary/[0.03] px-4 py-3 text-center">
                        <Cell value={row.pro} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Cell value={row.business} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Perguntas honestas
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              O que você precisa saber antes de assinar.
            </p>
          </div>
          <div className="mt-10 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
            {FAQ.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between p-5 text-base font-semibold tracking-tight transition-colors hover:text-primary">
                  {item.q}
                  <span className="ml-4 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-muted-foreground transition-transform group-open:rotate-45 group-open:border-primary/40 group-open:bg-primary/10 group-open:text-primary">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-white/[0.06] py-20 md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 50% 100%, hsl(213 93% 55% / 0.12), transparent 70%)',
          }}
        />
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Monte agora.{' '}
            <span className="font-serif italic font-normal">
              <span className="bg-gradient-to-r from-primary via-[#00E676] to-primary bg-clip-text text-transparent">
                Pague só quando gostar.
              </span>
            </span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            O Forge monta seu agente em minutos. Sem cartão pra montar.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 px-6 shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40"
            >
              <Link href="/signup">
                Montar meu agente grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 border-white/[0.08] bg-white/[0.02] px-5 backdrop-blur-sm hover:bg-white/[0.05]"
            >
              <Link href="/contato">Falar com a gente</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const isHighlight = !!plan.highlight;
  return (
    <div
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300',
        isHighlight
          ? 'border-primary/40 shadow-2xl shadow-primary/20'
          : 'border-white/[0.08] hover:-translate-y-1 hover:border-primary/30 hover:bg-white/[0.04]',
      )}
    >
      {isHighlight && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl"
            style={{
              background:
                'linear-gradient(135deg, hsl(213 93% 68% / 0.4), transparent 50%, hsl(213 93% 68% / 0.2))',
              maskImage: 'linear-gradient(135deg, black, transparent 50%, black)',
              padding: '1px',
            }}
          />
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-[#00E676] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-md shadow-primary/40">
            <Sparkles className="h-3 w-3" />
            Mais popular
          </span>
        </>
      )}
      <div className="relative flex h-full flex-col">
        <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>

        <div className="mt-5 flex items-baseline gap-1">
          {plan.price === null ? (
            <span className="text-2xl font-semibold tracking-tight">Sob consulta</span>
          ) : (
            <>
              <span className="text-base font-medium text-muted-foreground">R$</span>
              <span className="text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">
                {plan.price.toLocaleString('pt-BR')}
              </span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {plan.price === null ? 'Necessidades específicas' : 'Garantia de 7 dias'}
        </p>

        <Button
          asChild
          className={cn(
            'mt-6 h-11 w-full',
            isHighlight
              ? 'shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40'
              : 'border-white/[0.08] bg-white/[0.04] text-foreground hover:bg-white/[0.08]',
          )}
          variant={isHighlight ? 'default' : 'outline'}
        >
          <Link href={plan.ctaHref}>
            {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>

        <div className="mt-6 border-t border-white/[0.06] pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Inclui
          </p>
          <ul className="mt-3 space-y-2.5 text-sm">
            {plan.features.map((f) => (
              <li key={f.text} className="flex items-start gap-2.5">
                {f.has ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/30" />
                )}
                <span className={f.has ? 'text-foreground' : 'text-muted-foreground/40 line-through'}>
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm font-medium">{value}</span>;
  }
  return value ? (
    <Check className="mx-auto h-4 w-4 text-primary" />
  ) : (
    <X className="mx-auto h-4 w-4 text-muted-foreground/20" />
  );
}

import Link from 'next/link';
import { ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { Button, cn } from '@zapfy/ui';

import { CosmicBackground } from '@/components/cosmic-bg';

export const metadata = {
  title: 'Preços',
  description:
    'STARTER R$97 · PRO R$297 · PREMIUM R$697. 7 dias grátis sem cartão. Cancele em um clique.',
};

type Plan = {
  id: 'STARTER' | 'PRO' | 'PREMIUM';
  name: string;
  price: number;
  blurb: string;
  highlight?: boolean;
  features: Array<{ has: boolean; text: string }>;
  cta: string;
};

const PLANS: Plan[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 97,
    blurb: 'Pra começar a atender com IA sem dor.',
    features: [
      { has: true, text: '1 número WhatsApp Business' },
      { has: true, text: '1 usuário (você)' },
      { has: true, text: '1.000 conversas IA por mês' },
      { has: true, text: '10 documentos na base de conhecimento' },
      { has: true, text: 'Forge ilimitado' },
      { has: true, text: 'Templates HSM' },
      { has: true, text: 'Handoff humano' },
      { has: true, text: 'Suporte por e-mail' },
      { has: false, text: 'Tools customizadas' },
      { has: false, text: 'Webhooks de saída' },
      { has: false, text: 'API pública' },
    ],
    cta: 'Começar grátis',
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 297,
    blurb: 'Pra time pequeno escalando atendimento.',
    highlight: true,
    features: [
      { has: true, text: '3 números WhatsApp Business' },
      { has: true, text: '5 usuários no time' },
      { has: true, text: '10.000 conversas IA por mês' },
      { has: true, text: '100 documentos na base' },
      { has: true, text: 'Tools customizadas por workspace' },
      { has: true, text: 'Webhooks de saída' },
      { has: true, text: 'Broadcasts e campanhas' },
      { has: true, text: 'Integração Google Calendar' },
      { has: true, text: 'Suporte prioritário' },
      { has: false, text: 'API pública' },
      { has: false, text: 'SLA de uptime' },
    ],
    cta: 'Começar grátis',
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 697,
    blurb: 'Pra operação séria, multi-loja, ou com API.',
    features: [
      { has: true, text: 'Números ilimitados' },
      { has: true, text: 'Usuários ilimitados' },
      { has: true, text: 'Conversas IA ilimitadas' },
      { has: true, text: 'Documentos ilimitados' },
      { has: true, text: 'API pública (REST + webhooks)' },
      { has: true, text: 'SLA de uptime' },
      { has: true, text: 'Onboarding assistido' },
      { has: true, text: 'Slack compartilhado com o time' },
      { has: true, text: 'Modelo de IA configurável' },
    ],
    cta: 'Começar grátis',
  },
];

const FEATURE_MATRIX: Array<{
  feature: string;
  starter: boolean | string;
  pro: boolean | string;
  premium: boolean | string;
}> = [
  { feature: 'Números WhatsApp', starter: '1', pro: '3', premium: 'Ilimitado' },
  { feature: 'Usuários do time', starter: '1', pro: '5', premium: 'Ilimitado' },
  { feature: 'Conversas IA / mês', starter: '1.000', pro: '10.000', premium: 'Ilimitado' },
  { feature: 'Documentos no RAG', starter: '10', pro: '100', premium: 'Ilimitado' },
  { feature: 'Forge (builder em conversa)', starter: true, pro: true, premium: true },
  { feature: 'Flow Builder visual', starter: true, pro: true, premium: true },
  { feature: 'Inbox real-time', starter: true, pro: true, premium: true },
  { feature: 'Handoff humano', starter: true, pro: true, premium: true },
  { feature: 'Templates HSM', starter: true, pro: true, premium: true },
  { feature: 'Tools por vertical', starter: true, pro: true, premium: true },
  { feature: 'Tools customizadas', starter: false, pro: true, premium: true },
  { feature: 'Webhooks de saída', starter: false, pro: true, premium: true },
  { feature: 'Broadcasts / campanhas', starter: false, pro: true, premium: true },
  { feature: 'Google Calendar', starter: false, pro: true, premium: true },
  { feature: 'API pública', starter: false, pro: false, premium: true },
  { feature: 'SLA de uptime', starter: false, pro: false, premium: true },
  { feature: 'Suporte', starter: 'E-mail', pro: 'Prioritário', premium: 'Slack' },
];

const FAQ = [
  {
    q: 'Como funciona o trial?',
    a: 'Você cria conta sem cartão e tem 7 dias com acesso a tudo do plano Starter (ou superior se escolher). No fim do trial, é só adicionar cartão pra continuar — ou deixar expirar, sem cobrança.',
  },
  {
    q: 'O que conta como "conversa IA"?',
    a: 'Uma "conversa" é uma janela de 24h de troca de mensagens com um único contato em que o agente IA respondeu pelo menos uma vez. Se o atendimento for 100% humano, não conta no limite.',
  },
  {
    q: 'O que acontece se eu passar do limite de conversas?',
    a: 'No Starter, o agente IA pausa e o time recebe alerta pra atender manual até o fim do ciclo, ou você dá upgrade. No Pro, segue funcionando e cobramos add-ons em lotes de 1.000 conversas (R$45/lote) — sem surpresa, avisamos em 80% do limite.',
  },
  {
    q: 'Preciso do meu próprio Meta App pro WhatsApp?',
    a: 'No MVP, sim — você cria um Meta App de graça na Meta Business Suite, ativa o WhatsApp Cloud API, e cola as credenciais (cifradas no nosso DB com AES-256-GCM). Quando o Trato virar Meta Tech Provider oficial, esse passo some.',
  },
  {
    q: 'A IA aprende com as conversas dos meus clientes?',
    a: 'Não. Suas conversas NUNCA são usadas pra treinar modelos da Anthropic, OpenAI ou qualquer terceiro. Os modelos são consumidos via API com flag de no-training. Suas mensagens viram contexto pra responder seu cliente, e ponto.',
  },
  {
    q: 'Posso usar meu próprio modelo de IA?',
    a: 'No Premium, sim — vamos abrir suporte a Anthropic, OpenAI, ou modelo on-prem (Llama, etc.) por workspace. No Starter e Pro usamos os modelos otimizados pelo Trato (Claude Sonnet 4.5 + Haiku 4.5).',
  },
  {
    q: 'Como funciona o handoff humano?',
    a: 'O agente detecta sinais de "preciso de gente" (palavras-chave, frustração, pedido fora do padrão) e pausa, manda mensagem-ponte e notifica seu time via inbox em tempo real, e-mail e push. Você pode também puxar a conversa manualmente a qualquer momento.',
  },
  {
    q: 'E LGPD?',
    a: 'Levamos a sério. Tokens da Meta cifrados, RLS na app layer, endpoints públicos de export/delete/opt-out, audit log de todas as ações sensíveis, DPA disponível no plano Premium. Veja a página /lgpd pra detalhes.',
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
            7 dias grátis · sem cartão
          </div>
          <h1
            className="animate-fade-up mt-6 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl"
            style={{ animationDelay: '120ms' }}
          >
            Preço simples e{' '}
            <span className="font-serif italic font-normal">
              <span className="bg-gradient-to-r from-primary via-sky-300 to-primary bg-clip-text text-transparent">
                previsível
              </span>
            </span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg"
            style={{ animationDelay: '240ms' }}
          >
            Cancele em um clique no portal Stripe. Trocou de plano? Cobra/devolve proporcional,
            sem dor.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 lg:grid-cols-3 lg:gap-5">
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
            Preços em BRL · IVA incluso · Cancele quando quiser
          </p>
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
                      Premium
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
                        <Cell value={row.premium} />
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
            Sem cartão. Sem ligação.{' '}
            <span className="font-serif italic font-normal">
              <span className="bg-gradient-to-r from-primary via-sky-300 to-primary bg-clip-text text-transparent">
                Só conversar.
              </span>
            </span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Em 5 minutos você conversa com o Forge e seu agente tá pronto.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 px-6 shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40"
            >
              <Link href="/signup">
                Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
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
        'group relative flex flex-col rounded-2xl border bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 md:p-7',
        isHighlight
          ? 'border-primary/40 shadow-2xl shadow-primary/20 lg:scale-[1.03]'
          : 'border-white/[0.08] hover:-translate-y-1 hover:border-primary/30 hover:bg-white/[0.04]',
      )}
    >
      {isHighlight && (
        <>
          {/* Glow ring no destaque */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl"
            style={{
              background:
                'linear-gradient(135deg, hsl(213 93% 68% / 0.4), transparent 50%, hsl(213 93% 68% / 0.2))',
              maskImage:
                'linear-gradient(135deg, black, transparent 50%, black)',
              padding: '1px',
            }}
          />
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-sky-400 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-md shadow-primary/40">
            <Sparkles className="h-3 w-3" />
            Mais escolhido
          </span>
        </>
      )}
      <div className="relative">
        <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>

        <div className="mt-5 flex items-baseline gap-1">
          <span className="text-base font-medium text-muted-foreground">R$</span>
          <span className="text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">
            {plan.price.toLocaleString('pt-BR')}
          </span>
          <span className="text-sm text-muted-foreground">/mês</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          7 dias grátis · Cobrança após o trial
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
          <Link href="/signup">
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
                <span
                  className={
                    f.has ? 'text-foreground' : 'text-muted-foreground/40 line-through'
                  }
                >
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

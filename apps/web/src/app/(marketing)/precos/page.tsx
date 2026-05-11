import Link from 'next/link';
import { ArrowRight, Check, Minus, Sparkles } from 'lucide-react';
import { Button, cn } from '@zapai/ui';

export const metadata = {
  title: 'Preços',
  description: 'STARTER R$97 · PRO R$297 · PREMIUM R$697. 7 dias grátis sem cartão. Cancele em um clique.',
};

type Plan = {
  id: 'STARTER' | 'PRO' | 'PREMIUM';
  name: string;
  price: number; // BRL
  blurb: string;
  highlight?: boolean;
  features: string[];
  cta: string;
};

const PLANS: Plan[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 97,
    blurb: 'Pra começar a atender com IA sem dor.',
    features: [
      '1 número WhatsApp Business',
      '1 usuário (você)',
      '1.000 conversas IA por mês',
      '10 documentos na base de conhecimento',
      'Forge ilimitado (refinamento em conversa)',
      'Templates HSM',
      'Handoff humano',
      'Suporte por e-mail',
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
      '3 números WhatsApp Business',
      '5 usuários no time',
      '10.000 conversas IA por mês',
      '100 documentos na base',
      'Tools customizadas por workspace',
      'Webhooks de saída',
      'Broadcasts e campanhas',
      'Integração Google Calendar',
      'Suporte prioritário',
    ],
    cta: 'Começar grátis',
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 697,
    blurb: 'Pra operação séria, multi-loja, ou com API.',
    features: [
      'Números ilimitados',
      'Usuários ilimitados',
      'Conversas IA ilimitadas',
      'Documentos ilimitados',
      'API pública (REST + webhooks)',
      'SLA de uptime',
      'Onboarding assistido',
      'Slack compartilhado com o time ZapAI',
    ],
    cta: 'Começar grátis',
  },
];

const FEATURE_MATRIX: Array<{ feature: string; starter: boolean | string; pro: boolean | string; premium: boolean | string }> = [
  { feature: 'Números WhatsApp', starter: '1', pro: '3', premium: 'Ilimitado' },
  { feature: 'Usuários do time', starter: '1', pro: '5', premium: 'Ilimitado' },
  { feature: 'Conversas IA / mês', starter: '1.000', pro: '10.000', premium: 'Ilimitado' },
  { feature: 'Documentos no RAG', starter: '10', pro: '100', premium: 'Ilimitado' },
  { feature: 'Forge (builder em conversa)', starter: true, pro: true, premium: true },
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
    a: 'No MVP, sim — você cria um Meta App de graça na Meta Business Suite, ativa o WhatsApp Cloud API, e cola as credenciais (cifradas no nosso DB com AES-256-GCM). Quando o ZapAI virar Meta Tech Provider oficial, esse passo some.',
  },
  {
    q: 'A IA aprende com as conversas dos meus clientes?',
    a: 'Não. Suas conversas NUNCA são usadas pra treinar modelos da Anthropic, OpenAI ou qualquer terceiro. Os modelos são consumidos via API com flag de no-training. Suas mensagens viram contexto pra responder seu cliente, e ponto.',
  },
  {
    q: 'Posso usar meu próprio modelo de IA?',
    a: 'No Premium, sim — vamos abrir suporte a Anthropic, OpenAI, ou modelo on-prem (Llama, etc.) por workspace. No Starter e Pro usamos os modelos otimizados pelo ZapAI (Claude Sonnet 4.5 + Haiku 4.5).',
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
      <section className="relative overflow-hidden">
        <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-12 md:pt-28 md:pb-16">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Preços</p>
          <h1 className="mt-4 text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
            Simples,{' '}
            <span className="font-serif italic font-normal text-primary">previsível.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            7 dias grátis em qualquer plano. Sem cartão. Cancele em um clique no portal Stripe.
            Trocou de plano? Cobra/devolve proporcional, sem dor.
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/20 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Comparativo completo</p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">
            Tudo no mesmo lugar.{' '}
            <span className="font-serif italic font-normal text-muted-foreground">Sem letrinha miúda.</span>
          </h2>
          <div className="mt-10 overflow-x-auto rounded-xl border border-border/60 bg-card/40">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-4 pl-6 pr-4 font-normal">Funcionalidade</th>
                  <th className="py-4 px-4 font-normal">Starter</th>
                  <th className="py-4 px-4 font-normal text-primary">Pro</th>
                  <th className="py-4 px-4 font-normal">Premium</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_MATRIX.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-background/30' : ''}>
                    <td className="py-3 pl-6 pr-4 font-medium">{row.feature}</td>
                    <td className="py-3 px-4 text-muted-foreground"><Cell value={row.starter} /></td>
                    <td className="py-3 px-4"><Cell value={row.pro} /></td>
                    <td className="py-3 px-4 text-muted-foreground"><Cell value={row.premium} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Dúvidas comuns</p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">
            Perguntas{' '}
            <span className="font-serif italic font-normal text-muted-foreground">honestas.</span>
          </h2>
          <div className="mt-10 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
            {FAQ.map((item) => (
              <details key={item.q} className="group p-6">
                <summary className="cursor-pointer list-none text-base font-medium tracking-tight transition-colors group-hover:text-primary">
                  {item.q}
                </summary>
                <p className="mt-3 text-muted-foreground leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-medium tracking-tight md:text-6xl">
            Sem cartão. Sem ligação.{' '}
            <span className="font-serif italic font-normal text-primary">Só conversar.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground md:text-xl">
            Em 5 minutos você conversa com o Forge e seu agente tá pronto.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link href="/signup">
                Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-5 text-base">
              <Link href="/contato">Falar com a gente</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border bg-card/40 p-7 transition',
        plan.highlight
          ? 'border-primary/50 bg-primary/[0.04] shadow-lg shadow-primary/5'
          : 'border-border/60 hover:border-border',
      )}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
          <Sparkles className="h-3 w-3" />
          Mais escolhido
        </span>
      )}
      <h3 className="text-2xl font-medium tracking-tight">{plan.name}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>

      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-5xl font-medium tracking-tight">
          R${' '}
          <span className="tabular-nums">{plan.price.toLocaleString('pt-BR')}</span>
        </span>
        <span className="text-sm text-muted-foreground">/mês</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">7 dias grátis. Cobrança após o trial.</p>

      <ul className="mt-7 space-y-3 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 flex-none text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button asChild className="mt-8 h-11" variant={plan.highlight ? 'default' : 'outline'}>
        <Link href="/signup">{plan.cta}</Link>
      </Button>
    </div>
  );
}

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') return <span className="text-foreground">{value}</span>;
  return value ? (
    <Check className="h-4 w-4 text-primary" />
  ) : (
    <Minus className="h-4 w-4 text-muted-foreground/40" />
  );
}

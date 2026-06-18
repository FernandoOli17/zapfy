import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { Reveal } from '../reveal';

interface Plan {
  id: string;
  name: string;
  price: number;
  tagline: string;
  conversas: string;
  featured?: boolean;
}

/** Dados reais espelhados de /precos (R$97 / R$247 / R$597). */
const PLANS: Plan[] = [
  { id: 'STARTER', name: 'Starter', price: 97, tagline: 'Pra começar a atender sozinho', conversas: '1.500 conversas de IA / mês' },
  { id: 'PRO', name: 'Pro', price: 247, tagline: 'Pro negócio que já vende no Zap', conversas: '6.000 conversas de IA / mês', featured: true },
  { id: 'BUSINESS', name: 'Business', price: 597, tagline: 'Volume alto, sem teto', conversas: 'Conversas de IA ilimitadas' },
];

/** Planos num relance — dados honestos + link pra página completa. */
export function PricingTeaser() {
  return (
    <section className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mb-14 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Planos</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-[clamp(2rem,5vw,3.25rem)] font-semibold tracking-[-0.02em] text-foreground">
            Preço de funcionário?{' '}
            <span className="font-serif italic font-normal text-muted-foreground">Nem perto.</span>
          </h2>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 90}>
              <div
                className={`flex h-full flex-col rounded-2xl border bg-card p-7 ${
                  plan.featured ? 'border-primary/50' : 'border-border'
                }`}
              >
                {plan.featured && (
                  <span className="mb-3 inline-flex w-fit items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Mais escolhido
                  </span>
                )}
                <p className="text-sm font-semibold tracking-tight text-foreground">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight text-foreground">
                    R${plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {plan.conversas}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/precos"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
          >
            Ver todos os planos e o que cada um inclui
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

import Link from 'next/link';
import { ArrowRight, Eye, MessageSquareText } from 'lucide-react';

import { Reveal } from '../reveal';

interface Step {
  n: string;
  title: string;
  body: string;
  icon: typeof Eye;
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

/** Como o Forge monta — os 3 passos da recursão "a IA que monta a IA". */
export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mb-16 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Como funciona
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-[clamp(2rem,5vw,3.25rem)] font-semibold tracking-[-0.02em] text-foreground">
            Seu agente pronto em 3 passos.{' '}
            <span className="font-serif italic font-normal text-muted-foreground">
              Sem manual, sem código, sem compromisso.
            </span>
          </h2>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.n} delay={i * 100}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/30">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-3 -top-6 select-none text-[120px] font-semibold leading-none tracking-tighter text-primary/[0.06] transition-colors group-hover:text-primary/[0.12]"
                  >
                    {step.n}
                  </span>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Icon className="h-7 w-7 text-primary" strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-8 text-xl font-semibold tracking-tight text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Montar meu agente grátis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

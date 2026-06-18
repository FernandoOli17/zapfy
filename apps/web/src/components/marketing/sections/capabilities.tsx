import { BellRing, BookOpen, Brain, CalendarClock, Clock, MessageSquareText } from 'lucide-react';

import { Reveal } from '../reveal';

interface Capability {
  title: string;
  body: string;
  icon: typeof Clock;
}

/** Só capacidades REAIS do produto (sem claim de mídia/aprendizado que não existe). */
const CAPABILITIES: Capability[] = [
  {
    title: 'Atende na hora, 24/7',
    body: 'Responde toda mensagem em segundos — inclusive de madrugada e fim de semana.',
    icon: Clock,
  },
  {
    title: 'Fala como a sua marca',
    body: 'O tom, as gírias e o jeito do seu negócio. Você define conversando com o Forge.',
    icon: MessageSquareText,
  },
  {
    title: 'Qualifica e vende',
    body: 'Descobre o que o cliente quer, recomenda e conduz até o fechamento.',
    icon: Brain,
  },
  {
    title: 'Agenda e organiza',
    body: 'Marca horários e mantém os agendamentos no lugar, por vertical.',
    icon: CalendarClock,
  },
  {
    title: 'Responde com a sua base',
    body: 'Suba documentos, FAQs e preços. Ele responde com base neles (RAG).',
    icon: BookOpen,
  },
  {
    title: 'Sabe a hora de te chamar',
    body: 'Quando o caso pede você, transfere pro humano com todo o contexto.',
    icon: BellRing,
  },
];

/** O que o agente faz — bento ousado, primeiro tile dominante. */
export function Capabilities() {
  return (
    <section className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mb-16 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            O que o agente faz
          </p>
          <h2 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-semibold tracking-[-0.02em] text-foreground">
            Um funcionário que nunca dorme, nunca esquece e{' '}
            <span className="font-serif italic font-normal text-foreground/70">
              nunca perde a paciência.
            </span>
          </h2>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => {
            const Icon = c.icon;
            const dominant = i === 0;
            return (
              <Reveal
                key={c.title}
                delay={(i % 3) * 90}
                className={dominant ? 'sm:col-span-2 lg:row-span-2' : ''}
              >
                <div
                  className={`group h-full rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/30 ${
                    dominant ? 'flex flex-col justify-between lg:p-8' : ''
                  }`}
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3
                      className={`font-semibold tracking-tight text-foreground ${
                        dominant ? 'text-2xl' : 'text-base'
                      }`}
                    >
                      {c.title}
                    </h3>
                    <p
                      className={`mt-2 leading-relaxed text-muted-foreground ${
                        dominant ? 'text-base' : 'text-sm'
                      }`}
                    >
                      {c.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

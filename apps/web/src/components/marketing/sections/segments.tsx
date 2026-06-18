import { Brain, Sparkles, Stethoscope, Store, Tag, UtensilsCrossed, Wrench } from 'lucide-react';

import { Reveal } from '../reveal';

const SEGMENTS: Array<{ icon: typeof Store; label: string; resolve: string }> = [
  { icon: UtensilsCrossed, label: 'Restaurantes e delivery', resolve: 'mostra o cardápio e anota o pedido' },
  { icon: Stethoscope, label: 'Clínicas e consultórios', resolve: 'agenda e confirma consultas' },
  { icon: Store, label: 'Lojas e e-commerce', resolve: 'recomenda produtos e fecha a venda' },
  { icon: Wrench, label: 'Prestadores de serviço', resolve: 'coleta o pedido e manda o orçamento' },
  { icon: Sparkles, label: 'Salões e estética', resolve: 'marca horário e lembra o cliente' },
  { icon: Tag, label: 'Imobiliárias e corretores', resolve: 'qualifica o lead e agenda a visita' },
  { icon: Brain, label: 'Infoprodutores e agências', resolve: 'qualifica e leva pra call de vendas' },
];

/** Por vertical — o que o agente resolve em cada negócio. */
export function Segments() {
  return (
    <section className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mb-12 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Pra quem é
          </p>
          <h2 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-semibold tracking-[-0.02em] text-foreground">
            Cada negócio tem o seu jeito.{' '}
            <span className="font-serif italic font-normal text-muted-foreground">
              O agente fala a língua do seu.
            </span>
          </h2>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SEGMENTS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.label} delay={(i % 3) * 80}>
                <div className="group flex h-full items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight text-foreground">{s.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.resolve}</p>
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

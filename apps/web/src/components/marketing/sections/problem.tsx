import { Reveal } from '../reveal';

/** "A virada" — a dor de responder no WhatsApp na mão. Editorial, sem métrica inventada. */
export function Problem() {
  return (
    <section className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground">
            Todo lead que demora a ser respondido é{' '}
            <span className="font-serif italic font-normal text-primary">
              dinheiro saindo pela porta.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted-foreground">
            <p>
              No WhatsApp, quem responde primeiro vende. Mas você não consegue estar no celular
              o dia inteiro — e contratar mais gente pra atender custa caro. O resultado é
              sempre o mesmo: mensagem sem resposta às 22h, cliente que desistiu, orçamento que
              ficou pela metade.
            </p>
            <p>
              O Zapfy coloca um vendedor incansável dentro do seu WhatsApp. Ele conhece o seu
              negócio, responde na hora, no seu tom — e só te chama quando realmente precisa de
              você.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

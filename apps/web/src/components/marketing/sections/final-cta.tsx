import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Reveal } from '../reveal';

/** CTA final — foco único, forte. */
export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-border py-28 md:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-cosmic-glow absolute inset-x-0 bottom-0 h-[60vh] rotate-180" />
      </div>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-foreground">
            Monte seu agente{' '}
            <span className="font-serif italic font-normal text-primary">agora.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-muted-foreground">
            Converse com o Forge e veja seu atendente de WhatsApp ganhar vida em minutos.
          </p>
          <div className="mt-9 flex justify-center">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              Montar meu agente grátis
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sem cartão pra montar · Garantia de 7 dias
          </p>
        </Reveal>
      </div>
    </section>
  );
}

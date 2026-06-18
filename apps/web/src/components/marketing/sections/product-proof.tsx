import { Eye, ShieldCheck, Sparkles, Verified } from 'lucide-react';

import { Reveal } from '../reveal';

interface Proof {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}

/** Prova de PRODUTO (verdade verificável) — substitui depoimentos fabricados. */
const PROOFS: Proof[] = [
  {
    icon: Verified,
    title: 'Cloud API oficial da Meta',
    body: 'Nada de número clonado ou app não-oficial que cai. Integração oficial, estável.',
  },
  {
    icon: ShieldCheck,
    title: 'LGPD desde o início',
    body: 'Exportar, anonimizar e apagar dados do contato. Tokens cifrados, sem PII em log.',
  },
  {
    icon: Eye,
    title: 'Monte de graça antes de pagar',
    body: 'O Forge constrói e te deixa testar o agente sem cartão. Você vê funcionando primeiro.',
  },
  {
    icon: Sparkles,
    title: 'Garantia de 7 dias',
    body: 'Ligou e não gostou? Devolvemos o valor. O risco é nosso, não seu.',
  },
];

/** Prova honesta — "seja um dos primeiros", sem métrica/depoimento inventado. */
export function ProductProof() {
  return (
    <section className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mb-14 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Por que confiar
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-[clamp(2rem,5vw,3.25rem)] font-semibold tracking-[-0.02em] text-foreground">
            Seja um dos primeiros a{' '}
            <span className="font-serif italic font-normal text-primary">ligar o agente.</span>
          </h2>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROOFS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={(i % 4) * 80}>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

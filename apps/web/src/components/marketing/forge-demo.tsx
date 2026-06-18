import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * ForgeDemo — vídeo gerado via Veo 3 mostrando split-screen do Forge
 * em ação. AutoPlay/muted/loop/playsInline pra rodar inline em iOS.
 * Wrapper em `<section>` brand pra continuar o ritmo da landing.
 */
export function ForgeDemo() {
  return (
    <section className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Forge · veja montando ao vivo
          </p>
          <h2 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-semibold tracking-[-0.02em] text-foreground">
            Você conversa.{' '}
            <span className="font-serif italic font-normal text-primary">O Zapfy monta.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Sem fluxograma. Sem formulário. O Forge entrevista, decide as tools e publica.
          </p>
        </div>

        {/* max-w-2xl intencional: tamanho menor disfarça artefatos IA do vídeo */}
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/brand/logo-primary.svg"
            aria-label="Forge montando um agente, em tempo real"
            className="block w-full"
          >
            <source src="/videos/prompt2.mp4" type="video/mp4" />
          </video>
          <div className="absolute right-4 top-4 inline-flex animate-pulse items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            Ao vivo
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Experimentar de graça
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Do signup ao agente publicado em poucos minutos — sem código, sem fluxograma.
        </p>
      </div>
    </section>
  );
}

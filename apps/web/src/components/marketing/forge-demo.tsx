import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * ForgeDemo — vídeo gerado via Veo 3 mostrando split-screen do Forge
 * em ação. AutoPlay/muted/loop/playsInline pra rodar inline em iOS.
 * Wrapper em `<section>` brand pra continuar o ritmo da landing.
 */
export function ForgeDemo() {
  return (
    <section className="border-t border-[#1a1a1a] py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
            Forge · 90 segundos pra configurar
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Você conversa.{' '}
            <span className="font-serif italic font-normal text-[#00E676]">O Zapfy monta.</span>
          </h2>
          <p className="mt-5 max-w-xl mx-auto text-base leading-relaxed text-[#888]">
            Sem fluxograma. Sem formulário. O Forge entrevista, decide as tools e publica.
          </p>
        </div>

        {/* max-w-2xl intencional: tamanho menor disfarça artefatos IA do vídeo */}
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-[#1a1a1a]">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/brand/logo-primary.svg"
            className="block w-full"
          >
            <source src="/videos/prompt2.mp4" type="video/mp4" />
          </video>
          <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#00E676] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0a0a0a] animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a]" />
            Ao vivo
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-[#00E676] px-6 py-3 text-sm font-semibold text-[#0a0a0a] transition-transform hover:scale-[1.02] animate-pulse-green"
          >
            Experimentar de graça
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-[#666]">
          Tempo médio do beta: 8 minutos do signup ao primeiro cliente respondido.
        </p>
      </div>
    </section>
  );
}

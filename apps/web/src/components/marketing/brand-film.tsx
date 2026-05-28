/**
 * BrandFilmSection — peça emocional curta, vídeo gerado via Veo 3
 * (dona de pet shop em SP). AutoPlay/muted/loop/playsInline. Overlay
 * inferior carrega a quote + atribuição.
 */
export function BrandFilmSection() {
  return (
    <section className="border-t border-[#1a1a1a] bg-[#0a0a0a] py-32">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
          Histórias reais
        </p>

        <h2 className="mx-auto mt-4 max-w-2xl text-center text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
          Pequenos negócios.{' '}
          <span className="font-serif italic font-normal text-[#00E676]">
            Grandes resultados.
          </span>
        </h2>

        <div className="relative mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-[#1a1a1a]">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/brand/logo-primary.svg"
            className="block w-full"
          >
            <source src="/videos/prompt3.mp4" type="video/mp4" />
          </video>

          {/* gradiente inferior + quote sobreposta */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent p-8 pt-24">
            <p className="font-serif text-lg italic text-white md:text-xl">
              &ldquo;Meu negócio nunca mais perdeu um cliente por falta de resposta.&rdquo;
            </p>
            <p className="mt-2 text-sm text-[#888]">
              Ana Lima · Pet Shop Granvilla · São Paulo
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-base text-[#888] md:text-lg">
          Seu negócio nunca dorme.{' '}
          <span className="font-medium text-[#00E676]">O Zapfy cuida.</span>
        </p>
      </div>
    </section>
  );
}

/**
 * BrandFilmSection — peça emocional curta, vídeo gerado via Veo 3.
 * Sem overlay com nome/atribuição: o vídeo é apenas evocativo, não
 * representa cliente real.
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
        </div>

        <p className="mt-10 text-center text-base text-[#888] md:text-lg">
          Seu negócio nunca dorme.{' '}
          <span className="font-medium text-[#00E676]">O Zapfy cuida.</span>
        </p>
      </div>
    </section>
  );
}

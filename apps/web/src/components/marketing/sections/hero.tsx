import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

/**
 * Hero da landing — lidera pelo moat: "a IA que monta a IA".
 * Editorial-técnico: preto profundo, verde elétrico parcimonioso, Instrument
 * Serif italic no acento. Entrada com stagger (animate-fade-up + delay inline).
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-28 pb-20 md:pt-36 md:pb-28">
      {/* Ambiente: glow verde + dot-grid, tokenizado (sem purple-pink) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-cosmic-glow absolute inset-x-0 top-0 h-[70vh]" />
        <div className="bg-dot-grid absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent_75%)]" />
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <span
          className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1.5 text-xs font-medium text-primary"
          style={{ animationDelay: '40ms' }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Forge · monta seu agente conversando
        </span>

        <h1
          className="animate-fade-up mt-8 max-w-4xl text-[clamp(2.75rem,8vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-foreground"
          style={{ animationDelay: '120ms' }}
        >
          A IA que{' '}
          <span className="font-serif italic font-normal text-primary">monta a IA</span>{' '}
          que atende no seu WhatsApp.
        </h1>

        <p
          className="animate-fade-up mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground"
          style={{ animationDelay: '200ms' }}
        >
          Você conversa com o Forge, ele entrevista seu negócio e gera o agente inteiro —
          tom, fluxos, agenda. Em minutos, no ar.
        </p>

        <div
          className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: '280ms' }}
        >
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Montar meu agente grátis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="#forge"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-sm font-semibold text-foreground/80 transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Ver o Forge ao vivo
          </Link>
        </div>

        <p
          className="animate-fade-up mt-4 text-xs text-muted-foreground"
          style={{ animationDelay: '340ms' }}
        >
          Sem cartão pra montar · Cloud API oficial da Meta
        </p>

        <div
          className="animate-fade-up relative mx-auto mt-14 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-[0_0_80px_-20px_var(--color-primary)]"
          style={{ animationDelay: '460ms' }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/brand/logo-primary.svg"
            aria-label="Demonstração do Forge montando um agente"
            className="aspect-video h-full w-full object-cover"
          >
            <source src="/videos/prompt1.mp4" type="video/mp4" />
          </video>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent"
          />
        </div>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

interface ChatLine {
  side: 'user' | 'agent';
  text: string;
  /** delay em ms desde o anterior antes de aparecer */
  delay: number;
}

const SCRIPT: ChatLine[] = [
  { side: 'user', text: 'Tenho um pet shop em Pinheiros. Vendo ração premium, banho e tosa.', delay: 600 },
  { side: 'agent', text: 'Beleza! Detectei vertical: pet shop 🐾. Vamos configurar tom e tools — você prefere falar mais formal ou casual com o cliente?', delay: 1200 },
  { side: 'user', text: 'Casual, mas sem perder o respeito.', delay: 1200 },
  { side: 'agent', text: 'Show. Liguei as tools: listar serviços, agendar banho, status do pedido, transferir pra humano se a IA travar.', delay: 1500 },
  { side: 'agent', text: '✓ Agente publicado · pronto pra atender no WhatsApp', delay: 1200 },
];

/**
 * ForgeDemo — substitui o placeholder de vídeo da landing por um chat
 * animado que reproduz uma conversa real com o Forge. Sem dependência
 * de video/autoplay (que era o que travava em mobile + iOS).
 */
export function ForgeDemo() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let elapsed = 600;
    const timers: ReturnType<typeof setTimeout>[] = [];
    SCRIPT.forEach((line, i) => {
      elapsed += line.delay;
      const t = setTimeout(() => {
        if (!cancelled) setVisible(i + 1);
      }, elapsed);
      timers.push(t);
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <section className="border-t border-white/[0.06] py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
            Forge · 90 segundos pra configurar
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Você conversa. O Zapfy monta seu agente.
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            Sem fluxograma. Sem formulário. O Forge entrevista, decide as tools e publica.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 shadow-2xl shadow-emerald-950/30 md:p-10">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 50% 30%, rgba(0,230,118,0.10), transparent 70%)',
            }}
          />
          <div className="relative mx-auto max-w-2xl">
            <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
              <span className="font-mono">forge.zapfy.com.br</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="h-3 w-3" /> live
              </span>
            </div>

            <div className="min-h-[320px] space-y-3" aria-live="polite">
              {SCRIPT.slice(0, visible).map((line, i) => (
                <ChatBubble key={i} side={line.side} text={line.text} />
              ))}
              {visible < SCRIPT.length && <TypingDots />}
            </div>

            {visible >= SCRIPT.length && (
              <div className="mt-8 flex justify-center animate-fade-up">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-[#00E676] px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-900/30 transition-transform hover:scale-105"
                >
                  Experimentar de graça
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Tempo médio do beta: 8 minutos do signup ao primeiro cliente respondido.
        </p>
      </div>
    </section>
  );
}

function ChatBubble({ side, text }: { side: 'user' | 'agent'; text: string }) {
  const isUser = side === 'user';
  return (
    <div className={`flex animate-fade-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-zinc-800 text-zinc-100'
            : 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-500/20'
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-1 rounded-2xl bg-emerald-500/15 px-4 py-3 ring-1 ring-emerald-500/20">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

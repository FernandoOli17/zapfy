'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface ChatLine {
  side: 'user' | 'agent';
  text: string;
  /** delay em ms desde a anterior antes da bolha entrar */
  delay: number;
}

const SCRIPT: ChatLine[] = [
  { side: 'user', text: 'Tenho um pet shop em Pinheiros. Vendo ração premium, banho e tosa.', delay: 700 },
  { side: 'agent', text: 'Beleza. Detectei vertical: pet shop. Tom mais formal ou casual com o cliente?', delay: 1300 },
  { side: 'user', text: 'Casual, mas sem perder o respeito.', delay: 1100 },
  { side: 'agent', text: 'Liguei as tools: listar serviços, agendar banho, status do pedido, transferir pra humano se a IA travar.', delay: 1500 },
  { side: 'agent', text: '✓ Agente publicado · pronto pra atender no WhatsApp', delay: 1300 },
];

/**
 * ForgeDemo — chat animado simulando uma conversa real com o Forge.
 * Sem dependência de video/autoplay (que travava iOS). Visual 100%
 * dentro da paleta brand: verde #00E676 + neutros zinc/black.
 */
export function ForgeDemo() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let elapsed = 500;
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

        <div className="relative overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-6 md:p-10">
          {/* glow sutil verde no topo */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40"
            style={{
              background:
                'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(0,230,118,0.08), transparent 70%)',
            }}
          />
          <div className="relative mx-auto max-w-2xl">
            <div className="mb-5 flex items-center justify-between text-xs">
              <span className="font-mono text-[#666]">forge.zapfy.com.br</span>
              <span className="flex items-center gap-1.5 text-[#00E676]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00E676] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00E676]" />
                </span>
                ao vivo
              </span>
            </div>

            <div className="min-h-[340px] space-y-3" aria-live="polite">
              {SCRIPT.slice(0, visible).map((line, i) => (
                <ChatBubble key={i} side={line.side} text={line.text} />
              ))}
              {visible < SCRIPT.length && <TypingDots />}
            </div>

            {visible >= SCRIPT.length && (
              <div className="mt-10 flex justify-center animate-fade-up">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 rounded-full bg-[#00E676] px-6 py-3 text-sm font-semibold text-[#0a0a0a] transition-transform hover:scale-[1.02] animate-pulse-green"
                >
                  Experimentar de graça
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-[#666]">
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
            ? 'bg-[#1a1a1a] text-zinc-100'
            : 'bg-[#00E676]/12 text-zinc-100 ring-1 ring-[#00E676]/25'
        }`}
      >
        {text}
        {!isUser && text.startsWith('✓') ? null : null}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-1.5 rounded-2xl bg-[#00E676]/12 px-4 py-3 ring-1 ring-[#00E676]/25">
        <span className="h-1.5 w-1.5 animate-cursor rounded-full bg-[#00E676]" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 animate-cursor rounded-full bg-[#00E676]" style={{ animationDelay: '180ms' }} />
        <span className="h-1.5 w-1.5 animate-cursor rounded-full bg-[#00E676]" style={{ animationDelay: '360ms' }} />
      </div>
    </div>
  );
}

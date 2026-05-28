'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

const STORAGE_KEY = 'zapfy-urgency-banner-closed-v1';

/**
 * Barra fina no topo do site com CTA do trial gratuito.
 * Fundo verde brand (#00E676), texto preto. Botão X salva em localStorage
 * pra não reaparecer pro mesmo visitante. Esconde até hidratar pra
 * evitar flash em quem já fechou.
 */
export function UrgencyBanner() {
  const [state, setState] = useState<'loading' | 'open' | 'closed'>('loading');

  useEffect(() => {
    try {
      const closed = window.localStorage.getItem(STORAGE_KEY);
      setState(closed === '1' ? 'closed' : 'open');
    } catch {
      setState('open');
    }
  }, []);

  if (state !== 'open') return null;

  const close = () => {
    setState('closed');
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore — modo privado/quota
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-[#00E676] px-4 py-2 text-xs font-medium text-zinc-950 md:text-sm">
      <span className="flex-1 text-center">
        🎁 <strong className="font-semibold">7 dias grátis</strong>
        <span className="opacity-80"> · sem cartão de crédito</span>
      </span>
      <Link
        href="/signup"
        className="shrink-0 rounded-md bg-zinc-950 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
      >
        Começar agora →
      </Link>
      <button
        type="button"
        onClick={close}
        aria-label="Fechar banner"
        className="shrink-0 rounded-md p-1 text-zinc-950/70 transition-colors hover:bg-black/10 hover:text-zinc-950"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';

const DISMISS_KEY = 'orbe-announcement-v1';

export function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative z-50 flex items-center justify-center gap-2 bg-[#FFE01B] px-4 py-2.5 text-center text-sm font-medium text-zinc-900">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-zinc-700" aria-hidden />
      <span>
        Forge v2 chegou — configure seu agente em conversa, sem formulário.{' '}
        <Link
          href="/signup"
          className="font-bold underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          Começar grátis →
        </Link>
      </span>
      <button
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 transition-opacity hover:opacity-60"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

'use client';

import { useEffect, useState, useTransition } from 'react';

import { resendCodeAction } from './actions';

const COOLDOWN_SEC = 60;

/**
 * Reenvia o código de verificação via server action. Cooldown de 60s no
 * client (defesa em profundidade — o rate-limit real é no servidor) +
 * feedback "Enviado!"/erro inline.
 */
export function ResendButton() {
  const [pending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function onResend() {
    setFeedback(null);
    startTransition(async () => {
      const res = await resendCodeAction();
      if (res.ok) {
        setFeedback({ kind: 'ok', text: 'Enviado! Cheque seu e-mail.' });
        setCooldown(COOLDOWN_SEC);
        return;
      }
      setFeedback({ kind: 'error', text: res.error ?? 'Não foi possível reenviar.' });
    });
  }

  const disabled = pending || cooldown > 0;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={onResend}
        disabled={disabled}
        className="text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? 'Reenviando…'
          : cooldown > 0
            ? `Reenviar código em ${cooldown}s`
            : 'Reenviar código'}
      </button>
      {feedback && (
        <p
          className={
            feedback.kind === 'ok'
              ? 'mt-1 text-xs text-primary'
              : 'mt-1 text-xs text-red-400'
          }
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}

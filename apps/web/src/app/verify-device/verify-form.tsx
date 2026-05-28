'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { verifyDeviceCodeAction } from './actions';

export function VerifyDeviceForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.replace(/\D/g, '');
    if (trimmed.length !== 6) {
      setError('Código deve ter 6 dígitos.');
      return;
    }
    startTransition(async () => {
      const res = await verifyDeviceCodeAction(trimmed);
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
        return;
      }
      setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label htmlFor="code" className="block text-[11px] font-semibold uppercase tracking-wider text-[#888]">
        Código de 6 dígitos
      </label>
      <input
        id="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        className="w-full rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-4 text-center font-mono text-2xl tracking-[0.4em] text-white outline-none transition-colors focus:border-[#00E676]/40"
      />

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || code.length !== 6}
        className="group w-full rounded-full bg-[#00E676] px-6 py-3 text-sm font-semibold text-[#0a0a0a] transition-transform enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Verificando…' : 'Confirmar acesso'}
      </button>
    </form>
  );
}

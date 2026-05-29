'use client';

import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';

import { replyAsUserAction } from './actions';

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await replyAsUserAction({ ticketId, body });
      if (res.ok) {
        setBody('');
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor="reply" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Responder
      </label>
      <textarea
        id="reply"
        required
        minLength={2}
        maxLength={4000}
        rows={5}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Sua resposta…"
        className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none transition-colors focus:border-primary/40"
      />
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || body.trim().length < 2}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-transform enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {pending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </form>
  );
}

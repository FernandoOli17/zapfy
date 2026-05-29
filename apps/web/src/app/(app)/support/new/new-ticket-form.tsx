'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { createTicketAction } from './actions';

const CATEGORIES = [
  { value: 'OTHER', label: 'Outro / não sei' },
  { value: 'BILLING', label: 'Cobrança / plano' },
  { value: 'BUG', label: 'Bug / não funciona' },
  { value: 'WHATSAPP_SETUP', label: 'Conectar WhatsApp' },
  { value: 'AGENT_CONFIG', label: 'Configurar agente IA' },
  { value: 'FEATURE_REQUEST', label: 'Pedir feature' },
] as const;

interface Props {
  defaultName: string;
  defaultEmail: string;
}

export function NewTicketForm({ defaultName, defaultEmail }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<typeof CATEGORIES[number]['value']>('OTHER');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTicketAction({ category, subject, body });
      if (res.ok) {
        router.push(`/support/${res.ticketId}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="text-xs text-muted-foreground">
        Vai chegar de <strong className="text-foreground">{defaultName || defaultEmail}</strong>{' '}
        ({defaultEmail})
      </div>

      <div>
        <label htmlFor="category" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Categoria
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/40"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="subject" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Assunto
        </label>
        <input
          id="subject"
          type="text"
          required
          minLength={4}
          maxLength={120}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Resumo em 1 linha"
          className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/40"
        />
      </div>

      <div>
        <label htmlFor="body" className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Mensagem
        </label>
        <textarea
          id="body"
          required
          minLength={10}
          maxLength={4000}
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Conta o que está acontecendo. Quanto mais detalhe (passo a passo, prints, mensagem de erro), mais rápido resolvo."
          className="mt-1.5 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none transition-colors focus:border-primary/40"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Abrindo…' : 'Abrir ticket'}
      </button>
    </form>
  );
}

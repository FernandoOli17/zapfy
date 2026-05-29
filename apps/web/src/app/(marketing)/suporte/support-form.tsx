'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2 } from 'lucide-react';

import { submitSupportTicketAction } from './actions';

const CATEGORIES = [
  { value: 'OTHER', label: 'Outro / não sei' },
  { value: 'BILLING', label: 'Cobrança / plano' },
  { value: 'BUG', label: 'Bug / não funciona' },
  { value: 'WHATSAPP_SETUP', label: 'Conectar WhatsApp' },
  { value: 'AGENT_CONFIG', label: 'Configurar agente IA' },
  { value: 'FEATURE_REQUEST', label: 'Pedir feature' },
] as const;

export function SupportForm() {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]['value']>('OTHER');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [success, setSuccess] = useState<{ publicNumber: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitSupportTicketAction({ name, email, category, subject, body });
      if (res.ok) {
        setSuccess({ publicNumber: res.publicNumber });
        setName('');
        setEmail('');
        setSubject('');
        setBody('');
      } else {
        setError(res.error);
      }
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-[#00E676]/25 bg-[#00E676]/5 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-[#00E676]" />
        <h3 className="mt-4 text-xl font-semibold text-white">
          Ticket #{success.publicNumber} aberto ✅
        </h3>
        <p className="mt-2 max-w-sm text-sm text-[#888]">
          Recebemos. A gente responde por email ({email || 'o endereço que você informou'}){' '}
          — geralmente em algumas horas no horário comercial.
        </p>
        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="mt-6 rounded-full border border-[#1a1a1a] bg-[#0d0d0d] px-5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-[#00E676]/30 hover:text-white"
        >
          Abrir outro ticket
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Seu nome" htmlFor="name">
          <input
            id="name"
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00E676]/40"
          />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00E676]/40"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Categoria" htmlFor="category">
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00E676]/40"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assunto" htmlFor="subject">
          <input
            id="subject"
            type="text"
            required
            minLength={4}
            maxLength={120}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Resumo em 1 linha"
            className="w-full rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00E676]/40"
          />
        </Field>
      </div>

      <Field label="Conta o que está acontecendo" htmlFor="body">
        <textarea
          id="body"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Quanto mais detalhe (passo a passo, prints, mensagem de erro), mais rápido a gente resolve."
          className="w-full resize-y rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-sm leading-relaxed text-white outline-none transition-colors focus:border-[#00E676]/40"
        />
      </Field>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#00E676] px-6 py-3 text-sm font-semibold text-[#0a0a0a] transition-transform enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Enviando…' : 'Enviar ticket'}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[11px] font-semibold uppercase tracking-wider text-[#888]">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

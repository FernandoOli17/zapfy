'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Copy, Loader2, MailWarning, Send } from 'lucide-react';
import { Button, Input, Label } from '@zapai/ui';

import { inviteTeamMember, type InviteResult } from './actions';

export function InviteForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'AGENT'>('AGENT');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<InviteResult, { status: 'ok' }> | null>(null);
  const [copied, setCopied] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    startTransition(async () => {
      const r = await inviteTeamMember({ email, role });
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      setResult(r);
      setEmail('');
    });
  }

  async function copyUrl() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* */
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Convite criado pra {result.email}</p>
            {result.emailDelivered ? (
              <p className="mt-1 text-muted-foreground">
                E-mail enviado. Link expira em 7 dias.
              </p>
            ) : (
              <p className="mt-1 inline-flex items-center gap-1 text-yellow-500">
                <MailWarning className="h-3.5 w-3.5" />
                E-mail não foi enviado (Resend não configurado). Copie o link abaixo e
                mande manualmente.
              </p>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Link do convite
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate font-mono text-xs">{result.inviteUrl}</code>
            <button
              type="button"
              onClick={copyUrl}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border/60 px-2 text-xs hover:bg-secondary"
            >
              {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
        <Button type="button" variant="ghost" onClick={() => setResult(null)}>
          Convidar outra pessoa
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div>
          <Label htmlFor="invite-email">E-mail</Label>
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colega@empresa.com"
            className="mt-1.5 h-10"
          />
        </div>
        <div>
          <Label htmlFor="invite-role">Papel</Label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'ADMIN' | 'AGENT')}
            className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="AGENT">Atendente</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        <strong>Atendente</strong> atende inbox.{' '}
        <strong>Admin</strong> gerencia agente, número, API keys e webhooks.
        Owner só pode ser quem criou o workspace.
      </p>
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" disabled={pending || !email}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando…
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Enviar convite
          </>
        )}
      </Button>
    </form>
  );
}

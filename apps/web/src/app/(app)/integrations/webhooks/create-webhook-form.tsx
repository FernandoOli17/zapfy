'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { Button, Input, Label, cn } from '@zapai/ui';

import { createWebhook } from './actions';
import { OUTGOING_EVENT_DESCRIPTIONS, OUTGOING_EVENT_NAMES } from '@/lib/webhooks-outgoing';

export function CreateWebhookForm() {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['message.received', 'message.sent']);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function toggle(name: string) {
    setEvents((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (events.length === 0) {
      setError('Selecione pelo menos 1 evento');
      return;
    }
    startTransition(async () => {
      const r = await createWebhook({ url, events: events as never });
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      setCreated({ secret: r.secret });
      setUrl('');
    });
  }

  async function copySecret() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* */
    }
  }

  if (created) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Webhook criado.</p>
            <p className="mt-1 text-muted-foreground">
              Copie o secret agora — não vamos mostrar de novo. Use pra validar a assinatura.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 p-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate font-mono text-sm">{created.secret}</code>
            <button
              type="button"
              onClick={copySecret}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border/60 px-2 text-xs hover:bg-secondary"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
        <Button type="button" variant="ghost" onClick={() => setCreated(null)}>
          Criar outro
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <Label htmlFor="url">URL HTTPS</Label>
        <Input
          id="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.suaempresa.com/webhooks/zapai"
          className="mt-1.5 h-10 font-mono"
        />
      </div>
      <div>
        <Label>Eventos</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Selecione os eventos que esse endpoint deve receber.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {OUTGOING_EVENT_NAMES.map((ev) => {
            const active = events.includes(ev);
            return (
              <button
                key={ev}
                type="button"
                onClick={() => toggle(ev)}
                className={cn(
                  'flex items-start gap-2 rounded-lg border bg-background/40 p-3 text-left text-sm transition-colors',
                  active ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:border-border',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                  )}
                >
                  {active && <CheckCircle2 className="h-3 w-3" />}
                </span>
                <span>
                  <code className="font-mono text-xs">{ev}</code>
                  <span className="block text-[11px] text-muted-foreground">
                    {OUTGOING_EVENT_DESCRIPTIONS[ev]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" className="h-10" disabled={pending || !url}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Criando…
          </>
        ) : (
          'Criar webhook'
        )}
      </Button>
    </form>
  );
}

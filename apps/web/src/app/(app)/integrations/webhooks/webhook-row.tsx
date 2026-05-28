'use client';

import { useTransition } from 'react';
import { Loader2, Power, PowerOff, Trash2 } from 'lucide-react';
import { Button } from '@zapfy/ui';

import { deleteWebhook, toggleWebhook } from './actions';

interface WebhookRowProps {
  webhook: {
    id: string;
    url: string;
    events: string[];
    active: boolean;
    createdAt: string;
  };
}

export function WebhookRow({ webhook }: WebhookRowProps) {
  const [pending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      await toggleWebhook(webhook.id);
    });
  }

  function onDelete() {
    if (!confirm(`Apagar webhook ${webhook.url}?`)) return;
    startTransition(async () => {
      await deleteWebhook(webhook.id);
    });
  }

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <code className="truncate font-mono text-sm">{webhook.url}</code>
            <span
              className={
                webhook.active
                  ? 'rounded-full border border-primary/40 bg-primary/10 px-1.5 text-[10px] uppercase tracking-widest text-primary'
                  : 'rounded-full border border-border/60 bg-secondary/40 px-1.5 text-[10px] uppercase tracking-widest text-muted-foreground'
              }
            >
              {webhook.active ? 'ativo' : 'pausado'}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Criado em {new Date(webhook.createdAt).toLocaleString('pt-BR')}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {webhook.events.map((e) => (
              <span
                key={e}
                className="rounded-full border border-border/60 bg-background/40 px-1.5 text-[10px] text-muted-foreground"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggle}
            disabled={pending}
            title={webhook.active ? 'Pausar' : 'Ativar'}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : webhook.active ? (
              <PowerOff className="h-3.5 w-3.5" />
            ) : (
              <Power className="h-3.5 w-3.5 text-primary" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

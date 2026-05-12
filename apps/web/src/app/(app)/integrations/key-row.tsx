'use client';

import { useTransition } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button, cn } from '@zapai/ui';

import { revokeApiKey } from './actions';

interface KeyRowProps {
  apiKey: {
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    lastUsedAt: string | null;
    expiresAt: string | null;
    revokedAt: string | null;
    createdAt: string;
  };
}

export function KeyRow({ apiKey }: KeyRowProps) {
  const [pending, startTransition] = useTransition();

  function onRevoke() {
    if (!confirm(`Revogar a chave "${apiKey.name}"? Não dá pra desfazer.`)) return;
    startTransition(async () => {
      await revokeApiKey(apiKey.id);
    });
  }

  const isRevoked = Boolean(apiKey.revokedAt);
  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date();
  const isActive = !isRevoked && !isExpired;

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{apiKey.name}</p>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest',
                isActive
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : isRevoked
                    ? 'border-destructive/40 bg-destructive/5 text-destructive'
                    : 'border-border/60 bg-secondary/40 text-muted-foreground',
              )}
            >
              {isRevoked ? 'Revogada' : isExpired ? 'Expirada' : 'Ativa'}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {apiKey.prefix}••••••••••••••
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {apiKey.scopes.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {isActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRevoke}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
          >
            {pending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Revogar
          </Button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
        <KV label="Criada" value={new Date(apiKey.createdAt).toLocaleString('pt-BR')} />
        <KV
          label="Último uso"
          value={apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString('pt-BR') : 'nunca'}
        />
        <KV
          label="Expira"
          value={apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleString('pt-BR') : 'nunca'}
        />
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest">{label}</p>
      <p className="text-foreground/80">{value}</p>
    </div>
  );
}

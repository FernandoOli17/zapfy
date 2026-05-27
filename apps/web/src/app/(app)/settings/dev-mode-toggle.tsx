'use client';

import { useRef, useState, useTransition } from 'react';
import { AlertTriangle, Code2, Loader2 } from 'lucide-react';
import { cn } from '@zapai/ui';

import { toggleDeveloperMode } from './actions';

export function DevModeToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Mutex ref-based — cobre o gap entre `startTransition` chamado e React
  // re-renderizar com `pending=true` (que desabilitaria o input). Sem isso,
  // cliques rápidos podem disparar 2 server actions com `previous` stale.
  const inFlightRef = useRef(false);

  function onToggle(checked: boolean) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);
    const previous = enabled;
    setEnabled(checked); // optimistic
    startTransition(async () => {
      try {
        const r = await toggleDeveloperMode({ enabled: checked });
        if (r.status === 'error') {
          setEnabled(previous);
          setError(r.error);
        }
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            <Code2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Modo desenvolvedor</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Libera <code className="rounded bg-muted px-1">/developer</code> com flow editor
              visual (drag &amp; drop), criação de tools HTTP custom (HMAC), e editor raw do
              system prompt. Bypassa o Forge.
            </p>
          </div>
        </div>
        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={pending}
            className="peer sr-only"
            aria-label="Modo desenvolvedor"
          />
          <span
            className={cn(
              'block h-6 w-11 rounded-full transition-colors',
              enabled ? 'bg-primary' : 'bg-muted',
              pending && 'opacity-70',
            )}
          />
          <span
            className={cn(
              'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform',
              enabled && 'translate-x-5',
            )}
          />
          {pending && (
            <Loader2 className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </label>
      </div>

      {enabled && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Você é responsável pelas mudanças feitas em <code className="rounded bg-amber-500/10 px-1">/developer</code>.
            Customizações ruins podem quebrar respostas do agente — versões antigas ficam salvas pra rollback.
          </span>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

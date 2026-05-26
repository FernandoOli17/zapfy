'use client';

import { useState, useTransition } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button, Input } from '@zapai/ui';

import { deleteWorkspace } from './actions';

export function DangerZone({ slug }: { slug: string }) {
  const [confirmation, setConfirmation] = useState('');
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    setError(null);
    if (confirmation !== slug) {
      setError(`Digite o slug "${slug}" exatamente pra confirmar.`);
      return;
    }
    if (
      !confirm(
        'Última chance. Apagar o workspace é IRREVERSÍVEL. Tem certeza absoluta?',
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteWorkspace(confirmation);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao apagar');
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Pra confirmar, digite <code className="rounded bg-destructive/15 px-1 py-0.5 text-destructive font-mono">{slug}</code>
      </p>
      <div className="flex gap-2">
        <Input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder={slug}
          className="h-10 flex-1"
          disabled={busy}
        />
        <Button
          type="button"
          variant="destructive"
          onClick={onDelete}
          disabled={busy || confirmation !== slug}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Apagando…
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Apagar workspace
            </>
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

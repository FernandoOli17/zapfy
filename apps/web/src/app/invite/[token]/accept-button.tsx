'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@zapai/ui';

import { acceptInviteAction } from './actions';

export function AcceptButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const r = await acceptInviteAction(token);
      if (r && r.status === 'error') {
        setError(r.error);
      }
      // se status === 'ok' o action chama redirect e a navegação acontece
    });
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
      <p className="font-medium">Tudo pronto</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Clica aceitar pra entrar no workspace e ir direto pro dashboard.
      </p>
      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button
        type="button"
        size="lg"
        onClick={onAccept}
        disabled={pending}
        className="mt-4 h-11 px-6"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Entrando…
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Aceitar e entrar
          </>
        )}
      </Button>
    </div>
  );
}

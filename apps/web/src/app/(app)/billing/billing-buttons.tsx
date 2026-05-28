'use client';

import { useState, useTransition } from 'react';
import { ArrowRight, ExternalLink, Loader2 } from 'lucide-react';
import { Button, useToast } from '@zapfy/ui';
import type { PlanId } from '@zapfy/shared';

import { createCheckoutSession, createPortalSession } from './actions';

export function ChangePlanButtons({
  plan,
  disabled,
  isCurrent,
}: {
  plan: PlanId;
  disabled: boolean;
  isCurrent: boolean;
}) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  function onUpgrade() {
    setError(null);
    startTransition(async () => {
      const r = await createCheckoutSession({ plan });
      if (r.status === 'error') {
        setError(r.error);
        push({ type: 'error', message: r.error });
        return;
      }
      window.location.href = r.url;
    });
  }

  if (isCurrent) {
    return (
      <Button type="button" className="mt-7 w-full" variant="outline" disabled>
        Plano atual
      </Button>
    );
  }

  return (
    <div className="mt-7 space-y-2">
      <Button type="button" className="w-full" onClick={onUpgrade} disabled={busy || disabled}>
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecionando…
          </>
        ) : (
          <>
            Mudar pra esse plano
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      {disabled && !error && (
        <p className="text-xs text-muted-foreground">Indisponível ainda.</p>
      )}
    </div>
  );
}

export function ManageSubscriptionButton() {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  function onClick() {
    setError(null);
    startTransition(async () => {
      const r = await createPortalSession();
      if (r.status === 'error') {
        setError(r.error);
        push({ type: 'error', message: r.error });
        return;
      }
      window.location.href = r.url;
    });
  }

  return (
    <div>
      <Button type="button" variant="outline" onClick={onClick} disabled={busy}>
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="mr-2 h-4 w-4" />
        )}
        Gerenciar no Stripe
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

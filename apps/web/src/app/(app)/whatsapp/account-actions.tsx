'use client';

import { useState, useTransition } from 'react';
import { Loader2, PlugZap, Unplug } from 'lucide-react';
import type { WhatsAppStatus } from '@zapai/db';
import { Button } from '@zapai/ui';

import { disconnectWhatsAppAction, testWhatsAppConnectionAction } from './actions';

export function AccountActions({
  accountId,
  status,
}: {
  accountId: string;
  status: WhatsAppStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onTest() {
    setError(null);
    startTransition(async () => {
      const r = await testWhatsAppConnectionAction(accountId);
      if (r.status === 'error') setError(r.error);
    });
  }

  function onDisconnect() {
    if (!confirm('Desconectar esse número? O agente para de receber mensagens.')) return;
    setError(null);
    startTransition(async () => {
      const r = await disconnectWhatsAppAction(accountId);
      if (r.status === 'error') setError(r.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onTest} disabled={pending}>
        {pending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <PlugZap className="mr-1.5 h-3.5 w-3.5" />
        )}
        Testar
      </Button>
      {status !== 'DISCONNECTED' && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDisconnect}
          disabled={pending}
          className="text-muted-foreground hover:text-destructive"
        >
          <Unplug className="mr-1.5 h-3.5 w-3.5" />
          Desconectar
        </Button>
      )}
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}

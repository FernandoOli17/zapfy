'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import { Button, useToast } from '@zapfy/ui';

import { changeQuoteStatus } from './actions';

export function MarkAcceptedRejected({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  function onClick(status: 'ACCEPTED' | 'REJECTED') {
    const label = status === 'ACCEPTED' ? 'aceito' : 'recusado';
    if (!confirm(`Marcar como ${label}?`)) return;
    startTransition(async () => {
      const r = await changeQuoteStatus({ quoteId, status });
      if (r.status === 'ok') {
        push({ type: 'success', message: `Marcado como ${label}` });
        router.refresh();
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => onClick('ACCEPTED')}
      >
        {pending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="mr-1.5 h-3.5 w-3.5" />
        )}
        Cliente aceitou
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => onClick('REJECTED')}
      >
        <X className="mr-1.5 h-3.5 w-3.5" />
        Recusado
      </Button>
    </div>
  );
}

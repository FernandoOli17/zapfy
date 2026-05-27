'use client';

import { useTransition } from 'react';
import { Eye, X } from 'lucide-react';

import { stopImpersonating } from './admin/actions';

export function ImpersonateBanner({ workspaceName }: { workspaceName: string }) {
  const [pending, startTransition] = useTransition();

  function onStop() {
    startTransition(async () => {
      await stopImpersonating();
      // Reload pra refletir mudança em todas as queries server-side
      window.location.href = '/admin';
    });
  }

  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-200"
      role="alert"
    >
      <div className="flex items-center gap-2 truncate">
        <Eye className="h-4 w-4 shrink-0" />
        <span className="truncate">
          Impersonando <strong className="font-semibold">{workspaceName}</strong>. Toda ação fica
          auditada.
        </span>
      </div>
      <button
        type="button"
        onClick={onStop}
        disabled={pending}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-600/40 bg-amber-500/20 px-2 py-1 text-xs font-medium hover:bg-amber-500/30 disabled:opacity-50"
      >
        <X className="h-3 w-3" />
        Parar
      </button>
    </div>
  );
}

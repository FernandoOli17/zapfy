'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ChevronDown } from 'lucide-react';
import { Button, useToast } from '@zapai/ui';
import type { PlanId } from '@zapai/shared';

import { forceUpgradeWorkspace, impersonateWorkspace } from './actions';

export function ImpersonateButton({
  workspaceId,
  disabled,
}: {
  workspaceId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (disabled) return;
    startTransition(async () => {
      const r = await impersonateWorkspace(workspaceId);
      if (r.status === 'ok') {
        push({ type: 'success', message: 'Impersonando workspace' });
        router.push('/dashboard');
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={disabled ? 'ghost' : 'outline'}
      disabled={disabled || pending}
      onClick={onClick}
      title={disabled ? 'Já impersonando' : 'Impersonar'}
    >
      <Eye className="h-3 w-3" />
    </Button>
  );
}

export function ForcePlanButton({
  workspaceId,
  currentPlan,
}: {
  workspaceId: string;
  currentPlan: PlanId;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onPick(p: PlanId) {
    setOpen(false);
    if (p === currentPlan) return;
    if (!confirm(`Forçar plano ${p}? Bypassa Stripe.`)) return;
    startTransition(async () => {
      const r = await forceUpgradeWorkspace(workspaceId, p);
      if (r.status === 'ok') {
        push({ type: 'success', message: `Plano forçado pra ${p}` });
        router.refresh();
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => setOpen((s) => !s)}
      >
        Plano <ChevronDown className="ml-0.5 h-3 w-3" />
      </Button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-32 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {(['STARTER', 'PRO', 'PREMIUM'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted"
            >
              {p}
              {p === currentPlan && <span className="ml-1 text-muted-foreground">(atual)</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

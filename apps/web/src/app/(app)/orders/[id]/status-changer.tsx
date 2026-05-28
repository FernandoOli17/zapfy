'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import type { OrderStatus } from '@zapfy/db';
import { Button, cn, useToast } from '@zapfy/ui';

import { useDropdown } from '@/components/hooks/use-dropdown';

import { updateOrderStatus } from './actions';

const STATUS_FLOW: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'aguardando',
  CONFIRMED: 'confirmar',
  PREPARING: 'preparar',
  OUT_FOR_DELIVERY: 'sair p/ entrega',
  DELIVERED: 'entregue',
  CANCELLED: 'cancelar',
  REFUNDED: 'reembolsar',
};

export function StatusChanger({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();

  function onChange(next: OrderStatus, requireConfirm = false) {
    if (next === currentStatus) {
      setOpen(false);
      return;
    }
    if (requireConfirm && !confirm(`Mudar pra ${STATUS_LABEL[next]}?`)) {
      setOpen(false);
      return;
    }
    setOpen(false);
    startTransition(async () => {
      const r = await updateOrderStatus({ orderId, status: next });
      if (r.status === 'ok') {
        push({ type: 'success', message: `Status: ${STATUS_LABEL[next]}` });
        router.refresh();
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  // Próximo passo na esteira "feliz"
  const currentIdx = STATUS_FLOW.indexOf(currentStatus);
  const nextHappy =
    currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1
      ? STATUS_FLOW[currentIdx + 1]
      : null;

  return (
    <div className="flex items-center gap-2">
      {nextHappy && (
        <Button type="button" size="sm" disabled={pending} onClick={() => onChange(nextHappy)}>
          {pending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          )}
          Avançar pra "{STATUS_LABEL[nextHappy]}"
        </Button>
      )}

      <div className="relative" ref={ref}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen(!open)}
        >
          Mudar status <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-md border border-border bg-popover shadow-md"
          >
            {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => {
              const destructive = s === 'CANCELLED' || s === 'REFUNDED';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange(s, destructive)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-muted',
                    destructive && 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {STATUS_LABEL[s]}
                  {s === currentStatus && <span className="text-muted-foreground">(atual)</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

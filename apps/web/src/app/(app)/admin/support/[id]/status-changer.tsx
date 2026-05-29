'use client';

import { useTransition } from 'react';

import { adminSetStatusAction } from './actions';
import type { SupportTicketStatus } from '@zapfy/db';

const OPTIONS: { value: SupportTicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Aberto' },
  { value: 'AWAITING_STAFF', label: 'Com a gente' },
  { value: 'AWAITING_USER', label: 'Aguarda user' },
  { value: 'RESOLVED', label: 'Resolvido' },
  { value: 'CLOSED', label: 'Fechado' },
];

export function StatusChanger({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: SupportTicketStatus;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as SupportTicketStatus;
    if (status === currentStatus) return;
    startTransition(async () => {
      await adminSetStatusAction({ ticketId, status });
    });
  }

  return (
    <select
      value={currentStatus}
      onChange={onChange}
      disabled={pending}
      className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium outline-none transition-colors hover:border-primary/30 disabled:opacity-50"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

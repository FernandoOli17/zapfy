import { type SupportTicketStatus } from '@zapfy/db';

const LABELS: Record<SupportTicketStatus, { label: string; cls: string }> = {
  OPEN: { label: 'Aberto', cls: 'bg-primary/15 text-primary' },
  AWAITING_STAFF: { label: 'Com a gente', cls: 'bg-primary/15 text-primary' },
  AWAITING_USER: { label: 'Aguarda você', cls: 'bg-amber-500/15 text-amber-400' },
  RESOLVED: { label: 'Resolvido', cls: 'bg-emerald-500/15 text-emerald-400' },
  CLOSED: { label: 'Fechado', cls: 'bg-zinc-500/15 text-zinc-400' },
};

export function StatusBadge({ status }: { status: SupportTicketStatus }) {
  const { label, cls } = LABELS[status] ?? LABELS.OPEN;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

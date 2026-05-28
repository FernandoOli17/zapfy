'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { BroadcastStatus } from '@zapfy/db';

import { cancelBroadcast, deleteBroadcast, launchBroadcast } from './actions';

export interface BroadcastRowData {
  id: string;
  name: string;
  status: BroadcastStatus;
  templateName: string;
  templateLanguage: string;
  recipientCount: number;
  scheduledFor: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<BroadcastStatus, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  RUNNING: 'Rodando',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
  FAILED: 'Falhou',
};

const STATUS_TONE: Record<BroadcastStatus, string> = {
  DRAFT: 'text-muted-foreground border-border/60 bg-muted/30',
  SCHEDULED: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  RUNNING: 'text-primary border-primary/40 bg-primary/10',
  COMPLETED: 'text-primary border-primary/30 bg-primary/5',
  CANCELED: 'text-muted-foreground border-border/60 bg-muted/30',
  FAILED: 'text-destructive border-destructive/40 bg-destructive/10',
};

export function BroadcastRow({ broadcast }: { broadcast: BroadcastRowData }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const canLaunch = broadcast.status === 'DRAFT' || broadcast.status === 'SCHEDULED';
  const canCancel = broadcast.status === 'SCHEDULED' || broadcast.status === 'RUNNING';
  const canDelete = broadcast.status !== 'RUNNING';

  function onLaunch() {
    if (!confirm(`Lançar broadcast "${broadcast.name}" pra ${broadcast.recipientCount} contatos?`)) return;
    startTransition(async () => {
      const r = await launchBroadcast(broadcast.id);
      if (r.status === 'error') alert(r.error);
      else router.refresh();
    });
  }

  function onCancel() {
    if (!confirm('Cancelar este broadcast?')) return;
    startTransition(async () => {
      const r = await cancelBroadcast(broadcast.id);
      if (r.status === 'error') alert(r.error);
      else router.refresh();
    });
  }

  function onDelete() {
    if (!confirm(`Deletar broadcast "${broadcast.name}"? Isso não pode ser desfeito.`)) return;
    startTransition(async () => {
      const r = await deleteBroadcast(broadcast.id);
      if (r.status === 'error') alert(r.error);
      else router.refresh();
    });
  }

  const dateLabel = formatDate(broadcast);

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/automations/broadcasts/${broadcast.id}`}
            className="truncate font-medium hover:underline"
          >
            {broadcast.name}
          </Link>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${STATUS_TONE[broadcast.status]}`}
          >
            <StatusIcon status={broadcast.status} />
            {STATUS_LABEL[broadcast.status]}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Template <code className="font-mono">{broadcast.templateName}</code>
          {' · '}
          {broadcast.recipientCount} destinatário{broadcast.recipientCount === 1 ? '' : 's'}
          {dateLabel ? ` · ${dateLabel}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canLaunch && (
          <button
            type="button"
            onClick={onLaunch}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-3 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Lançar
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border/60 px-3 text-xs hover:bg-secondary disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancelar
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-destructive/40 px-3 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
            aria-label="Deletar broadcast"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: BroadcastStatus }) {
  if (status === 'RUNNING') return <Loader2 className="h-3 w-3 animate-spin" />;
  if (status === 'COMPLETED') return <CheckCircle2 className="h-3 w-3" />;
  if (status === 'SCHEDULED') return <Clock className="h-3 w-3" />;
  if (status === 'CANCELED' || status === 'FAILED') return <XCircle className="h-3 w-3" />;
  return null;
}

function formatDate(b: BroadcastRowData): string | null {
  if (b.finishedAt) return `terminou em ${fmt(b.finishedAt)}`;
  if (b.startedAt) return `iniciou em ${fmt(b.startedAt)}`;
  if (b.scheduledFor) return `agendado pra ${fmt(b.scheduledFor)}`;
  return `criado em ${fmt(b.createdAt)}`;
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

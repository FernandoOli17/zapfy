import Link from 'next/link';
import { ArrowRight, FileText, MessageSquareText, Plus } from 'lucide-react';
import { prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { TemplateRow } from './template-row';
import { AutomationsTabs } from '../tabs';

export const metadata = { title: 'Templates HSM' };
export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const { workspace } = await requireWorkspace();
  const templates = await prisma.messageTemplate.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' },
  });

  const counts = {
    APPROVED: templates.filter((t) => t.status === 'APPROVED').length,
    SUBMITTED: templates.filter((t) => t.status === 'SUBMITTED').length,
    REJECTED: templates.filter((t) => t.status === 'REJECTED').length,
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Automações</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Templates HSM
          </h1>
        </div>
        <Link
          href="/automations/templates/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo template
        </Link>
      </div>

      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Templates HSM são mensagens pré-aprovadas pela Meta que você pode enviar ativamente —
        fora da janela de 24h, pra reativação, lembrete ou marketing. Só envia depois de APPROVED.
      </p>

      <div className="mt-5">
        <AutomationsTabs current="templates" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total" value={templates.length} icon={FileText} />
        <Stat label="Aprovados" value={counts.APPROVED} accent="emerald" />
        <Stat label="Em análise" value={counts.SUBMITTED} accent="amber" />
        <Stat label="Rejeitados" value={counts.REJECTED} accent="destructive" />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-tight">Seus templates</h2>
        {templates.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MessageSquareText className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-4 font-medium">Sem templates ainda.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie um template e a Meta aprovará em geralmente 1-24h. Depois você pode usar em
              broadcasts e mensagens ativas.
            </p>
            <Link
              href="/automations/templates/new"
              className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Criar primeiro template
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {templates.map((t) => (
              <li key={t.id}>
                <TemplateRow
                  template={{
                    id: t.id,
                    name: t.name,
                    language: t.language,
                    category: t.category,
                    status: t.status,
                    submittedAt: t.submittedAt?.toISOString() ?? null,
                    approvedAt: t.approvedAt?.toISOString() ?? null,
                    rejectionReason: t.rejectionReason,
                    createdAt: t.createdAt.toISOString(),
                    metaTemplateId: t.metaTemplateId,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: number;
  accent?: 'emerald' | 'amber' | 'destructive';
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const valueClass =
    accent === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : accent === 'destructive'
          ? 'text-destructive'
          : '';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

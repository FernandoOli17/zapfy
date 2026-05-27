import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Building2, ScrollText } from 'lucide-react';

import { prisma } from '@zapai/db';
import { requireWorkspace } from '@/lib/inbox';

import { DangerZone } from './danger-zone';
import { DevModeToggle } from './dev-mode-toggle';
import { WorkspaceForm } from './workspace-form';

export const metadata = { title: 'Configurações' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { workspace, member } = await requireWorkspace();
  const isOwner = member.role === 'OWNER';

  // Fetch fresh dev-mode flag (requireWorkspace pode estar com cache)
  const devModeRow = await prisma.workspace.findUnique({
    where: { id: workspace.id },
    select: { developerModeEnabled: true },
  });
  const devModeEnabled = devModeRow?.developerModeEnabled ?? false;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identidade do workspace, horários, e o botão vermelho.
        </p>
      </div>

      {!isOwner && (
        <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
          Apenas o Owner pode editar essas configurações. Você é{' '}
          <strong className="capitalize">{member.role.toLowerCase()}</strong>.
        </div>
      )}

      <section className="mt-6 rounded-xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Identidade</h2>
            <p className="text-xs text-muted-foreground">
              Nome aparece no dashboard. Slug aparece nas URLs públicas.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <WorkspaceForm
            workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug }}
            isOwner={isOwner}
          />
        </div>
      </section>

      {isOwner && (
        <section className="mt-4">
          <DevModeToggle initialEnabled={devModeEnabled} />
        </section>
      )}

      <section className="mt-4 rounded-xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ScrollText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Audit log</h2>
            <p className="text-xs text-muted-foreground">
              Quem mexeu em quê. Útil pra compliance LGPD e investigação. Retenção 12 meses.
            </p>
          </div>
        </div>
        <Link
          href="/settings/audit-log"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
        >
          Ver registros completos <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {isOwner && (
        <section className="mt-4 rounded-xl border border-destructive/30 bg-destructive/[0.03] p-6 md:p-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-destructive">
                Danger zone
              </h2>
              <p className="text-xs text-destructive/80">
                Apagar o workspace é permanente. Sem volta.
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Apaga TODOS os dados: conversas, contatos, agentes, integrações, faturamento.
          </p>
          <div className="mt-5">
            <DangerZone slug={workspace.slug} />
          </div>
        </section>
      )}
    </div>
  );
}

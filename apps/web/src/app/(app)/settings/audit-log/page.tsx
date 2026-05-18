import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  KeyRound,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

export const metadata = { title: 'Audit log' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

interface PageProps {
  searchParams: Promise<{ filter?: string; cursor?: string }>;
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  const { workspace } = await requireWorkspace();
  const params = await searchParams;
  const filter = params.filter ?? '';
  const cursor = params.cursor ?? null;

  const entries = await prisma.auditLog.findMany({
    where: {
      workspaceId: workspace.id,
      ...(filter ? { action: { contains: filter, mode: 'insensitive' } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = entries.length > PAGE_SIZE;
  const visible = hasMore ? entries.slice(0, PAGE_SIZE) : entries;
  const nextCursor = hasMore ? visible[visible.length - 1]?.id : null;

  return (
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Configurações
        </Link>

        <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Audit log</p>
        <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
          Tudo que{' '}
          <span className="font-serif italic font-normal text-primary">aconteceu.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Registro de todas as ações sensíveis do workspace. Útil pra compliance LGPD e pra
          investigar &quot;quem mexeu em quê&quot;. Retenção de 12 meses.
        </p>

        <form className="mt-8 flex gap-2">
          <input
            type="search"
            name="filter"
            defaultValue={filter}
            placeholder="Filtrar por action (ex: apikey, lgpd, conversation)"
            className="h-10 flex-1 rounded-md border border-border/60 bg-background/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Filtrar
          </button>
        </form>

        {visible.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            Nada por aqui{filter ? ` com o filtro "${filter}"` : ''} ainda.
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
            {visible.map((e) => (
              <li key={e.id} className="p-5">
                <details className="group">
                  <summary className="flex cursor-pointer items-start gap-3">
                    <ActionIcon action={e.action} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <code className="font-mono">{e.action}</code>
                        {e.targetType && (
                          <span className="text-xs text-muted-foreground">
                            → {e.targetType}
                            {e.targetId ? ` (${e.targetId.slice(0, 8)}…)` : ''}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {e.user
                          ? `${e.user.name ?? e.user.email}`
                          : 'sistema/api'}{' '}
                        · {new Date(e.createdAt).toLocaleString('pt-BR')}
                        {e.ipAddress ? ` · ${e.ipAddress}` : ''}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 flex-none text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  {e.metadata !== null && e.metadata !== undefined && (
                    <pre className="mt-3 overflow-x-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] leading-relaxed text-foreground/80">
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  )}
                </details>
              </li>
            ))}
          </ul>
        )}

        {(hasMore || cursor) && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando {visible.length} entradas
            </p>
            <div className="flex gap-2">
              {cursor && (
                <Link
                  href={`/settings/audit-log${filter ? `?filter=${encodeURIComponent(filter)}` : ''}`}
                  className="rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-secondary"
                >
                  Início
                </Link>
              )}
              {hasMore && nextCursor && (
                <Link
                  href={`/settings/audit-log?cursor=${nextCursor}${filter ? `&filter=${encodeURIComponent(filter)}` : ''}`}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
                >
                  Próxima página
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionIcon({ action }: { action: string }) {
  let Icon: React.ComponentType<{ className?: string }> = ShieldAlert;
  let bg = 'bg-secondary/40 text-muted-foreground';
  if (action.startsWith('apikey')) {
    Icon = KeyRound;
    bg = 'bg-primary/10 text-primary';
  } else if (action.startsWith('lgpd')) {
    Icon = ShieldAlert;
    bg = 'bg-yellow-500/10 text-yellow-500';
  } else if (action.startsWith('conversation')) {
    Icon = Users;
    bg = 'bg-primary/10 text-primary';
  } else if (action.includes('delete')) {
    Icon = Trash2;
    bg = 'bg-destructive/10 text-destructive';
  } else if (action.includes('publish') || action.includes('create')) {
    Icon = CheckCircle2;
    bg = 'bg-primary/10 text-primary';
  } else if (action.includes('subscription')) {
    Icon = Sparkles;
    bg = 'bg-primary/10 text-primary';
  }
  return (
    <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-md ${bg}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

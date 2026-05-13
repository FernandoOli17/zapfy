import Link from 'next/link';
import { ArrowRight, FileText, MessageSquareText } from 'lucide-react';
import { prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { TemplateRow } from './template-row';

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
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Automations · Templates HSM
            </p>
            <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
              Mensagens fora da{' '}
              <span className="font-serif italic font-normal text-primary">janela.</span>
            </h1>
          </div>
          <Link
            href="/automations/templates/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" />
            Novo template
          </Link>
        </div>

        <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
          Templates HSM são mensagens pré-aprovadas pela Meta que você pode enviar
          ATIVAMENTE — fora da janela de 24h, pra reativação, lembrete ou marketing.
          Só envia depois de APPROVED.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Total" value={templates.length} />
          <Stat label="Aprovados" value={counts.APPROVED} accent />
          <Stat label="Em análise" value={counts.SUBMITTED} />
          <Stat label="Rejeitados" value={counts.REJECTED} />
        </div>

        <section className="mt-12">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">
            Seus templates
          </h2>
          {templates.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border/60 p-10 text-center">
              <MessageSquareText className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-4 font-medium">Sem templates ainda.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie um template e a Meta aprovará em geralmente 1-24h. Depois você pode usar
                em broadcasts e mensagens ativas.
              </p>
              <Link
                href="/automations/templates/new"
                className="mt-6 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Criar primeiro template <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
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
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl font-medium tabular-nums tracking-tight ${accent ? 'text-primary' : ''}`}>
        {value}
      </p>
    </div>
  );
}

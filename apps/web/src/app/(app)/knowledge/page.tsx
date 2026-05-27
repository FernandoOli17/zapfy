import { BookOpen, FileText, Globe, Pencil } from 'lucide-react';
import { prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { AddManualForm, AddUrlForm } from './forms';
import { DocumentRow } from './document-row';

export const metadata = { title: 'Base de conhecimento' };
export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const { workspace } = await requireWorkspace();
  const docs = await prisma.knowledgeDocument.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">RAG · informações do agente</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Base de conhecimento
          </h1>
        </div>
        <div className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          Indexação RAG ativa
        </div>
      </div>

      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Adicione URLs e textos. O agente IA consulta essa base via RAG híbrido (vetor +
        busca textual) sempre que precisar de contexto. Cada documento é dividido em
        chunks e indexado automaticamente — leva alguns segundos por página.
      </p>

      {/* Add forms */}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card icon={Globe} title="URL pública">
          <p className="mt-1.5 text-xs text-muted-foreground">
            FAQ, página de produto, política de troca. A gente baixa o HTML e extrai texto.
          </p>
          <div className="mt-4">
            <AddUrlForm />
          </div>
        </Card>
        <Card icon={Pencil} title="Texto manual">
          <p className="mt-1.5 text-xs text-muted-foreground">
            Cole um texto — anotação interna, instrução pro agente, política específica.
          </p>
          <div className="mt-4">
            <AddManualForm />
          </div>
        </Card>
      </section>

      {/* Docs list */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">
            Documentos
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({docs.length})
            </span>
          </h2>
        </div>

        {docs.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-4 font-medium">Nenhum documento ainda.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Comece adicionando uma URL do seu site ou um texto manual.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {docs.map((d) => (
              <li key={d.id}>
                <DocumentRow
                  doc={{
                    id: d.id,
                    title: d.title,
                    source: d.source,
                    sourceUrl: d.sourceUrl,
                    status: d.status,
                    chunksCount: d._count.chunks,
                    createdAt: d.createdAt.toISOString(),
                    errorMessage: d.errorMessage,
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

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

void FileText;

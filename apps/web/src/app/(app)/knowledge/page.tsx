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
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Conhecimento</p>
        <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
          O que o agente{' '}
          <span className="font-serif italic font-normal text-primary">sabe.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
          Adicione URLs e textos. Quando o agente IA não souber responder direto, ele consulta
          essa base via RAG. Indexação semântica entra na Fase 5 — por ora, armazenamos o conteúdo
          em formato pronto pra indexar.
        </p>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <Card icon={Globe} title="URL pública">
            <p className="mt-2 text-sm text-muted-foreground">
              FAQ, página de produto, política de troca. A gente baixa o HTML, extrai texto.
            </p>
            <div className="mt-5">
              <AddUrlForm />
            </div>
          </Card>
          <Card icon={Pencil} title="Texto manual">
            <p className="mt-2 text-sm text-muted-foreground">
              Cola um texto direto — anotação interna, instrução pro agente, política específica.
            </p>
            <div className="mt-5">
              <AddManualForm />
            </div>
          </Card>
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground">
              Documentos ({docs.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              Indexação RAG · em breve
            </span>
          </div>

          {docs.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border/60 p-10 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-4 font-medium">Nenhum documento ainda.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece adicionando uma URL do seu site ou um texto manual.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
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
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

void FileText;

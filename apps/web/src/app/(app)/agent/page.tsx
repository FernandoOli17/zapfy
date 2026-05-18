import Link from 'next/link';
import { ArrowRight, Bot, GitBranch, Sparkles } from 'lucide-react';
import { prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { VersionRow } from './version-row';

export const metadata = { title: 'Agente' };
export const dynamic = 'force-dynamic';

export default async function AgentPage() {
  const { workspace, member } = await requireWorkspace();
  const isAdmin = member.role === 'OWNER' || member.role === 'ADMIN';

  const agent = await prisma.agent.findFirst({
    where: { workspaceId: workspace.id },
    include: {
      currentVersion: true,
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: {
          forgeSession: {
            select: { id: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!agent) {
    return (
      <div className="relative overflow-hidden">
        <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-24">
          <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
            <Bot className="mx-auto h-12 w-12 text-muted-foreground/60" />
            <h2 className="mt-6 text-3xl font-medium tracking-tight md:text-4xl">
              Sem agente ainda
            </h2>
            <p className="mt-3 text-muted-foreground">
              Crie seu primeiro agente conversando com o Forge.
            </p>
            <Link
              href="/forge"
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" />
              Abrir o Forge
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const current = agent.currentVersion;
  const personality =
    current?.personality && typeof current.personality === 'object'
      ? (current.personality as Record<string, unknown>)
      : null;
  const handoff =
    current?.handoffRules && typeof current.handoffRules === 'object'
      ? (current.handoffRules as Record<string, unknown>)
      : null;

  return (
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Agente</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
            {agent.name}{' '}
            <span className="font-serif italic font-normal text-primary">
              {current ? `v${current.versionNumber}` : '—'}
            </span>
          </h1>
          <Link
            href="/forge"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border/60 bg-background/40 px-4 text-sm hover:bg-secondary"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Refinar no Forge
          </Link>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <span>Vertical: <span className="text-foreground">{agent.vertical}</span></span>
          <span>·</span>
          <span>{agent.versions.length} versão{agent.versions.length === 1 ? '' : 'ões'}</span>
        </div>

        {current && (
          <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8">
            <p className="text-xs uppercase tracking-widest text-primary">Versão ativa</p>
            <p className="mt-2 text-2xl font-medium tracking-tight">v{current.versionNumber}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Publicada em {current.createdAt.toLocaleString('pt-BR')}
              {current.changeNotes ? ` · ${current.changeNotes}` : ''}
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {personality && (
                <Snippet title="Personalidade">
                  <KV label="Tom" value={String(personality['tone'] ?? '—')} />
                  <KV label="Emoji" value={String(personality['emoji'] ?? '—')} />
                  {Array.isArray(personality['neverSay']) && personality['neverSay'].length > 0 && (
                    <KV
                      label="Nunca diga"
                      value={(personality['neverSay'] as string[]).join(', ')}
                    />
                  )}
                </Snippet>
              )}

              {handoff && (
                <Snippet title="Handoff">
                  {Array.isArray(handoff['keywords']) && (
                    <KV
                      label="Palavras-chave"
                      value={
                        (handoff['keywords'] as string[]).join(', ') || '(nenhuma)'
                      }
                    />
                  )}
                  {Array.isArray(handoff['conditions']) && (
                    <KV
                      label="Condições"
                      value={
                        (handoff['conditions'] as string[]).join(' · ') || '(nenhuma)'
                      }
                    />
                  )}
                </Snippet>
              )}

              {current.toolsEnabled.length > 0 && (
                <Snippet title="Tools ativas" wide>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {current.toolsEnabled.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-xs font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </Snippet>
              )}
            </div>

            <details className="mt-6">
              <summary className="cursor-pointer text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
                Ver system prompt completo
              </summary>
              <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-background/40 p-4 font-mono text-[11px] leading-relaxed">
                {current.systemPrompt}
              </pre>
            </details>
          </section>
        )}

        <section className="mt-12">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Histórico</h2>
          </div>
          <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
            {agent.versions.map((v) => (
              <li key={v.id}>
                <VersionRow
                  version={{
                    id: v.id,
                    agentId: agent.id,
                    versionNumber: v.versionNumber,
                    createdAt: v.createdAt.toISOString(),
                    changeNotes: v.changeNotes,
                    isCurrent: v.id === agent.currentVersionId,
                    systemPromptPreview: v.systemPrompt.slice(0, 240),
                    systemPromptFull: v.systemPrompt,
                    toolsEnabled: v.toolsEnabled,
                  }}
                  canRollback={isAdmin && v.id !== agent.currentVersionId}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Snippet({
  title,
  wide,
  children,
}: {
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="mt-2 space-y-1.5 text-sm">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

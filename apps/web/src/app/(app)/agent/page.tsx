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
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight md:text-3xl">
            Sem agente ainda
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie seu primeiro agente conversando com o Forge.
          </p>
          <Link
            href="/forge"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            Abrir o Forge
            <ArrowRight className="h-4 w-4" />
          </Link>
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
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Agente IA do workspace</p>
          <h1 className="mt-1 flex items-baseline gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
            {agent.name}
            {current && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                v{current.versionNumber}
              </span>
            )}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-muted px-2 py-0.5">{agent.vertical}</span>
            <span>·</span>
            <span>
              {agent.versions.length} versão{agent.versions.length === 1 ? '' : 'ões'}
            </span>
          </div>
        </div>
        <Link
          href="/forge"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Sparkles className="h-4 w-4" />
          Refinar no Forge
        </Link>
      </div>

      {current && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm">
          <div className="border-b border-primary/15 bg-primary/[0.04] px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Versão ativa
              </p>
            </div>
            <p className="mt-1 text-xl font-semibold tracking-tight">
              v{current.versionNumber}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Publicada em {current.createdAt.toLocaleString('pt-BR')}
              {current.changeNotes ? ` · ${current.changeNotes}` : ''}
            </p>
          </div>

          <div className="px-6 py-6">
            <div className="grid gap-5 md:grid-cols-2">
              {personality && (
                <Snippet title="Personalidade">
                  <KV label="Tom" value={String(personality['tone'] ?? '—')} />
                  <KV label="Emoji" value={String(personality['emoji'] ?? '—')} />
                  {Array.isArray(personality['neverSay']) &&
                    personality['neverSay'].length > 0 && (
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
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </Snippet>
              )}
            </div>

            <details className="mt-6 rounded-lg border border-border bg-muted/20">
              <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
                Ver system prompt completo
              </summary>
              <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap border-t border-border bg-background p-4 font-mono text-[11px] leading-relaxed">
                {current.systemPrompt}
              </pre>
            </details>
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Histórico de versões</h2>
        </div>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
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

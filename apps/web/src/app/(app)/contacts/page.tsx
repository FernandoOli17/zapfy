import Link from 'next/link';
import { ArrowUpRight, FileUp, Pencil, Search, UserPlus, UserX, Users } from 'lucide-react';
import { prisma, type Prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

export const metadata = { title: 'Contatos' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ q?: string; tag?: string }>;
}

export default async function ContactsPage({ searchParams }: PageProps) {
  const { workspace } = await requireWorkspace();
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const tag = params.tag?.trim() ?? '';

  const where: Prisma.ContactWhereInput = {
    workspaceId: workspace.id,
    deletedAt: null,
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { phoneE164: { contains: q.replace(/\D/g, '') } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (tag) where.tags = { has: tag };

  const [contacts, total, taggedCounts] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        phoneE164: true,
        email: true,
        tags: true,
        optedOut: true,
        lastSeenAt: true,
        createdAt: true,
        _count: { select: { messages: true, conversations: true } },
      },
    }),
    prisma.contact.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
    prisma.contact.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      select: { tags: true },
      take: 500,
    }),
  ]);

  const allTags = Array.from(
    new Set(taggedCounts.flatMap((c) => c.tags)),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Pessoas no seu workspace</p>
          <h1 className="mt-1 flex items-baseline gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Contatos
            <span className="text-base font-normal text-muted-foreground">
              {total.toLocaleString('pt-BR')}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/contacts/import"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
          >
            <FileUp className="h-4 w-4" />
            Importar CSV
          </Link>
          <Link
            href="/contacts/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            Novo contato
          </Link>
        </div>
      </div>

      {/* Filters bar */}
      <form className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar nome, telefone ou e-mail…"
            className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          name="tag"
          defaultValue={tag}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Todas as tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Filtrar
        </button>
      </form>

      {contacts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 font-medium">Sem contatos por aqui.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q || tag
              ? 'Tenta um filtro diferente.'
              : 'Quando alguém mandar mensagem pro número conectado, vira contato aqui.'}
          </p>
          <Link
            href="/contacts/new"
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            Criar manualmente
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Contato</th>
                  <th className="px-5 py-3">Telefone</th>
                  <th className="px-5 py-3">Tags</th>
                  <th className="px-5 py-3 text-center">Conversas</th>
                  <th className="px-5 py-3 text-center">Mensagens</th>
                  <th className="px-5 py-3">Última vez</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border/60 transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {(c.name ?? c.phoneE164 ?? '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{c.name ?? '—'}</span>
                            {c.optedOut && (
                              <span
                                title="Opt-out: não receber mensagens ativas"
                                className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/5 px-1.5 text-[10px] text-destructive"
                              >
                                <UserX className="h-2.5 w-2.5" />
                                opt-out
                              </span>
                            )}
                          </div>
                          {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">+{c.phoneE164}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                          >
                            {t}
                          </span>
                        ))}
                        {c.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{c.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center tabular-nums">
                      {c._count.conversations}
                    </td>
                    <td className="px-5 py-3 text-center tabular-nums">{c._count.messages}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {c.lastSeenAt ? new Date(c.lastSeenAt).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          href={`/contacts/${c.id}/edit`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          aria-label="Editar contato"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </Link>
                        <Link
                          href={`/inbox?contactId=${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                        >
                          Conversas <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {contacts.length === 100 && (
            <p className="border-t border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
              Mostrando 100 mais recentes. Refine os filtros pra ver outros.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

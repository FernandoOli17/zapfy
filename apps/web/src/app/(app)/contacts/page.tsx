import Link from 'next/link';
import { ArrowUpRight, UserX, Users } from 'lucide-react';
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
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Contatos</p>
            <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
              {total.toLocaleString('pt-BR')}{' '}
              <span className="font-serif italic font-normal text-muted-foreground">
                {total === 1 ? 'pessoa' : 'pessoas'}
              </span>
            </h1>
          </div>
          <form className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar nome, telefone ou e-mail…"
              className="h-10 w-64 rounded-md border border-border/60 bg-background/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              name="tag"
              defaultValue={tag}
              className="h-10 rounded-md border border-border/60 bg-background/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Filtrar
            </button>
          </form>
        </div>

        {contacts.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-border/60 p-10 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-4 font-medium">Sem contatos por aqui.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {q || tag
                ? 'Tenta um filtro diferente.'
                : 'Quando alguém mandar mensagem pro número conectado, vira contato aqui.'}
            </p>
          </div>
        ) : (
          <div className="mt-10 overflow-x-auto rounded-xl border border-border/60 bg-card/40">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3 font-normal">Contato</th>
                  <th className="px-5 py-3 font-normal">Telefone</th>
                  <th className="px-5 py-3 font-normal">Tags</th>
                  <th className="px-5 py-3 font-normal text-center">Conversas</th>
                  <th className="px-5 py-3 font-normal text-center">Mensagens</th>
                  <th className="px-5 py-3 font-normal">Última vez</th>
                  <th className="px-5 py-3 font-normal" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-t border-border/40 hover:bg-background/40">
                    <td className="px-5 py-3">
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
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">+{c.phoneE164}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-border/60 bg-background/40 px-1.5 text-[10px] text-muted-foreground"
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
                      <Link
                        href={`/inbox?contactId=${c.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Conversas <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contacts.length === 100 && (
              <p className="border-t border-border/40 px-5 py-3 text-xs text-muted-foreground">
                Mostrando 100 mais recentes. Refine os filtros pra ver outros.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

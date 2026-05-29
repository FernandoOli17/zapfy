import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Plus, MessageCircle } from 'lucide-react';

import { prisma } from '@zapfy/db';
import { auth } from '@/lib/auth';

import { StatusBadge } from './status-badge';

export const metadata = { title: 'Suporte' };
export const dynamic = 'force-dynamic';

export default async function SupportListPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    orderBy: { lastMessageAt: 'desc' },
    select: {
      id: true,
      publicNumber: true,
      subject: true,
      category: true,
      status: true,
      lastMessageAt: true,
      _count: { select: { messages: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Suporte</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Seus tickets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Time pequeno, resposta direta. Geralmente respondemos em algumas horas.
          </p>
        </div>
        <Link
          href="/support/new"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          Abrir ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-border bg-card p-12 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">Nenhum ticket ainda</h3>
          <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
            Quando precisar de ajuda — bug, dúvida de cobrança, configuração — abre um
            ticket aqui e a gente responde.
          </p>
          <Link
            href="/support/new"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            Abrir primeiro ticket
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-2">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/support/${t.id}`}
                className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono text-muted-foreground">
                      #{t.publicNumber} · {t.category}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium">{t.subject}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t._count.messages} mensagem{t._count.messages === 1 ? '' : 's'} ·{' '}
                      {new Date(t.lastMessageAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

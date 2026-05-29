import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { prisma, SupportSender } from '@zapfy/db';
import { auth } from '@/lib/auth';

import { StatusBadge } from '../status-badge';
import { ReplyForm } from './reply-form';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  // Só o dono do ticket vê (admin tem rota separada /admin/support)
  if (!ticket || ticket.userId !== session.user.id) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-10">
      <Link
        href="/support"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono text-muted-foreground">
            Ticket #{ticket.publicNumber} · {ticket.category}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
            {ticket.subject}
          </h1>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      {/* Thread */}
      <div className="mt-8 space-y-4">
        {ticket.messages.map((m) => (
          <MessageBubble
            key={m.id}
            sender={m.sender}
            senderName={m.senderName}
            body={m.body}
            at={m.createdAt}
          />
        ))}
      </div>

      {/* Reply form (apenas se ticket aberto) */}
      {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <ReplyForm ticketId={ticket.id} />
        </div>
      )}

      {ticket.status === 'RESOLVED' && (
        <div className="mt-8 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-center text-sm text-emerald-400">
          Ticket marcado como resolvido. Precisa reabrir? Manda outra mensagem.
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  sender,
  senderName,
  body,
  at,
}: {
  sender: SupportSender;
  senderName: string;
  body: string;
  at: Date;
}) {
  const isStaff = sender === SupportSender.STAFF;
  return (
    <article
      className={`rounded-2xl border p-5 ${
        isStaff ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium">
          {isStaff ? <span className="text-primary">⚡ {senderName} · staff Zapfy</span> : senderName}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {at.toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
    </article>
  );
}

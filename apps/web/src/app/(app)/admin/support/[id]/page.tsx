import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Building2, User as UserIcon, Mail } from 'lucide-react';

import { prisma, SupportSender } from '@zapfy/db';
import { auth } from '@/lib/auth';

import { StatusBadge } from '../../../support/status-badge';
import { AdminReplyForm } from './admin-reply-form';
import { StatusChanger } from './status-changer';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminTicketDetail({ params }: Props) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true, name: true },
  });
  if (!me?.isSuperAdmin) notFound();

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      user: { select: { email: true, name: true, id: true } },
      workspace: { select: { name: true, slug: true } },
    },
  });
  if (!ticket) notFound();

  const fromName = ticket.user?.name ?? ticket.guestName ?? 'Visitante';
  const fromEmail = ticket.user?.email ?? ticket.guestEmail ?? '—';

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">
      <Link
        href="/admin/support"
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
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <StatusChanger ticketId={ticket.id} currentStatus={ticket.status} />
        </div>
      </div>

      {/* Meta info */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <MetaCard icon={UserIcon} label="Cliente" value={fromName} />
        <MetaCard icon={Mail} label="Email" value={fromEmail} />
        <MetaCard
          icon={Building2}
          label="Workspace"
          value={ticket.workspace?.name ?? '—'}
        />
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

      {/* Admin reply */}
      {ticket.status !== 'CLOSED' && (
        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/[0.03] p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary">
            Responder como staff
          </p>
          <AdminReplyForm
            ticketId={ticket.id}
            staffName={me.name ?? 'Equipe Zapfy'}
          />
        </div>
      )}
    </div>
  );
}

function MetaCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1.5 truncate text-sm">{value}</p>
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
          {isStaff ? <span className="text-primary">⚡ {senderName} · staff</span> : senderName}
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

import 'server-only';

import { prisma, SupportSender, SupportTicketStatus, type SupportTicketCategory } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';

import { env } from '@/env';
import { sendEmail } from '@/lib/email/client';
import { supportTicketStaffNotification, supportReplyToUserEmail } from '@/lib/email/templates';

const log = createLogger('support');

/**
 * Email de "staff" — pra onde mandamos notificação quando user abre/responde
 * um ticket. Você (Fernando) responde por esse endereço.
 */
const STAFF_EMAIL = env.RESEND_FROM_EMAIL ?? 'supportezapfy@gmail.com';

export interface OpenTicketInput {
  /** User logado, se houver */
  userId?: string;
  workspaceId?: string;
  /** Se anônimo */
  guestEmail?: string;
  guestName?: string;
  subject: string;
  category: SupportTicketCategory;
  /** Texto da primeira mensagem (corpo do ticket) */
  body: string;
  /** Nome que assina a primeira mensagem (cacheado pra exibição) */
  senderName: string;
}

/**
 * Cria ticket + primeira mensagem em transação. Notifica staff por email.
 * Retorna publicNumber pra exibir pro user ("seu ticket é #42").
 */
export async function openTicket(input: OpenTicketInput): Promise<{
  ticketId: string;
  publicNumber: number;
}> {
  if (!input.userId && !input.guestEmail) {
    throw new Error('openTicket precisa de userId OU guestEmail');
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: input.userId ?? null,
      guestEmail: input.guestEmail ?? null,
      guestName: input.guestName ?? null,
      workspaceId: input.workspaceId ?? null,
      subject: input.subject,
      category: input.category,
      status: SupportTicketStatus.AWAITING_STAFF,
      lastMessageAt: new Date(),
      messages: {
        create: {
          sender: SupportSender.USER,
          senderId: input.userId ?? null,
          senderName: input.senderName,
          body: input.body,
        },
      },
    },
    select: { id: true, publicNumber: true },
  });

  // Notifica staff (você) — best-effort
  try {
    const tmpl = supportTicketStaffNotification({
      ticketNumber: ticket.publicNumber,
      subject: input.subject,
      category: input.category,
      body: input.body,
      from: input.guestEmail
        ? `${input.guestName ?? 'Visitante'} <${input.guestEmail}>`
        : `Usuário logado (id: ${input.userId})`,
      adminUrl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/admin/support/${ticket.id}`,
    });
    await sendEmail({
      to: STAFF_EMAIL,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
      ...(input.guestEmail ? { replyTo: input.guestEmail } : {}),
    });
  } catch (err) {
    log.warn({ err: String(err), ticketId: ticket.id }, 'falha notificar staff');
  }

  return { ticketId: ticket.id, publicNumber: ticket.publicNumber };
}

export interface ReplyTicketInput {
  ticketId: string;
  /** Quem está respondendo */
  sender: SupportSender;
  /** User que digitou (se logado) */
  senderId?: string;
  senderName: string;
  body: string;
}

/**
 * Adiciona mensagem a um ticket existente. Atualiza status conforme
 * sender: USER → AWAITING_STAFF, STAFF → AWAITING_USER. Notifica
 * o outro lado por email.
 */
export async function replyTicket(input: ReplyTicketInput): Promise<void> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: input.ticketId },
    select: {
      id: true,
      publicNumber: true,
      subject: true,
      userId: true,
      guestEmail: true,
      guestName: true,
      firstStaffReplyAt: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (!ticket) throw new Error('Ticket não encontrado');

  const newStatus =
    input.sender === SupportSender.USER
      ? SupportTicketStatus.AWAITING_STAFF
      : SupportTicketStatus.AWAITING_USER;

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: input.ticketId,
        sender: input.sender,
        senderId: input.senderId ?? null,
        senderName: input.senderName,
        body: input.body,
      },
    }),
    prisma.supportTicket.update({
      where: { id: input.ticketId },
      data: {
        status: newStatus,
        lastMessageAt: new Date(),
        ...(input.sender === SupportSender.STAFF && !ticket.firstStaffReplyAt
          ? { firstStaffReplyAt: new Date() }
          : {}),
      },
    }),
  ]);

  // Notifica o outro lado
  try {
    if (input.sender === SupportSender.STAFF) {
      // Staff respondeu → email pro user
      const userEmail = ticket.user?.email ?? ticket.guestEmail;
      const userName = ticket.user?.name ?? ticket.guestName ?? 'Cliente';
      if (userEmail) {
        const tmpl = supportReplyToUserEmail({
          ticketNumber: ticket.publicNumber,
          subject: ticket.subject,
          replyBody: input.body,
          staffName: input.senderName,
          name: userName,
          ticketUrl: ticket.userId
            ? `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/support/${ticket.id}`
            : `mailto:${STAFF_EMAIL}?subject=${encodeURIComponent('Re: Ticket #' + ticket.publicNumber)}`,
        });
        await sendEmail({
          to: userEmail,
          subject: tmpl.subject,
          html: tmpl.html,
          text: tmpl.text,
          replyTo: STAFF_EMAIL,
        });
      }
    } else {
      // User respondeu → notifica staff
      const tmpl = supportTicketStaffNotification({
        ticketNumber: ticket.publicNumber,
        subject: `[RESPOSTA] ${ticket.subject}`,
        category: 'OTHER',
        body: input.body,
        from: ticket.guestEmail
          ? `${ticket.guestName ?? 'Visitante'} <${ticket.guestEmail}>`
          : `Usuário (${ticket.user?.email ?? ticket.userId})`,
        adminUrl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/admin/support/${ticket.id}`,
      });
      await sendEmail({
        to: STAFF_EMAIL,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
        ...(ticket.guestEmail ? { replyTo: ticket.guestEmail } : {}),
      });
    }
  } catch (err) {
    log.warn({ err: String(err), ticketId: input.ticketId }, 'falha notificar');
  }
}

/**
 * Marca como RESOLVED ou CLOSED.
 */
export async function setTicketStatus(
  ticketId: string,
  status: SupportTicketStatus,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === SupportTicketStatus.RESOLVED) patch['resolvedAt'] = new Date();
  if (status === SupportTicketStatus.CLOSED) patch['closedAt'] = new Date();
  await prisma.supportTicket.update({ where: { id: ticketId }, data: patch });
}

import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma, type Prisma } from '@zapfy/db';

import { auth } from '@/lib/auth';
import { getImpersonatedWorkspaceId } from '@/lib/impersonation';

/**
 * Like `requireWorkspace`, mas exige role OWNER ou ADMIN. AGENT (tier mais
 * baixo) é bloqueado. Super-admin impersonando recebe role 'OWNER' sintético
 * — passa direto, como esperado.
 *
 * Retorna `{ ok: false, error }` em vez de throw pra ser usado em server
 * actions com error toast no client.
 */
export async function requireOwnerOrAdmin(): Promise<
  | { ok: true; ctx: Awaited<ReturnType<typeof requireWorkspace>> }
  | { ok: false; error: string }
> {
  const ctx = await requireWorkspace();
  if (ctx.member.role !== 'OWNER' && ctx.member.role !== 'ADMIN') {
    return { ok: false, error: 'Apenas OWNER ou ADMIN podem fazer esta ação' };
  }
  return { ok: true, ctx };
}

export async function requireWorkspace() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const fullUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isSuperAdmin: true },
  });

  // Super-admin impersonando → carrega workspace alvo, bypassando member check
  if (fullUser?.isSuperAdmin) {
    const targetId = await getImpersonatedWorkspaceId(session.user.id);
    if (targetId) {
      const ws = await prisma.workspace.findUnique({ where: { id: targetId } });
      if (ws) {
        return {
          user: session.user,
          member: {
            id: 'impersonated',
            userId: session.user.id,
            workspaceId: ws.id,
            role: 'OWNER' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            workspace: ws,
          },
          workspace: ws,
          impersonating: true as const,
        };
      }
    }
  }

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  return { user: session.user, member, workspace: member.workspace, impersonating: false as const };
}

export interface InboxConversationListItem {
  id: string;
  status: 'AI_HANDLING' | 'HUMAN_HANDLING' | 'CLOSED';
  unreadCount: number;
  lastMessageAt: string | null;
  lastIncomingAt: string | null;
  contact: {
    id: string;
    name: string | null;
    phoneE164: string;
    tags: string[];
  };
  lastMessagePreview: string | null;
  lastMessageFromAi: boolean;
  assignedToUserId: string | null;
}

export interface InboxConversationDetail extends InboxConversationListItem {
  contact: InboxConversationListItem['contact'] & {
    customFields: Record<string, unknown>;
    optedOut: boolean;
    lastSeenAt: string | null;
  };
  internalNotes: string | null;
  messages: InboxMessage[];
}

export interface InboxMessage {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  content: Record<string, unknown>;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  fromAi: boolean;
  toolsUsed: string[];
  createdAt: string;
  errorMessage: string | null;
}

export type InboxFilter = 'all' | 'ai' | 'human' | 'closed';

export async function listConversations(
  workspaceId: string,
  filter: InboxFilter = 'all',
  query: string = '',
): Promise<InboxConversationListItem[]> {
  const where: Prisma.ConversationWhereInput = { workspaceId };

  if (filter === 'ai') where.status = 'AI_HANDLING';
  if (filter === 'human') where.status = 'HUMAN_HANDLING';
  if (filter === 'closed') where.status = 'CLOSED';

  if (query.trim()) {
    const trimmed = query.trim();
    where.contact = {
      OR: [
        { phoneE164: { contains: trimmed.replace(/\D/g, '') } },
        { name: { contains: trimmed, mode: 'insensitive' } },
      ],
    };
  }

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
    take: 100,
    include: {
      contact: {
        select: { id: true, name: true, phoneE164: true, tags: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          direction: true,
          type: true,
          content: true,
          fromAi: true,
          createdAt: true,
        },
      },
    },
  });

  return rows.map((c) => {
    const last = c.messages[0];
    return {
      id: c.id,
      status: c.status,
      unreadCount: c.unreadCount,
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      lastIncomingAt: c.lastIncomingMessageAt?.toISOString() ?? null,
      contact: c.contact,
      lastMessagePreview: last ? previewFromContent(last.content, last.type) : null,
      lastMessageFromAi: last?.fromAi ?? false,
      assignedToUserId: c.assignedToUserId,
    };
  });
}

export async function getConversationDetail(
  workspaceId: string,
  conversationId: string,
): Promise<InboxConversationDetail | null> {
  const c = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    include: {
      contact: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 200,
      },
    },
  });
  if (!c) return null;

  const customFieldsRaw = c.contact.customFields as unknown;
  const customFields: Record<string, unknown> =
    customFieldsRaw && typeof customFieldsRaw === 'object' && !Array.isArray(customFieldsRaw)
      ? (customFieldsRaw as Record<string, unknown>)
      : {};

  return {
    id: c.id,
    status: c.status,
    unreadCount: c.unreadCount,
    lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    lastIncomingAt: c.lastIncomingMessageAt?.toISOString() ?? null,
    assignedToUserId: c.assignedToUserId,
    internalNotes: c.internalNotes,
    contact: {
      id: c.contact.id,
      name: c.contact.name,
      phoneE164: c.contact.phoneE164,
      tags: c.contact.tags,
      customFields,
      optedOut: c.contact.optedOut,
      lastSeenAt: c.contact.lastSeenAt?.toISOString() ?? null,
    },
    lastMessagePreview: c.messages.length
      ? previewFromContent(c.messages[c.messages.length - 1]!.content, c.messages[c.messages.length - 1]!.type)
      : null,
    lastMessageFromAi: c.messages[c.messages.length - 1]?.fromAi ?? false,
    messages: c.messages.map((m) => {
      const contentObj =
        m.content && typeof m.content === 'object' && !Array.isArray(m.content)
          ? (m.content as Record<string, unknown>)
          : {};
      return {
        id: m.id,
        direction: m.direction,
        type: m.type,
        content: contentObj,
        status: m.status,
        fromAi: m.fromAi,
        toolsUsed: m.toolsUsed ?? [],
        createdAt: m.createdAt.toISOString(),
        errorMessage: m.errorMessage,
      };
    }),
  };
}

function previewFromContent(content: unknown, type: string): string {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    const c = content as Record<string, unknown>;
    if (typeof c['text'] === 'string') return c['text'];
    if (typeof c['caption'] === 'string') return c['caption'];
  }
  return `[${type.toLowerCase()}]`;
}

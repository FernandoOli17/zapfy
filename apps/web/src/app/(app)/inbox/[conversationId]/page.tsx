import { notFound } from 'next/navigation';

import { getConversationDetail, requireWorkspace } from '@/lib/inbox';

import { ConversationView } from '../conversation-view';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { workspace } = await requireWorkspace();
  const { conversationId } = await params;
  const detail = await getConversationDetail(workspace.id, conversationId);
  if (!detail) notFound();

  // marca como lido (server-side, sem await pra UI não esperar)
  void markRead(workspace.id, conversationId);

  return <ConversationView detail={detail} />;
}

async function markRead(workspaceId: string, conversationId: string) {
  const { prisma } = await import('@zapfy/db');
  await prisma.conversation
    .update({
      where: { id: conversationId, workspaceId } as never,
      data: { unreadCount: 0 },
    })
    .catch(() => undefined);
}

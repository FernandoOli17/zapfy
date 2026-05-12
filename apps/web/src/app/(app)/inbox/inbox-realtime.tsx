'use client';

import { useRouter } from 'next/navigation';

import { useInboxChannel } from '@/lib/realtime/pusher-client';

/**
 * Componente invisível que escuta o canal do workspace e dá router.refresh()
 * quando chega evento. Como list/detail são server components, refresh
 * re-renderiza tudo com dados frescos.
 */
export function InboxRealtime({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const channel = `private-workspace-${workspaceId}`;

  useInboxChannel(channel, 'message.new', () => {
    router.refresh();
  });
  useInboxChannel(channel, 'conversation.updated', () => {
    router.refresh();
  });

  return null;
}

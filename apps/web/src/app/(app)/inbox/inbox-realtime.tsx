'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { isPusherConfigured, useInboxChannel } from '@/lib/realtime/pusher-client';

const POLL_INTERVAL_MS = 5_000;

/**
 * Componente invisível que mantém o inbox atualizado em near-realtime.
 *
 * - Se Pusher está configurado (NEXT_PUBLIC_PUSHER_KEY presente), escuta o
 *   canal privado do workspace e refresh() em cada evento — sub-segundo.
 * - Senão, faz polling de 5s via router.refresh(). Sem real-time, mas
 *   garante que novas mensagens aparecem dentro de 5s em vez de ficar
 *   silencioso (que era o comportamento anterior).
 */
export function InboxRealtime({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const channel = `private-workspace-${workspaceId}`;
  const pusherOn = isPusherConfigured();

  useInboxChannel(channel, 'message.new', () => {
    router.refresh();
  });
  useInboxChannel(channel, 'conversation.updated', () => {
    router.refresh();
  });

  useEffect(() => {
    if (pusherOn) return;
    const id = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pusherOn, router]);

  return null;
}

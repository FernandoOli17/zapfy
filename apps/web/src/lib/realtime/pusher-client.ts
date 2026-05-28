'use client';

import { useEffect, useRef } from 'react';
import PusherClient, { type Channel } from 'pusher-js';

let cachedClient: PusherClient | null = null;

function getClient(): PusherClient | null {
  if (cachedClient) return cachedClient;
  const key = process.env['NEXT_PUBLIC_PUSHER_KEY'];
  const cluster = process.env['NEXT_PUBLIC_PUSHER_CLUSTER'];
  if (!key || !cluster) return null;

  cachedClient = new PusherClient(key, {
    cluster,
    authEndpoint: '/api/realtime/auth',
    forceTLS: true,
  });
  return cachedClient;
}

/** True se NEXT_PUBLIC_PUSHER_KEY + CLUSTER estão presentes no client. */
export function isPusherConfigured(): boolean {
  return Boolean(process.env['NEXT_PUBLIC_PUSHER_KEY'] && process.env['NEXT_PUBLIC_PUSHER_CLUSTER']);
}

/**
 * Hook que inscreve num canal privado e dispara o handler em cada evento do nome dado.
 * Faz no-op silencioso se Pusher não configurado.
 */
export function useInboxChannel<T = unknown>(
  channel: string,
  eventName: string,
  handler: (data: T) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const client = getClient();
    if (!client) return;
    let ch: Channel | null = null;
    try {
      ch = client.subscribe(channel);
      ch.bind(eventName, (data: T) => {
        handlerRef.current(data);
      });
    } catch {
      // ignora
    }
    return () => {
      try {
        ch?.unbind(eventName);
        client.unsubscribe(channel);
      } catch {
        // ignora
      }
    };
  }, [channel, eventName]);
}

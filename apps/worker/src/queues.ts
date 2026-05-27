/**
 * Tem que casar com apps/web/src/lib/queues.ts (producer side).
 * Se mudar aqui, mude lá também.
 */
export const QUEUE_NAMES = {
  processMessage: 'process-message',
  sendBroadcast: 'send-broadcast',
  outgoingWebhook: 'outgoing-webhook',
  lgpdHardDelete: 'lgpd-hard-delete',
  processKnowledge: 'process-knowledge',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

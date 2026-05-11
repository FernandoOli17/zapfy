export const QUEUE_NAMES = {
  processMessage: 'process-message',
  embedDocument: 'embed-document',
  sendBroadcast: 'send-broadcast',
  scheduledBroadcast: 'scheduled-broadcast',
  lgpdHardDelete: 'lgpd-hard-delete',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

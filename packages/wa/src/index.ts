// Cliente Meta Cloud API tipado — implementação completa na Fase 4.
// Por ora exporta apenas constantes e tipos compartilhados.

export const WA_API_VERSION = 'v21.0';
export const WA_BASE_URL = `https://graph.facebook.com/${WA_API_VERSION}` as const;

export interface WaMessageContext {
  messageId: string;
}

export interface WaIncomingMessage {
  from: string; // E.164 sem +
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  context?: WaMessageContext;
}

export interface WaIncomingStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message?: string }>;
}

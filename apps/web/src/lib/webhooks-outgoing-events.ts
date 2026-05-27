/**
 * Constantes compartilhadas entre server e client (UI de configuração).
 * SEM `server-only` aqui — código que precisa de DB/crypto fica em
 * `webhooks-outgoing.ts`.
 */

export const OUTGOING_EVENT_NAMES = [
  'message.received',
  'message.sent',
  'message.failed',
  'message.delivered',
  'message.read',
  'conversation.assumed',
  'conversation.returned',
  'conversation.closed',
  'agent.published',
  'whatsapp.connected',
  'whatsapp.disconnected',
  'lgpd.opt_out',
] as const;

export type OutgoingEventName = (typeof OUTGOING_EVENT_NAMES)[number];

export interface OutgoingEventPayload {
  event: OutgoingEventName;
  workspaceId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export const OUTGOING_EVENT_DESCRIPTIONS: Record<OutgoingEventName, string> = {
  'message.received': 'Cliente final enviou mensagem (INBOUND)',
  'message.sent': 'Mensagem enviada pelo agente ou humano',
  'message.failed': 'Falha ao enviar mensagem',
  'message.delivered': 'Mensagem entregue ao cliente',
  'message.read': 'Mensagem lida pelo cliente (2 ticks azuis)',
  'conversation.assumed': 'Atendente humano assumiu a conversa',
  'conversation.returned': 'Conversa devolvida ao agente IA',
  'conversation.closed': 'Conversa encerrada',
  'agent.published': 'Nova versão do agente publicada',
  'whatsapp.connected': 'Número WhatsApp conectado',
  'whatsapp.disconnected': 'Número WhatsApp desconectado',
  'lgpd.opt_out': 'Contato fez opt-out',
};

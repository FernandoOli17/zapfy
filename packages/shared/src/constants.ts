export const VERTICALS = [
  'ecommerce',
  'clinic',
  'restaurant',
  'infoproduct',
  'service',
  'other',
] as const;
export type Vertical = (typeof VERTICALS)[number];

export const VERTICAL_LABELS_PT: Record<Vertical, string> = {
  ecommerce: 'E-commerce',
  clinic: 'Clínica / Consultório',
  restaurant: 'Restaurante / Delivery',
  infoproduct: 'Infoproduto',
  service: 'Prestador de serviço',
  other: 'Outro',
};

/**
 * Planos cobráveis (self-service via Stripe). `Enterprise` é só marketing
 * ("Falar com vendas" → /contato), não entra aqui nem no enum do DB.
 */
export const PLAN_IDS = ['STARTER', 'PRO', 'BUSINESS'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanFeature = {
  priceBRLCents: number;
  /**
   * Limite de **conversas de IA** por ciclo de cobrança. 1 conversa = uma
   * `Conversation` que teve ≥1 mensagem atendida pela IA dentro do ciclo.
   * É a unidade que o cliente percebe (atendimento) e que nos custa (tokens).
   * Conversas reativas no Business são ilimitadas.
   */
  aiConversations: number | 'unlimited';
  whatsappNumbers: number | 'unlimited';
  teamSeats: number | 'unlimited';
  knowledgeDocs: number | 'unlimited';
  forgeRefinements: 'unlimited';
  customTools: boolean;
  apiAccess: boolean;
};

export const PLANS: Record<PlanId, PlanFeature> = {
  STARTER: {
    priceBRLCents: 9700,
    aiConversations: 1_500,
    whatsappNumbers: 1,
    teamSeats: 1,
    knowledgeDocs: 10,
    forgeRefinements: 'unlimited',
    customTools: false,
    apiAccess: false,
  },
  PRO: {
    priceBRLCents: 24700,
    aiConversations: 6_000,
    whatsappNumbers: 2,
    teamSeats: 3,
    knowledgeDocs: 100,
    forgeRefinements: 'unlimited',
    customTools: true,
    apiAccess: false,
  },
  BUSINESS: {
    priceBRLCents: 59700,
    aiConversations: 'unlimited',
    whatsappNumbers: 'unlimited',
    teamSeats: 'unlimited',
    knowledgeDocs: 'unlimited',
    forgeRefinements: 'unlimited',
    customTools: true,
    apiAccess: true,
  },
};

/** Janela do ciclo pra contagem de conversas de IA quando não há período Stripe (fallback). */
export const AI_CONVERSATION_WINDOW_DAYS = 30;

export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'AGENT'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const CONVERSATION_STATUSES = ['AI_HANDLING', 'HUMAN_HANDLING', 'CLOSED'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const MESSAGE_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];

export const MESSAGE_TYPES = [
  'TEXT',
  'IMAGE',
  'AUDIO',
  'DOC',
  'VIDEO',
  'TEMPLATE',
  'INTERACTIVE',
  'LOCATION',
  'CONTACTS',
  'STICKER',
  'SYSTEM',
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_STATUSES = [
  'PENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const KNOWLEDGE_SOURCES = ['UPLOAD', 'URL', 'MANUAL'] as const;
export type KnowledgeSource = (typeof KNOWLEDGE_SOURCES)[number];

export const KNOWLEDGE_DOC_STATUSES = ['PROCESSING', 'READY', 'ERROR'] as const;
export type KnowledgeDocStatus = (typeof KNOWLEDGE_DOC_STATUSES)[number];

export const TEMPLATE_STATUSES = [
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'PAUSED',
  'DISABLED',
] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const WA_WINDOW_HOURS = 24;
export const WA_TEXT_MAX_LEN = 1024;
export const EMBEDDING_DIMENSIONS = 1024; // voyage-3

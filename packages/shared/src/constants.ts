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

export const PLAN_IDS = ['STARTER', 'PRO', 'PREMIUM'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanFeature = {
  priceBRLCents: number;
  /**
   * Limite de contatos únicos que enviaram/receberam mensagem no ciclo do mês.
   * Substituiu `aiConversations` em 2026-05 — Meta mudou pricing WhatsApp
   * Cloud API em jul/2025: service messages (resposta do agente dentro da
   * janela 24h) ficaram **gratuitas**. Não faz mais sentido cobrar por
   * conversa do agente — só por contatos ativos e broadcasts proativos.
   */
  activeContacts: number | 'unlimited';
  /** Limite de broadcasts (mensagens proativas via template HSM) por mês. */
  broadcasts: number | 'unlimited';
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
    activeContacts: 500,
    broadcasts: 2,
    whatsappNumbers: 1,
    teamSeats: 2,
    knowledgeDocs: 10,
    forgeRefinements: 'unlimited',
    customTools: false,
    apiAccess: false,
  },
  PRO: {
    priceBRLCents: 29700,
    activeContacts: 3_000,
    broadcasts: 'unlimited',
    whatsappNumbers: 3,
    teamSeats: 10,
    knowledgeDocs: 100,
    forgeRefinements: 'unlimited',
    customTools: true,
    apiAccess: false,
  },
  PREMIUM: {
    priceBRLCents: 69700,
    activeContacts: 'unlimited',
    broadcasts: 'unlimited',
    whatsappNumbers: 'unlimited',
    teamSeats: 'unlimited',
    knowledgeDocs: 'unlimited',
    forgeRefinements: 'unlimited',
    customTools: true,
    apiAccess: true,
  },
};

/** Janela considerada pra "contato ativo": mensagem enviada/recebida nos últimos 30 dias. */
export const ACTIVE_CONTACT_WINDOW_DAYS = 30;

export const TRIAL_DAYS = 7;

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

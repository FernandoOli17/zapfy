export const AI_MODELS = {
  agent: 'claude-sonnet-4-5',
  classifier: 'claude-haiku-4-5',
} as const;

export type AiModelId = (typeof AI_MODELS)[keyof typeof AI_MODELS];

export const EMBEDDING_MODEL = 'voyage-3' as const;

export * from './provider';
export * from './forge';

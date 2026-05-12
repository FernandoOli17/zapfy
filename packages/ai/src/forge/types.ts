import { z } from 'zod';

export const FORGE_PHASE_IDS = [
  'DISCOVERY',
  'VERTICAL_DETECTION',
  'GOALS',
  'TONE',
  'KNOWLEDGE',
  'TOOLS',
  'HANDOFF',
  'REVIEW',
  'PUBLISH',
  'REFINEMENT',
] as const;

export type ForgePhaseId = (typeof FORGE_PHASE_IDS)[number];

export const VERTICAL_IDS = [
  'ECOMMERCE',
  'CLINIC',
  'RESTAURANT',
  'INFOPRODUCT',
  'SERVICE',
  'OTHER',
] as const;

export type VerticalId = (typeof VERTICAL_IDS)[number];

export const personalitySchema = z.object({
  tone: z.enum(['formal', 'neutral', 'informal']).default('neutral'),
  formality: z.string().optional(),
  emoji: z.enum(['nenhum', 'moderado', 'liberal']).default('moderado'),
  signOff: z.string().optional(),
  neverSay: z.array(z.string()).default([]),
  examples: z.array(z.string()).default([]),
});
export type PersonalityProfile = z.infer<typeof personalitySchema>;

export const handoffRulesSchema = z.object({
  keywords: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  businessHoursOnly: z.boolean().default(false),
});
export type HandoffRules = z.infer<typeof handoffRulesSchema>;

export const knowledgeItemSchema = z.object({
  kind: z.enum(['url', 'text', 'upload']),
  title: z.string(),
  url: z.string().optional(),
  excerpt: z.string().optional(),
});
export type KnowledgeItem = z.infer<typeof knowledgeItemSchema>;

export const forgeAnswersSchema = z.object({
  business: z
    .object({
      description: z.string().optional(),
      brandName: z.string().optional(),
      website: z.string().optional(),
    })
    .partial()
    .default({}),
  vertical: z.enum(VERTICAL_IDS).optional(),
  verticalReason: z.string().optional(),
  goals: z.array(z.string()).default([]),
  tone: personalitySchema.optional(),
  knowledge: z.array(knowledgeItemSchema).default([]),
  tools: z.array(z.string()).default([]),
  handoff: handoffRulesSchema.optional(),
  systemPromptDraft: z.string().optional(),
  agentName: z.string().optional(),
});
export type ForgeAnswers = z.infer<typeof forgeAnswersSchema>;

export const forgeMessageRoles = ['system', 'user', 'assistant', 'tool'] as const;
export type ForgeMessageRole = (typeof forgeMessageRoles)[number];

export const forgeMessageSchema = z.object({
  id: z.string(),
  role: z.enum(forgeMessageRoles),
  content: z.string(),
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        args: z.unknown(),
        result: z.unknown().optional(),
      }),
    )
    .optional(),
  createdAt: z.string(), // ISO
});
export type ForgeMessage = z.infer<typeof forgeMessageSchema>;

/** Estado completo persistido em ForgeSession.transcript / collectedAnswers / currentPhase */
export interface ForgeState {
  sessionId: string;
  workspaceId: string;
  currentPhase: ForgePhaseId;
  transcript: ForgeMessage[];
  answers: ForgeAnswers;
}

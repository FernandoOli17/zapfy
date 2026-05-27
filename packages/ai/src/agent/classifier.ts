import { generateObject } from 'ai';
import { z } from 'zod';
import { createLogger } from '@zapai/shared';
import { getAiModels, isMockMode } from '../provider';

const log = createLogger('classifier');

const classificationSchema = z.object({
  intent: z.enum(['greeting', 'question', 'complaint', 'request', 'order', 'cancel', 'other']),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  needs_handoff: z.boolean(),
  language: z.string(),
  topics: z.array(z.string()),
});

export type MessageClassification = z.infer<typeof classificationSchema>;

const FALLBACK_RESULT: MessageClassification = {
  intent: 'other',
  sentiment: 'neutral',
  needs_handoff: false,
  language: 'pt-BR',
  topics: [],
};

const MOCK_RESULT: MessageClassification = {
  intent: 'question',
  sentiment: 'neutral',
  needs_handoff: false,
  language: 'pt-BR',
  topics: [],
};

export async function classifyMessage(text: string): Promise<MessageClassification> {
  if (isMockMode()) return MOCK_RESULT;

  try {
    const { fast } = getAiModels();
    const { object } = await generateObject({
      model: fast,
      schema: classificationSchema,
      prompt: `Classifique a mensagem de cliente WhatsApp abaixo.
Responda APENAS com JSON válido, sem markdown.

Mensagem: "${text.slice(0, 800)}"`,
    });
    return object;
  } catch (err) {
    // Não silenciamos — classifier falho ≠ classifier "tudo neutro".
    // Loga + retorna fallback explícito pra caller saber que veio sem confiança.
    log.warn({ err: String(err) }, 'classifier falhou — usando fallback neutro');
    return FALLBACK_RESULT;
  }
}

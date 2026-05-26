import { generateObject } from 'ai';
import { z } from 'zod';
import { getAiModels, isMockMode } from '../provider';

const classificationSchema = z.object({
  intent: z.enum(['greeting', 'question', 'complaint', 'request', 'order', 'cancel', 'other']),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  needs_handoff: z.boolean(),
  language: z.string(),
  topics: z.array(z.string()),
});

export type MessageClassification = z.infer<typeof classificationSchema>;

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
  } catch {
    return MOCK_RESULT;
  }
}

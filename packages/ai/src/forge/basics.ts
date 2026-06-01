import type { ForgeAnswers, VerticalId } from './types';
import { VERTICAL_META } from './verticals';

export interface ForgeBasicsInput {
  brandName: string;
  vertical: VerticalId;
  personaStyle: 'human' | 'assistant';
  goals: string[];
}

export interface ForgeBasicsResult {
  /** Patch raso pra mesclar no ForgeAnswers da sessão. */
  answers: Partial<ForgeAnswers>;
  /** 1ª mensagem do assistente, semeada no transcript (sem chamar IA). */
  openingMessage: string;
}

/**
 * Converte as respostas dos 4 passos guiados num patch de answers + a mensagem
 * de abertura do chat. PURA — sem IO, sem IA. A descrição do negócio é
 * sintetizada de nome + tipo (o passo guiado não pede uma frase descritiva).
 */
export function buildForgeBasics(input: ForgeBasicsInput): ForgeBasicsResult {
  const label = VERTICAL_META[input.vertical].label;
  const answers: Partial<ForgeAnswers> = {
    business: { brandName: input.brandName, description: `${input.brandName} — ${label}` },
    vertical: input.vertical,
    persona: { style: input.personaStyle },
    goals: input.goals,
  };
  const openingMessage =
    `Boa, ${input.brandName}! Já anotei o básico. ` +
    `Agora, pra ela responder direito: me manda o que ela precisa saber — ` +
    `cardápio, FAQ, política de troca, horários… pode colar o texto ou mandar um link. ` +
    `Se não tiver nada agora, é só dizer "não tenho" que a gente segue.`;
  return { answers, openingMessage };
}

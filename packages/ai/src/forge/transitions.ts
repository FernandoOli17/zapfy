import type { ForgeAnswers, ForgePhaseId } from './types';

/**
 * Whitelist de transições legais da state machine do Forge.
 *
 * Regra geral: avança UMA fase no fluxo canônico
 * (DISCOVERY → VERTICAL_DETECTION → GOALS → TONE → KNOWLEDGE → TOOLS →
 * HANDOFF → REVIEW → PUBLISH). Exceções explícitas:
 *
 * - VERTICAL_DETECTION → REVIEW: atalho do template (apply_template preenche
 *   goals/tone/tools/handoff e gera o systemPromptDraft de uma vez, pulando o
 *   caminho longo). Está documentado no prompt da fase VERTICAL_DETECTION.
 * - PUBLISH → REFINEMENT: loop pós-publish de ajustes pontuais.
 *
 * NÃO incluímos voltar fases nem saltos arbitrários: o LLM pulando
 * DISCOVERY → PUBLISH publica agente com answers vazios (FO-A15).
 */
export const FORGE_TRANSITIONS: Record<ForgePhaseId, readonly ForgePhaseId[]> = {
  DISCOVERY: ['VERTICAL_DETECTION'],
  VERTICAL_DETECTION: ['GOALS', 'REVIEW'],
  GOALS: ['TONE'],
  TONE: ['KNOWLEDGE'],
  KNOWLEDGE: ['TOOLS'],
  TOOLS: ['HANDOFF'],
  HANDOFF: ['REVIEW'],
  REVIEW: ['PUBLISH'],
  PUBLISH: ['REFINEMENT'],
  REFINEMENT: [],
};

export type TransitionValidation =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * PUBLISH só é alcançável com o mínimo coletado: precisa existir um
 * `systemPromptDraft` (produzido por generate_system_prompt em REVIEW ou por
 * apply_template no atalho). Sem isso, publicar geraria um prompt em cima de
 * answers praticamente vazios — promessa falsa pro dono.
 */
export function hasMinimumAnswersForPublish(answers: ForgeAnswers): boolean {
  return Boolean(answers.systemPromptDraft && answers.systemPromptDraft.trim().length > 0);
}

/**
 * Valida uma transição de fase do Forge. Retorna `ok:false` com uma mensagem
 * honesta endereçada ao LLM (sem inventar próximo passo) quando a transição é
 * ilegal ou os pré-requisitos da fase de destino não foram cumpridos.
 */
export function validatePhaseTransition(
  from: ForgePhaseId,
  to: ForgePhaseId,
  answers: ForgeAnswers,
): TransitionValidation {
  if (from === to) {
    return { ok: false, reason: `Já estamos na fase ${from} — não há o que avançar.` };
  }

  const allowed = FORGE_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    const options = allowed.length ? allowed.join(' ou ') : '(nenhuma — fase terminal)';
    return {
      ok: false,
      reason: `Transição ${from} → ${to} não é permitida. A partir de ${from} só dá pra ir pra: ${options}. Complete a fase atual antes de avançar.`,
    };
  }

  if (to === 'PUBLISH' && !hasMinimumAnswersForPublish(answers)) {
    return {
      ok: false,
      reason:
        'Não dá pra publicar ainda: o system prompt do agente não foi gerado. Passe por REVIEW e chame generate_system_prompt (ou apply_template) antes de PUBLISH.',
    };
  }

  return { ok: true };
}

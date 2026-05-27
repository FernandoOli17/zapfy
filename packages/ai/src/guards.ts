/**
 * Guardrails de entrada — detector heurístico de prompt injection.
 *
 * Não substitui defesa em profundidade (system prompt firme, tool whitelist,
 * RAG isolado), mas serve como triagem barata pra:
 *   - bloquear payloads colados de "ignore previous instructions"
 *   - reduzir surface attack de jailbreaks comuns em pt-BR/en
 *   - sinalizar caller pra adicionar handoff ou política específica
 *
 * Idiomatic: use o boolean. Pra debug, leia `reasons[]`.
 */

const INJECTION_PATTERNS: Array<{ id: string; re: RegExp }> = [
  // Instruções de override
  { id: 'override_en', re: /ignore (the )?(previous|prior|above|earlier) (instructions?|prompts?|rules?)/i },
  { id: 'override_pt', re: /ignor[ae] (as |os )?(instru[cç][oõ]es|regras|comandos) (anteriores|acima|antigas)/i },
  { id: 'forget_en', re: /forget (your|the) (system|prompt|role|instructions?)/i },
  { id: 'forget_pt', re: /esque[çc]a (suas?|as) (instru[cç][oõ]es|regras|seu papel)/i },
  // Mudança de role / personalidade
  { id: 'role_en', re: /you are now [a-z ]{2,50}(:?|\b)/i },
  { id: 'role_pt', re: /(voc[eê] (?:agora )?(?:[eé]|ser[áa]) (?:um |uma )?[a-z ]{2,50})/i },
  // Pedido de revelar prompt
  { id: 'leak_en', re: /(reveal|show|print|repeat).{0,30}(your )?(system )?(prompt|instructions?)/i },
  { id: 'leak_pt', re: /(mostre|revele|imprima|repita).{0,30}(seu )?(prompt|instru[cç][oõ]es)/i },
  // DAN / jailbreak vocab
  { id: 'jailbreak', re: /\b(DAN|do anything now|jailbreak|developer mode)\b/i },
  // Pretender ser admin/sistema
  { id: 'admin_en', re: /\b(I am |I'm )(your )?(admin|developer|creator|owner)/i },
  { id: 'admin_pt', re: /\b(sou (o |a )?(seu )?(admin|desenvolvedor|criador|dono))\b/i },
];

const MAX_TEXT_LEN_FOR_SCAN = 4000;
const MAX_REPEAT_RATIO = 0.7; // texto >70% mesma char/seq → flood

export interface GuardResult {
  injection: boolean;
  reasons: string[];
  flagged: boolean;
}

/**
 * Roda detectores baratos sobre o texto de entrada do contato.
 * Retorna `injection: true` se algum padrão bateu.
 */
export function detectPromptInjection(rawText: string): GuardResult {
  const reasons: string[] = [];
  const text = rawText.slice(0, MAX_TEXT_LEN_FOR_SCAN);

  for (const p of INJECTION_PATTERNS) {
    if (p.re.test(text)) reasons.push(p.id);
  }

  // Flood / repetição (alguns ataques fazem padding com gibberish)
  if (text.length > 200 && repeatRatio(text) > MAX_REPEAT_RATIO) {
    reasons.push('repetition_flood');
  }

  return {
    injection: reasons.length > 0,
    reasons,
    flagged: reasons.length > 0,
  };
}

function repeatRatio(text: string): number {
  if (text.length === 0) return 0;
  // simplificação: razão entre tamanho original e set único de tri-gramas
  const grams = new Set<string>();
  for (let i = 0; i < text.length - 2; i++) {
    grams.add(text.slice(i, i + 3));
  }
  const unique = grams.size;
  const total = text.length - 2;
  if (total <= 0) return 0;
  return 1 - unique / total;
}

/**
 * Wrapper conveniente: aplica também a blacklist de tópicos do workspace.
 */
export interface TopicBlacklist {
  keywords: string[];
}

export function detectBlockedTopics(text: string, list: TopicBlacklist): string[] {
  if (list.keywords.length === 0) return [];
  const lower = text.toLowerCase();
  return list.keywords.filter((k) => k.length >= 3 && lower.includes(k.toLowerCase()));
}

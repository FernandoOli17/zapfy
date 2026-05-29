/**
 * Detector de alucinação de FATO DE NEGÓCIO (guardrail nº 1 do motor).
 *
 * Regra do AI_ENGINE_PROMPT §5: preço, estoque, prazo, horário e política só
 * podem sair de uma tool ou do RAG. Se a resposta AFIRMA um desses fatos com
 * número concreto e não houve fonte (tool de dados usada OU o número aparece no
 * RAG), é alucinação — falha grave no eval.
 *
 * É heurístico e deliberadamente conservador: só flagra quando há um número
 * concreto sendo afirmado. "Posso verificar o preço pra você" não dispara;
 * "Custa R$ 89,90" sem fonte dispara. Falso negativo (deixar passar) é pior que
 * falso positivo aqui, mas linguagem de verificação/escalonamento é segura.
 */

export type BusinessFactKind = 'price' | 'stock' | 'eta' | 'hours' | 'policy';

export interface HallucinationFinding {
  kind: BusinessFactKind;
  /** Trecho da resposta que disparou (pra debug/relatório). */
  evidence: string;
}

export interface HallucinationInput {
  /** Texto que a IA respondeu ao cliente. */
  reply: string;
  /** Nomes das tools chamadas no turn (de RunAgentResult.toolsUsed). */
  toolsUsed: string[];
  /** Chunks de RAG injetados no prompt (conteúdo serve de fonte). */
  ragChunks?: Array<{ content: string; title?: string }>;
}

export interface HallucinationResult {
  hallucinated: boolean;
  findings: HallucinationFinding[];
}

/**
 * Tools que legitimamente trazem fato de negócio. Se uma delas foi usada,
 * consideramos que a resposta tem fonte (não alucinou). Mantida ampla de
 * propósito — falta de fonte só pega quando NENHUMA tool de dados rodou.
 */
const SOURCING_TOOLS = new Set<string>([
  'search_knowledge',
  'list_products',
  'recommend_product',
  'track_order',
  'apply_coupon',
  'send_checkout_link',
  'get_business_hours',
  'check_availability',
  'list_available_slots',
  'book_appointment',
  'get_menu',
  'check_delivery_eta',
  'request_quote',
  'send_proposal',
]);

interface FactPattern {
  kind: BusinessFactKind;
  re: RegExp;
}

/**
 * Padrões que indicam AFIRMAÇÃO de fato concreto. Todos exigem um número
 * (ou faixa) — texto vago não conta.
 */
const FACT_PATTERNS: FactPattern[] = [
  // Preço: "R$ 89,90", "89 reais", "custa 120"
  { kind: 'price', re: /r\$\s?\d/i },
  { kind: 'price', re: /\d+(?:[.,]\d{1,2})?\s*reais\b/i },
  { kind: 'price', re: /\b(?:custa|sai por|fica em|valor de|pre[çc]o (?:de|é))\s*(?:r\$\s*)?\d/i },
  // Estoque: "3 unidades", "temos 10 em estoque", "5 disponíveis"
  { kind: 'stock', re: /\d+\s*(?:unidades?|em estoque|dispon[ií]ve(?:l|is)|pe[çc]as?)\b/i },
  { kind: 'stock', re: /\b(?:temos|restam|sobrar(?:am|aram)|h[áa])\s+\d+\s+(?:em estoque|unidades?)/i },
  // Prazo/ETA: "entrega em 3 dias", "fica pronto em 2 horas", "prazo de 5 dias"
  { kind: 'eta', re: /\b(?:entrega|prazo|fica pronto|chega|leva|demora)\b[^.!?\n]{0,30}?\d+\s*(?:dias?|horas?|h\b|minutos?|min\b|semanas?)/i },
  // Horário: "das 9h às 18h", "abrimos às 8h", "funciona até 22h"
  { kind: 'hours', re: /\bdas?\s*\d{1,2}\s*h?(?:\d{2})?\s*[àa]s?\s*\d{1,2}\s*h?(?:\d{2})?/i },
  { kind: 'hours', re: /\b(?:abre|abrimos|fecha|fechamos|funciona(?:mos)?|atende(?:mos)?|at[ée])\b[^.!?\n]{0,20}?\d{1,2}\s*h/i },
  // Política: "garantia de 90 dias", "troca em até 7 dias", "reembolso em 30 dias"
  { kind: 'policy', re: /\b(?:garantia|troca|devolu[çc][ãa]o|reembolso|cancelamento)\b[^.!?\n]{0,30}?\d+\s*(?:dias?|meses?|horas?)/i },
];

/** Extrai os números (como string) de um trecho, pra checar presença no RAG. */
function numbersIn(text: string): string[] {
  return (text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.'));
}

export function detectHallucination(input: HallucinationInput): HallucinationResult {
  const reply = input.reply ?? '';
  const usedSourcingTool = input.toolsUsed.some((t) => SOURCING_TOOLS.has(t));
  const ragText = (input.ragChunks ?? []).map((c) => c.content).join('\n').toLowerCase();

  const findings: HallucinationFinding[] = [];

  for (const sentence of splitSentences(reply)) {
    for (const pat of FACT_PATTERNS) {
      const m = pat.re.exec(sentence);
      if (!m) continue;

      // Fonte 1: rodou uma tool de dados neste turn.
      if (usedSourcingTool) continue;

      // Fonte 2: o(s) número(s) afirmado(s) aparecem no RAG injetado.
      const nums = numbersIn(sentence);
      const groundedInRag =
        ragText.length > 0 && nums.length > 0 && nums.every((n) => ragText.includes(n));
      if (groundedInRag) continue;

      findings.push({ kind: pat.kind, evidence: sentence.trim().slice(0, 160) });
      break; // um finding por sentença basta
    }
  }

  return { hallucinated: findings.length > 0, findings };
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

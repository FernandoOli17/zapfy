/**
 * Medidor de custo de IA — converte contagem de tokens em custo (USD/BRL).
 *
 * Por que existe: a unidade de cobrança do Trato é "conversa de IA" e a margem
 * depende de quanto cada conversa custa em tokens. Este módulo é a fonte única
 * de preço — usado pelo worker (popula `UsageRecord.costCents`) e pelo eval
 * harness (custo por conversa dourada).
 *
 * ⚠️ Preços são estimativas e MUDAM. Confira na página de pricing da Anthropic
 * (https://www.anthropic.com/pricing) e da Voyage antes de tomar decisão de
 * margem com número fechado. Override por env quando precisar ajustar sem deploy.
 *
 * Tudo em USD por 1.000.000 de tokens (USD/MTok).
 */

export interface ModelPricing {
  /** Input não-cacheado (USD/MTok). */
  inputPerM: number;
  /** Output gerado (USD/MTok). */
  outputPerM: number;
  /** Input lido do cache — Anthropic cobra ~10% do input normal (USD/MTok). */
  cachedInputPerM: number;
}

/**
 * Tabela de preços por família de modelo. A chave é casada por substring
 * (case-insensitive) contra o id do modelo, então `claude-sonnet-4-5` e
 * overrides com sufixo de data caem no mesmo bucket.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude Sonnet 4.5 — agente principal
  sonnet: { inputPerM: 3.0, outputPerM: 15.0, cachedInputPerM: 0.3 },
  // Claude Haiku 4.5 — classifier / casos triviais
  haiku: { inputPerM: 1.0, outputPerM: 5.0, cachedInputPerM: 0.1 },
  // OpenAI (fallback de provider) — gpt-4o / gpt-4o-mini
  'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6, cachedInputPerM: 0.075 },
  'gpt-4o': { inputPerM: 2.5, outputPerM: 10.0, cachedInputPerM: 1.25 },
};

/** Voyage voyage-3: ~$0.06 / MTok (só input; embeddings não têm output). */
export const EMBEDDING_PRICE_PER_M = 0.06;

/** Câmbio USD→BRL. Override via env `USD_BRL_RATE`. */
export function usdBrlRate(): number {
  const raw = Number(process.env['USD_BRL_RATE']);
  return Number.isFinite(raw) && raw > 0 ? raw : 5.2;
}

export interface TokenUsage {
  tokensIn: number;
  tokensOut: number;
  /** Porção do input lida do cache (subconjunto de tokensIn). Default 0. */
  cachedTokensIn?: number;
}

function pricingFor(model: string): ModelPricing {
  const id = model.toLowerCase();
  for (const key of Object.keys(MODEL_PRICING)) {
    if (id.includes(key)) return MODEL_PRICING[key] as ModelPricing;
  }
  // Desconhecido → assume o mais caro (sonnet) pra não subestimar margem.
  return MODEL_PRICING['sonnet'] as ModelPricing;
}

/**
 * Custo em USD de uma chamada. Tokens cacheados são cobrados na tarifa de cache;
 * o restante do input na tarifa cheia; output sempre na tarifa de output.
 */
export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const p = pricingFor(model);
  const cached = Math.max(0, Math.min(usage.cachedTokensIn ?? 0, usage.tokensIn));
  const uncachedIn = usage.tokensIn - cached;
  const usd =
    (uncachedIn * p.inputPerM) / 1_000_000 +
    (cached * p.cachedInputPerM) / 1_000_000 +
    (usage.tokensOut * p.outputPerM) / 1_000_000;
  return usd;
}

/** Custo em USD cents arredondado pra cima (≥1 cent se houve gasto) — pro DB. */
export function estimateCostCents(model: string, usage: TokenUsage): number {
  const usd = estimateCostUsd(model, usage);
  if (usd <= 0) return 0;
  return Math.max(1, Math.ceil(usd * 100));
}

export function estimateEmbeddingCostUsd(tokens: number): number {
  return (Math.max(0, tokens) * EMBEDDING_PRICE_PER_M) / 1_000_000;
}

export function usdToBrl(usd: number): number {
  return usd * usdBrlRate();
}

/** Formata USD em BRL legível (ex.: "R$ 0,0123"). */
export function formatBrl(usd: number): string {
  const brl = usdToBrl(usd);
  return `R$ ${brl.toFixed(4).replace('.', ',')}`;
}

export interface ConversationCost {
  model: string;
  usd: number;
  brl: number;
  cents: number;
  /** Razão de tokens lidos do cache sobre o input total (0–1). */
  cacheHitRatio: number;
}

/** Resumo de custo de uma conversa/turn, pronto pra log e relatório. */
export function summarizeCost(model: string, usage: TokenUsage): ConversationCost {
  const usd = estimateCostUsd(model, usage);
  const cacheHitRatio =
    usage.tokensIn > 0 ? Math.min(1, (usage.cachedTokensIn ?? 0) / usage.tokensIn) : 0;
  return {
    model,
    usd,
    brl: usdToBrl(usd),
    cents: estimateCostCents(model, usage),
    cacheHitRatio,
  };
}

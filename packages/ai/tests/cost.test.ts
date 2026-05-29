import { describe, it, expect } from 'vitest';
import {
  estimateCostUsd,
  estimateCostCents,
  estimateEmbeddingCostUsd,
  formatBrl,
  summarizeCost,
} from '../src/cost/pricing';

describe('cost/pricing', () => {
  it('cobra input do Sonnet a $3/MTok', () => {
    expect(estimateCostUsd('claude-sonnet-4-5', { tokensIn: 1_000_000, tokensOut: 0 })).toBeCloseTo(
      3.0,
      6,
    );
  });

  it('cobra output do Sonnet a $15/MTok', () => {
    expect(estimateCostUsd('claude-sonnet-4-5', { tokensIn: 0, tokensOut: 1_000_000 })).toBeCloseTo(
      15.0,
      6,
    );
  });

  it('aplica desconto de cache no input lido do cache', () => {
    // 1M input, tudo do cache → tarifa de cache (0.3/MTok)
    expect(
      estimateCostUsd('claude-sonnet-4-5', {
        tokensIn: 1_000_000,
        tokensOut: 0,
        cachedTokensIn: 1_000_000,
      }),
    ).toBeCloseTo(0.3, 6);
  });

  it('mistura input cacheado e não-cacheado', () => {
    // 0.5M cheio ($1.5) + 0.5M cache ($0.15) = $1.65
    expect(
      estimateCostUsd('claude-sonnet-4-5', {
        tokensIn: 1_000_000,
        tokensOut: 0,
        cachedTokensIn: 500_000,
      }),
    ).toBeCloseTo(1.65, 6);
  });

  it('Haiku é mais barato que Sonnet no mesmo input', () => {
    const usage = { tokensIn: 1_000_000, tokensOut: 0 };
    expect(estimateCostUsd('claude-haiku-4-5', usage)).toBeLessThan(
      estimateCostUsd('claude-sonnet-4-5', usage),
    );
  });

  it('modelo desconhecido assume preço do Sonnet (não subestima)', () => {
    const usage = { tokensIn: 1_000_000, tokensOut: 0 };
    expect(estimateCostUsd('modelo-novo-xyz', usage)).toBeCloseTo(
      estimateCostUsd('claude-sonnet-4-5', usage),
      6,
    );
  });

  it('cents arredonda pra cima e nunca zera um gasto real', () => {
    const cents = estimateCostCents('claude-haiku-4-5', { tokensIn: 150, tokensOut: 50 });
    expect(cents).toBeGreaterThanOrEqual(1);
  });

  it('cents é 0 quando não houve gasto', () => {
    expect(estimateCostCents('claude-sonnet-4-5', { tokensIn: 0, tokensOut: 0 })).toBe(0);
  });

  it('embedding voyage-3 a $0.06/MTok', () => {
    expect(estimateEmbeddingCostUsd(1_000_000)).toBeCloseTo(0.06, 6);
  });

  it('formatBrl devolve string em reais', () => {
    expect(formatBrl(1)).toContain('R$');
  });

  it('summarizeCost calcula cacheHitRatio', () => {
    const s = summarizeCost('claude-sonnet-4-5', {
      tokensIn: 1000,
      tokensOut: 100,
      cachedTokensIn: 800,
    });
    expect(s.cacheHitRatio).toBeCloseTo(0.8, 6);
    expect(s.cents).toBeGreaterThanOrEqual(1);
  });
});

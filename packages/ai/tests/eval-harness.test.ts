import { describe, it, expect } from 'vitest';
import { runEval } from '../src/eval/harness';
import { GOLDEN_CASES } from '../src/eval/golden';
import type { GoldenCase, Responder, TurnResult } from '../src/eval/metrics';

const CASES: GoldenCase[] = [
  {
    id: 'unit-1',
    vertical: 'X',
    description: 'caso de teste',
    systemPrompt: '',
    toneBrief: '',
    turns: [
      {
        user: 'quanto custa?',
        expect: { expectTool: 'list_products', toneMarkers: ['olá'], forbidHallucination: true },
      },
      { user: 'quero falar com humano', expect: { expectHandoff: true } },
    ],
  },
];

function result(partial: Partial<TurnResult>): TurnResult {
  return {
    text: '',
    toolsUsed: [],
    ragChunks: [],
    handedOff: false,
    tokensIn: 1000,
    tokensOut: 200,
    cachedTokensIn: 0,
    model: 'claude-sonnet-4-5',
    ...partial,
  };
}

describe('runEval', () => {
  it('métricas perfeitas com responder ideal', async () => {
    const good: Responder = async ({ turn }) => {
      if (turn.expect.expectHandoff) {
        return result({ text: 'Vou te transferir pra um atendente. 🙌', toolsUsed: ['transfer_to_human'], handedOff: true });
      }
      return result({ text: 'Olá! Deixa eu consultar pra você.', toolsUsed: ['list_products'] });
    };
    const { metrics } = await runEval(CASES, good);
    expect(metrics.toolAccuracy).toBe(1);
    expect(metrics.handoffAccuracy).toBe(1);
    expect(metrics.toneAdherence).toBe(1);
    expect(metrics.hallucinationRate).toBe(0);
    expect(metrics.totalCostUsd).toBeGreaterThan(0);
  });

  it('detecta alucinação de responder que inventa preço', async () => {
    const bad: Responder = async () =>
      result({ text: 'Custa R$ 99,90 e entrega em 2 dias.', toolsUsed: [] });
    const { metrics } = await runEval(CASES, bad);
    expect(metrics.hallucinationRate).toBeGreaterThan(0);
    expect(metrics.toolAccuracy).toBe(0); // não usou list_products
  });

  it('cacheHitRatio reflete tokens lidos do cache', async () => {
    const cached: Responder = async ({ turn }) =>
      turn.expect.expectHandoff
        ? result({ toolsUsed: ['transfer_to_human'], handedOff: true, cachedTokensIn: 800 })
        : result({ toolsUsed: ['list_products'], cachedTokensIn: 800 });
    const { metrics } = await runEval(CASES, cached);
    expect(metrics.cacheHitRatio).toBeCloseTo(0.8, 2);
  });
});

describe('GOLDEN_CASES', () => {
  it('dataset é não-vazio e bem-formado', () => {
    expect(GOLDEN_CASES.length).toBeGreaterThan(0);
    for (const c of GOLDEN_CASES) {
      expect(c.id).toBeTruthy();
      expect(c.systemPrompt.length).toBeGreaterThan(20);
      expect(c.turns.length).toBeGreaterThan(0);
    }
  });

  it('ids são únicos', () => {
    const ids = GOLDEN_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cobre múltiplos verticais', () => {
    const verticals = new Set(GOLDEN_CASES.map((c) => c.vertical));
    expect(verticals.size).toBeGreaterThanOrEqual(3);
  });
});

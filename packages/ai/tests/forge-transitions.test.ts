import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockLanguageModelV3 } from 'ai/test';

import {
  validatePhaseTransition,
  hasMinimumAnswersForPublish,
  FORGE_TRANSITIONS,
} from '../src/forge/transitions';
import type { ForgeAnswers, ForgeState } from '../src/forge/types';
import type * as providerModule from '../src/provider';

/**
 * Regressão FO-A15 (TASK-0034): advance_phase aceitava QUALQUER fase e o engine
 * aplicava sem validar. O LLM podia pular DISCOVERY → PUBLISH e o turno seguinte
 * publicava um agente com answers vazios.
 *
 * Lei: transição só é legal se for adjacente no fluxo canônico ou estiver na
 * whitelist de atalhos (VERTICAL_DETECTION → REVIEW do template, PUBLISH →
 * REFINEMENT). PUBLISH exige systemPromptDraft (answers mínimos).
 */

const emptyAnswers: ForgeAnswers = {
  business: {},
  goals: [],
  knowledge: [],
  tools: [],
};

describe('validatePhaseTransition — whitelist por fase', () => {
  it('aceita o avanço adjacente do fluxo canônico', () => {
    expect(validatePhaseTransition('DISCOVERY', 'VERTICAL_DETECTION', emptyAnswers).ok).toBe(true);
    expect(validatePhaseTransition('GOALS', 'TONE', emptyAnswers).ok).toBe(true);
    expect(validatePhaseTransition('HANDOFF', 'REVIEW', emptyAnswers).ok).toBe(true);
  });

  it('aceita o atalho do template VERTICAL_DETECTION → REVIEW', () => {
    expect(validatePhaseTransition('VERTICAL_DETECTION', 'REVIEW', emptyAnswers).ok).toBe(true);
  });

  it('aceita o loop pós-publish PUBLISH → REFINEMENT', () => {
    expect(validatePhaseTransition('PUBLISH', 'REFINEMENT', emptyAnswers).ok).toBe(true);
  });

  it('REJEITA o salto DISCOVERY → PUBLISH (o bug)', () => {
    const r = validatePhaseTransition('DISCOVERY', 'PUBLISH', emptyAnswers);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/não é permitida/i);
  });

  it('REJEITA voltar fases (REVIEW → GOALS)', () => {
    expect(validatePhaseTransition('REVIEW', 'GOALS', emptyAnswers).ok).toBe(false);
  });

  it('REJEITA transição pra mesma fase', () => {
    expect(validatePhaseTransition('GOALS', 'GOALS', emptyAnswers).ok).toBe(false);
  });

  it('REVIEW → PUBLISH é bloqueado sem systemPromptDraft (answers mínimos)', () => {
    const r = validatePhaseTransition('REVIEW', 'PUBLISH', emptyAnswers);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/system prompt/i);
  });

  it('REVIEW → PUBLISH passa quando há systemPromptDraft', () => {
    const withDraft: ForgeAnswers = { ...emptyAnswers, systemPromptDraft: 'Você é o robô da Loja X.' };
    expect(validatePhaseTransition('REVIEW', 'PUBLISH', withDraft).ok).toBe(true);
  });
});

describe('hasMinimumAnswersForPublish', () => {
  it('false sem draft / draft vazio', () => {
    expect(hasMinimumAnswersForPublish(emptyAnswers)).toBe(false);
    expect(hasMinimumAnswersForPublish({ ...emptyAnswers, systemPromptDraft: '   ' })).toBe(false);
  });
  it('true com draft não-vazio', () => {
    expect(hasMinimumAnswersForPublish({ ...emptyAnswers, systemPromptDraft: 'algo' })).toBe(true);
  });
});

describe('FORGE_TRANSITIONS — invariantes da whitelist', () => {
  it('REFINEMENT é terminal (nenhuma saída)', () => {
    expect(FORGE_TRANSITIONS.REFINEMENT).toEqual([]);
  });
  it('nenhuma fase pode ir direto pra PUBLISH exceto REVIEW', () => {
    for (const [from, tos] of Object.entries(FORGE_TRANSITIONS)) {
      if (from === 'REVIEW') continue;
      expect(tos).not.toContain('PUBLISH');
    }
  });
});

// =========================================================================
// Integração: o engine REALMENTE não muda de fase quando o LLM chama
// advance_phase com uma transição ilegal. Sem o fix, o phase pulava.
// =========================================================================

vi.mock('../src/provider', async (importOriginal) => {
  const actual = await importOriginal<typeof providerModule>();
  return { ...actual, getAiModels: vi.fn() };
});

import { getAiModels } from '../src/provider';
import { runForgeStep, type ForgeEngineIo } from '../src/forge/engine';

const ORIGINAL_MOCK_AI = process.env['MOCK_AI'];
beforeEach(() => {
  process.env['MOCK_AI'] = 'false';
});
afterEach(() => {
  if (ORIGINAL_MOCK_AI === undefined) delete process.env['MOCK_AI'];
  else process.env['MOCK_AI'] = ORIGINAL_MOCK_AI;
  vi.clearAllMocks();
});

function advancePhaseCall(to: string) {
  return {
    content: [
      {
        type: 'tool-call' as const,
        toolCallId: 'call-1',
        toolName: 'advance_phase',
        input: JSON.stringify({ to }),
      },
    ],
    finishReason: { unified: 'tool-calls' as const, raw: 'tool_use' },
    usage: {
      inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 5, text: 5, reasoning: 0 },
    },
    warnings: [],
  };
}

function plainText(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
    finishReason: { unified: 'stop' as const, raw: 'end_turn' },
    usage: {
      inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 3, text: 3, reasoning: 0 },
    },
    warnings: [],
  };
}

function baseState(): ForgeState {
  return {
    sessionId: 's1',
    workspaceId: 'ws1',
    currentPhase: 'DISCOVERY',
    transcript: [],
    answers: { ...emptyAnswers },
  };
}

function makeIo(publishSpy: ReturnType<typeof vi.fn>): ForgeEngineIo {
  return {
    scrapeUrl: async () => ({ ok: false as const, reason: 'fetch', message: 'n/a' }),
    publishAgentVersion: publishSpy as never,
    suggestToolsForVertical: async () => [],
  };
}

describe('runForgeStep — bloqueio de transição ilegal end-to-end', () => {
  it('LLM tentando DISCOVERY → PUBLISH NÃO avança e NÃO publica', async () => {
    let step = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        step += 1;
        // 1º step: tenta pular pra PUBLISH (ilegal). 2º step: encerra com texto.
        return step === 1 ? advancePhaseCall('PUBLISH') : plainText('beleza');
      },
    });
    vi.mocked(getAiModels).mockReturnValue({
      provider: 'anthropic',
      chat: model as never,
      fast: model as never,
    });

    const publishSpy = vi.fn();
    const res = await runForgeStep({
      state: baseState(),
      userMessage: 'quero publicar já',
      io: makeIo(publishSpy),
      maxSteps: 3,
    });

    expect(res.phaseChanged).toBe(false);
    expect(res.newState.currentPhase).toBe('DISCOVERY');
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('LLM avançando DISCOVERY → VERTICAL_DETECTION (legal) avança', async () => {
    let step = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        step += 1;
        return step === 1 ? advancePhaseCall('VERTICAL_DETECTION') : plainText('ok');
      },
    });
    vi.mocked(getAiModels).mockReturnValue({
      provider: 'anthropic',
      chat: model as never,
      fast: model as never,
    });

    const res = await runForgeStep({
      state: baseState(),
      userMessage: 'somos uma pizzaria',
      io: makeIo(vi.fn()),
      maxSteps: 3,
    });

    expect(res.phaseChanged).toBe(true);
    expect(res.newState.currentPhase).toBe('VERTICAL_DETECTION');
  });
});

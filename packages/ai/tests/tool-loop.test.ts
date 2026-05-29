import { describe, it, expect, afterEach } from 'vitest';
import { MockLanguageModelV3 } from 'ai/test';
import { runAgent, type RunAgentInput } from '../src/agent/runner';

/**
 * Prova o guardrail do tool loop (TASK-0013): max iterations + timeout.
 * Usa um modelo mock — zero token, determinístico. Sem isso, um modelo que
 * insiste em chamar tool entraria em loop infinito (bug crítico).
 */

const ORIGINAL_MOCK_AI = process.env['MOCK_AI'];
afterEach(() => {
  if (ORIGINAL_MOCK_AI === undefined) delete process.env['MOCK_AI'];
  else process.env['MOCK_AI'] = ORIGINAL_MOCK_AI;
});

function baseInput(overrides: Partial<RunAgentInput>): RunAgentInput {
  return {
    systemPrompt: 'Você é um atendente de teste.',
    vertical: 'OTHER',
    messageHistory: [],
    inboundText: 'oi, tudo bem?',
    ragChunks: [],
    globalDeps: {
      workspaceId: 'ws',
      contactId: 'c',
      conversationId: 'conv',
      searchKnowledge: async () => [],
      setContactField: async () => {},
      transferToHuman: async () => {},
      sendTemplate: async () => {},
    },
    verticalDeps: { workspaceId: 'ws', contactId: 'c', conversationId: 'conv' },
    ...overrides,
  };
}

function toolCallResult(id: string) {
  return {
    content: [
      {
        type: 'tool-call' as const,
        toolCallId: id,
        toolName: 'search_knowledge',
        input: JSON.stringify({ query: 'qualquer coisa' }),
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

describe('runAgent — guardrails do tool loop', () => {
  it('respeita maxSteps e não chama o modelo além do limite', async () => {
    process.env['MOCK_AI'] = 'false';
    let n = 0;
    const model = new MockLanguageModelV3({
      // sempre devolve uma tool call → tentaria loopar pra sempre
      doGenerate: async () => toolCallResult(`call-${++n}`),
    });

    const res = await runAgent(baseInput({ model: model as never, maxSteps: 3 }));

    expect(model.doGenerateCalls.length).toBe(3);
    expect(res.toolsUsed.length).toBeLessThanOrEqual(3);
  });

  it('aborta no timeout em vez de pendurar', async () => {
    process.env['MOCK_AI'] = 'false';
    const model = new MockLanguageModelV3({
      doGenerate: (options: { abortSignal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.abortSignal?.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true },
          );
        }) as never,
    });

    const res = await runAgent(baseInput({ model: model as never, timeoutMs: 150 }));

    expect(res.text).toContain('tempo demais');
  }, 5000);
});

import { z } from 'zod';

/**
 * Modelo de dados do flow editor (modo desenvolvedor).
 *
 * Persistido em `AgentVersion.flowGraph` como JSON. Validado via
 * `flowGraphSchema` no save e no load — garante consistência mesmo se
 * alguém editar o JSON direto no DB.
 *
 * Convenções:
 *  - Todo grafo precisa de exatamente 1 node tipo TRIGGER (entry point).
 *  - Edges representam fluxo de execução. Multiple edges saindo de um node
 *    = ramificação (BRANCH evaluates).
 *  - `condition` no edge: expressão simples evaluada pelo executor.
 *    Default: 'true' (sempre passa).
 */

export const NODE_KINDS = [
  'TRIGGER',
  'CLASSIFY',
  'RAG_SEARCH',
  'TOOL_CALL',
  'AGENT_RESPONSE',
  'BRANCH',
  'HANDOFF',
  'END',
] as const;

export const flowNodeKindSchema = z.enum(NODE_KINDS);
export type FlowNodeKind = z.infer<typeof flowNodeKindSchema>;

/** Posição na canvas (ReactFlow). Não afeta execução, só UI. */
export const flowPositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

/** Config livre por kind — schemas estritos pelos discriminated union abaixo. */
const baseNodeSchema = z.object({
  id: z.string().min(1).max(64),
  position: flowPositionSchema,
  label: z.string().max(80).optional(),
});

export const flowNodeSchema = z.discriminatedUnion('kind', [
  baseNodeSchema.extend({
    kind: z.literal('TRIGGER'),
    /** Filtra qual tipo de mensagem dispara esse fluxo (default: text). */
    config: z
      .object({
        messageTypes: z.array(z.enum(['text', 'image', 'audio', 'doc', 'any'])).default(['text']),
      })
      .default({ messageTypes: ['text'] }),
  }),
  baseNodeSchema.extend({
    kind: z.literal('CLASSIFY'),
    config: z
      .object({
        // Roda o classifier Haiku — output disponível como $classification no scope
      })
      .default({}),
  }),
  baseNodeSchema.extend({
    kind: z.literal('RAG_SEARCH'),
    config: z
      .object({
        topK: z.number().int().min(1).max(20).default(4),
      })
      .default({ topK: 4 }),
  }),
  baseNodeSchema.extend({
    kind: z.literal('TOOL_CALL'),
    config: z.object({
      /** Nome da tool — pode ser global (`search_knowledge`) ou customTool. */
      toolName: z.string().min(1).max(64),
      /** Args estáticos opcionais (override do que o LLM passaria). */
      staticArgs: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  baseNodeSchema.extend({
    kind: z.literal('AGENT_RESPONSE'),
    config: z
      .object({
        /** Sobrepõe maxSteps. Default 5. */
        maxSteps: z.number().int().min(1).max(10).default(5),
        /** Sobrepõe timeoutMs. Default 30000. */
        timeoutMs: z.number().int().min(1000).max(120000).default(30_000),
        /** Permite tools globais nesse node. Default true. */
        allowGlobalTools: z.boolean().default(true),
      })
      .default({ maxSteps: 5, timeoutMs: 30_000, allowGlobalTools: true }),
  }),
  baseNodeSchema.extend({
    kind: z.literal('BRANCH'),
    config: z.object({
      /**
       * Expressão a avaliar contra o scope. Sintaxe limitada (parsing
       * em `executor.ts:evalExpression`):
       *  - `$classification.needs_handoff === true`
       *  - `$inboundText contains "preço"`
       *  - `$rag.length > 0`
       * Sem `eval`/`Function` — parser próprio, seguro.
       */
      expression: z.string().min(1).max(200),
    }),
  }),
  baseNodeSchema.extend({
    kind: z.literal('HANDOFF'),
    config: z
      .object({
        reason: z.string().max(200).default('Transferência manual via flow'),
      })
      .default({ reason: 'Transferência manual via flow' }),
  }),
  baseNodeSchema.extend({
    kind: z.literal('END'),
    config: z.object({}).default({}),
  }),
]);

export type FlowNode = z.infer<typeof flowNodeSchema>;

export const flowEdgeSchema = z.object({
  id: z.string().min(1).max(80),
  source: z.string().min(1).max(64),
  target: z.string().min(1).max(64),
  /** Branch result: 'true', 'false', ou expressão. Default 'true'. */
  condition: z.enum(['true', 'false', 'any']).default('any'),
  label: z.string().max(40).optional(),
});

export type FlowEdge = z.infer<typeof flowEdgeSchema>;

export const flowGraphSchema = z
  .object({
    nodes: z.array(flowNodeSchema).min(1).max(50),
    edges: z.array(flowEdgeSchema).max(100),
    /** Schema version pra migrations futuras. */
    version: z.literal(1).default(1),
  })
  .superRefine((graph, ctx) => {
    // Exige exatamente 1 TRIGGER
    const triggers = graph.nodes.filter((n) => n.kind === 'TRIGGER');
    if (triggers.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: `Flow precisa ter exatamente 1 node TRIGGER (encontrados: ${triggers.length})`,
      });
    }
    // IDs únicos
    const ids = new Set<string>();
    for (const n of graph.nodes) {
      if (ids.has(n.id)) {
        ctx.addIssue({ code: 'custom', message: `Node id duplicado: ${n.id}` });
      }
      ids.add(n.id);
    }
    // Edges referem a IDs existentes
    for (const e of graph.edges) {
      if (!ids.has(e.source)) {
        ctx.addIssue({ code: 'custom', message: `Edge ${e.id} aponta source desconhecido: ${e.source}` });
      }
      if (!ids.has(e.target)) {
        ctx.addIssue({ code: 'custom', message: `Edge ${e.id} aponta target desconhecido: ${e.target}` });
      }
    }
  });

export type FlowGraph = z.infer<typeof flowGraphSchema>;

/** Helper de criação de grafo default — usado quando user liga dev mode. */
export function defaultFlowGraph(): FlowGraph {
  return {
    version: 1,
    nodes: [
      { id: 'trigger', kind: 'TRIGGER', position: { x: 0, y: 0 }, config: { messageTypes: ['text'] } },
      { id: 'classify', kind: 'CLASSIFY', position: { x: 0, y: 120 }, config: {} },
      { id: 'rag', kind: 'RAG_SEARCH', position: { x: 0, y: 240 }, config: { topK: 4 } },
      {
        id: 'agent',
        kind: 'AGENT_RESPONSE',
        position: { x: 0, y: 360 },
        config: { maxSteps: 5, timeoutMs: 30_000, allowGlobalTools: true },
      },
      { id: 'end', kind: 'END', position: { x: 0, y: 480 }, config: {} },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'classify', condition: 'any' },
      { id: 'e2', source: 'classify', target: 'rag', condition: 'any' },
      { id: 'e3', source: 'rag', target: 'agent', condition: 'any' },
      { id: 'e4', source: 'agent', target: 'end', condition: 'any' },
    ],
  };
}

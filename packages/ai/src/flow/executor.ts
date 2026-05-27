import { createLogger } from '@zapai/shared';
import { classifyMessage, type MessageClassification } from '../agent/classifier';
import { searchKnowledge, type RagChunk } from '../agent/rag';
import { runAgent, type RunAgentInput, type RunAgentResult } from '../agent/runner';
import { evalExpression } from './expression';
import { flowGraphSchema, type FlowGraph, type FlowNode } from './types';

const log = createLogger('flow:executor');

/**
 * Resultado final da execução do flow — formato esperado pelo worker
 * (mesma shape do `RunAgentResult` pra ser drop-in replaceable).
 */
export interface FlowExecutionResult {
  text: string;
  toolsUsed: string[];
  tokensIn: number;
  tokensOut: number;
  handedOff: boolean;
  guardTriggered: boolean;
  guardReasons: string[];
  /** Trace dos nodes percorridos — útil pra debug + inbox UI. */
  trace: Array<{ nodeId: string; kind: string; tookMs: number; outcome: string }>;
}

/** Input do executor — superset do RunAgentInput porque precisamos do graph. */
export interface ExecuteFlowInput extends Omit<RunAgentInput, 'inboundText'> {
  inboundText: string;
  flowGraph: unknown; // será validado por Zod
  /** Tipo da mensagem original (filtra TRIGGER). */
  messageType?: 'text' | 'image' | 'audio' | 'doc' | 'any';
}

/** Limite total de nodes executados por turn — evita loop infinito. */
const MAX_NODES_VISITED = 30;

export async function executeFlow(input: ExecuteFlowInput): Promise<FlowExecutionResult> {
  // 1) Validar graph
  const parsed = flowGraphSchema.safeParse(input.flowGraph);
  if (!parsed.success) {
    log.error({ issues: parsed.error.issues }, 'flow graph inválido — fallback pra runner default');
    throw new Error(`Flow graph inválido: ${parsed.error.issues[0]?.message ?? 'desconhecido'}`);
  }
  const graph: FlowGraph = parsed.data;

  // 2) Encontrar TRIGGER
  const trigger = graph.nodes.find((n) => n.kind === 'TRIGGER');
  if (!trigger) {
    throw new Error('Flow sem node TRIGGER');
  }

  // 3) Validar tipo de mensagem
  const triggerCfg = trigger.kind === 'TRIGGER' ? trigger.config : { messageTypes: ['text'] };
  const msgType = input.messageType ?? 'text';
  if (
    !triggerCfg.messageTypes.includes('any') &&
    !triggerCfg.messageTypes.includes(msgType)
  ) {
    log.info({ msgType }, 'mensagem fora do tipo configurado no TRIGGER — short-circuit');
    return emptyResult([{ nodeId: trigger.id, kind: 'TRIGGER', tookMs: 0, outcome: 'filtered' }]);
  }

  // 4) Scope mutável compartilhado entre nodes — branchOutcomes vive AQUI
  // pra isolar execuções concorrentes (antes era module-level Map → vazava
  // entre flows de contatos diferentes rodando ao mesmo tempo).
  const scope: ExecutionScope = {
    inboundText: input.inboundText,
    classification: null,
    rag: [],
    agentResult: null,
    handedOff: false,
    handoffReason: null,
    visited: new Set<string>(),
    branchOutcomes: new Map<string, 'true' | 'false'>(),
    trace: [{ nodeId: trigger.id, kind: 'TRIGGER', tookMs: 0, outcome: 'matched' }],
  };

  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));

  // 5) Walk
  let currentId: string | null = trigger.id;
  while (currentId) {
    if (scope.visited.size >= MAX_NODES_VISITED) {
      throw new Error(`Flow excedeu MAX_NODES_VISITED (${MAX_NODES_VISITED}) — provável loop`);
    }
    if (scope.visited.has(currentId)) {
      throw new Error(`Flow tem ciclo: node ${currentId} visitado 2x`);
    }
    scope.visited.add(currentId);

    const node = nodesById.get(currentId);
    if (!node) throw new Error(`Flow refere node inexistente: ${currentId}`);

    if (node.kind !== 'TRIGGER') {
      const t0 = Date.now();
      const outcome = await executeNode(node, scope, input);
      scope.trace.push({
        nodeId: node.id,
        kind: node.kind,
        tookMs: Date.now() - t0,
        outcome,
      });
    }

    // END: para tudo
    if (node.kind === 'END') break;
    if (node.kind === 'HANDOFF') break;

    // Próximo node: escolhe edge baseado em condition + scope
    const next = pickNextEdge(graph, currentId, scope);
    currentId = next;
  }

  // 6) Resultado consolidado
  // Fallback: se flow terminou sem produzir texto E sem handoff explícito,
  // retorna mensagem segura em vez de string vazia (que viraria WhatsApp vazio).
  let finalText = scope.agentResult?.text ?? '';
  if (!finalText.trim() && !scope.handedOff && !scope.agentResult?.handedOff) {
    log.warn(
      { trace: scope.trace.map((t) => t.kind) },
      'flow terminou sem agentResult — usando fallback text',
    );
    finalText = 'Recebi sua mensagem. Vou verificar e já te respondo. 😊';
  }

  return {
    text: finalText,
    toolsUsed: scope.agentResult?.toolsUsed ?? [],
    tokensIn: scope.agentResult?.tokensIn ?? 0,
    tokensOut: scope.agentResult?.tokensOut ?? 0,
    handedOff: scope.handedOff || (scope.agentResult?.handedOff ?? false),
    guardTriggered: scope.agentResult?.guardTriggered ?? false,
    guardReasons: scope.agentResult?.guardReasons ?? [],
    trace: scope.trace,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────────

interface ExecutionScope {
  inboundText: string;
  classification: MessageClassification | null;
  rag: RagChunk[];
  agentResult: RunAgentResult | null;
  handedOff: boolean;
  handoffReason: string | null;
  visited: Set<string>;
  /** Outcome de BRANCH nodes, isolado por execução. */
  branchOutcomes: Map<string, 'true' | 'false'>;
  trace: FlowExecutionResult['trace'];
}

async function executeNode(
  node: FlowNode,
  scope: ExecutionScope,
  input: ExecuteFlowInput,
): Promise<string> {
  switch (node.kind) {
    case 'TRIGGER':
      // TRIGGER já foi tratado no walk principal (filtragem por messageType).
      // Aqui é no-op pra exhaustiveness do switch.
      return 'matched';
    case 'CLASSIFY': {
      scope.classification = await classifyMessage(scope.inboundText);
      return `intent=${scope.classification.intent}`;
    }
    case 'RAG_SEARCH': {
      const workspaceId = input.globalDeps.workspaceId;
      scope.rag = await searchKnowledge(workspaceId, scope.inboundText, node.config.topK);
      return `chunks=${scope.rag.length}`;
    }
    case 'AGENT_RESPONSE': {
      // Roda o agente com o RAG/scope acumulado até aqui.
      const result = await runAgent({
        ...input,
        inboundText: scope.inboundText,
        ragChunks: scope.rag,
        maxSteps: node.config.maxSteps,
        timeoutMs: node.config.timeoutMs,
      });
      scope.agentResult = result;
      if (result.handedOff) {
        scope.handedOff = true;
        scope.handoffReason = 'agent-decided';
      }
      return `text.len=${result.text.length} tools=${result.toolsUsed.length}`;
    }
    case 'TOOL_CALL': {
      // Tool call estático fora do agente — útil pra pré-fetch (ex: buscar produtos
      // antes de chamar o LLM). Implementação completa requer dispatch
      // workspace-aware (CustomTool); por ora marca skipped sem quebrar fluxo.
      // TODO: invocar via dispatcher do worker (issue follow-up).
      return `skipped(tool=${node.config.toolName})`;
    }
    case 'BRANCH': {
      // Avalia expressão e marca scope pra picker decidir próximo edge.
      const ok = evalExpression(node.config.expression, {
        inboundText: scope.inboundText,
        classification: scope.classification,
        rag: scope.rag,
        agentResult: scope.agentResult,
      });
      // Escopo per-execution — evita race entre flows concorrentes.
      scope.branchOutcomes.set(node.id, ok ? 'true' : 'false');
      return `branch=${ok}`;
    }
    case 'HANDOFF': {
      // Marca scope ANTES da chamada externa — o estado no DB é o que importa.
      // Se transferToHuman quebrar (rede, Meta API), ainda assim o flow para
      // de tentar responder via AI (handedOff=true).
      scope.handedOff = true;
      scope.handoffReason = node.config.reason;
      try {
        await input.globalDeps.transferToHuman(node.config.reason);
        return 'handoff';
      } catch (err) {
        log.warn(
          { nodeId: node.id, err: String(err) },
          'transferToHuman falhou — handoff em DB já registrado pelo deps',
        );
        return 'handoff-bridge-failed';
      }
    }
    case 'END':
      return 'end';
    default: {
      // exhaustive
      const _exhaustive: never = node;
      throw new Error(`Node kind não suportado: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function pickNextEdge(graph: FlowGraph, fromNodeId: string, scope: ExecutionScope): string | null {
  const edges = graph.edges.filter((e) => e.source === fromNodeId);
  if (edges.length === 0) return null;

  // Se vier de um BRANCH, filtra pela outcome resolvida no scope per-execution.
  // (Antes vivia em Map module-level → vazava entre execuções concorrentes.)
  const branchResult = scope.branchOutcomes.get(fromNodeId);
  if (branchResult !== undefined) {
    scope.branchOutcomes.delete(fromNodeId);
    const match =
      edges.find((e) => e.condition === branchResult) ??
      edges.find((e) => e.condition === 'any');
    return match?.target ?? null;
  }

  // Senão pega a primeira 'any' (ordem de criação)
  const next = edges.find((e) => e.condition === 'any') ?? edges[0];
  return next?.target ?? null;
}

function emptyResult(trace: FlowExecutionResult['trace']): FlowExecutionResult {
  return {
    text: '',
    toolsUsed: [],
    tokensIn: 0,
    tokensOut: 0,
    handedOff: false,
    guardTriggered: false,
    guardReasons: [],
    trace,
  };
}

'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Bot,
  Brain,
  Check,
  CircleStop,
  GitBranch,
  Loader2,
  PhoneOff,
  Play,
  RotateCcw,
  Save,
  Search,
  Wrench,
  Zap,
} from 'lucide-react';
import { Button, cn } from '@zapfy/ui';

import { defaultFlowGraph, NODE_KINDS, type FlowNodeKind } from '@zapfy/ai/flow/types';

import { saveFlowGraph, clearFlowGraph } from './actions';

/**
 * Tipos locais — alinhados com `@zapfy/ai/flow/types` mas mantemos cópia leve
 * porque ReactFlow usa shape `{ id, position, data, type }` (data carrega
 * `kind` + `config`).
 */
interface NodeData extends Record<string, unknown> {
  kind: FlowNodeKind;
  label?: string;
  config: Record<string, unknown>;
}

type RFNode = Node<NodeData>;
type RFEdge = Edge<{ condition: 'true' | 'false' | 'any'; label?: string }>;

const NODE_LABELS: Record<FlowNodeKind, string> = {
  TRIGGER: 'Trigger',
  CLASSIFY: 'Classifier',
  RAG_SEARCH: 'RAG search',
  TOOL_CALL: 'Tool call',
  AGENT_RESPONSE: 'Agent response',
  BRANCH: 'Branch (if)',
  HANDOFF: 'Handoff humano',
  END: 'End',
};

const NODE_ICONS: Record<FlowNodeKind, typeof Zap> = {
  TRIGGER: Zap,
  CLASSIFY: Brain,
  RAG_SEARCH: Search,
  TOOL_CALL: Wrench,
  AGENT_RESPONSE: Bot,
  BRANCH: GitBranch,
  HANDOFF: PhoneOff,
  END: CircleStop,
};

const NODE_COLORS: Record<FlowNodeKind, string> = {
  TRIGGER: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
  CLASSIFY: 'bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-300',
  RAG_SEARCH: 'bg-violet-500/10 border-violet-500/40 text-violet-700 dark:text-violet-300',
  TOOL_CALL: 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300',
  AGENT_RESPONSE: 'bg-primary/10 border-primary/40 text-primary',
  BRANCH: 'bg-orange-500/10 border-orange-500/40 text-orange-700 dark:text-orange-300',
  HANDOFF: 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300',
  END: 'bg-muted border-border text-muted-foreground',
};

/** Custom node renderer pra react-flow. */
function TratoNode({ data, selected }: NodeProps<RFNode>) {
  const Icon = NODE_ICONS[data.kind] ?? Zap;
  return (
    <div
      className={cn(
        'min-w-[180px] rounded-lg border-2 px-3 py-2 shadow-sm transition-shadow',
        NODE_COLORS[data.kind],
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider">{data.kind}</span>
      </div>
      <p className="mt-1 text-sm font-medium leading-tight">
        {data.label ?? NODE_LABELS[data.kind]}
      </p>
    </div>
  );
}

const nodeTypes = { trato: TratoNode };

// ─────────────────────────────────────────────────────────────────────────────
// Persistência shape ↔ ReactFlow shape
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera ID único de edge. `crypto.randomUUID()` em browsers modernos +
 * fallback pra Math.random (cobertura defensiva — Safari antigo, contexto
 * inseguro). Evita colisão se usuário conectar 2x mesmo par no mesmo ms.
 */
function newEdgeId(source: string, target: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12);
  return `e-${source}-${target}-${rand}`;
}

function graphToReactFlow(graph: unknown): { nodes: RFNode[]; edges: RFEdge[] } {
  const g = graph as { nodes?: unknown[]; edges?: unknown[] } | null;
  if (!g?.nodes || !Array.isArray(g.nodes)) {
    return seedFromDefault();
  }
  const nodes: RFNode[] = (g.nodes as Array<Record<string, unknown>>).map((n) => {
    const labelRaw = n['label'];
    const data: NodeData = {
      kind: n['kind'] as FlowNodeKind,
      config: (n['config'] as Record<string, unknown>) ?? {},
      ...(typeof labelRaw === 'string' && labelRaw.length > 0 ? { label: labelRaw } : {}),
    };
    return {
      id: String(n['id']),
      type: 'trato',
      position: (n['position'] as { x: number; y: number }) ?? { x: 0, y: 0 },
      data,
    };
  });
  const edges: RFEdge[] = ((g.edges as Array<Record<string, unknown>>) ?? []).map((e) => {
    const labelRaw = e['label'];
    const edge: RFEdge = {
      id: String(e['id']),
      source: String(e['source']),
      target: String(e['target']),
      data: {
        condition: (e['condition'] as 'true' | 'false' | 'any') ?? 'any',
      },
      animated: e['condition'] === 'true',
      ...(typeof labelRaw === 'string' && labelRaw.length > 0 ? { label: labelRaw } : {}),
    };
    return edge;
  });
  return { nodes, edges };
}

function seedFromDefault(): { nodes: RFNode[]; edges: RFEdge[] } {
  return graphToReactFlow(defaultFlowGraph());
}

function reactFlowToGraph(nodes: RFNode[], edges: RFEdge[]): unknown {
  return {
    version: 1,
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: n.data.kind,
      position: n.position,
      label: n.data.label,
      config: n.data.config,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      condition: e.data?.condition ?? 'any',
      label: e.label,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowEditor
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  agentId: string;
  initialGraph: Record<string, unknown> | null;
  customToolNames: string[];
}

export function FlowEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  );
}

function FlowEditorInner({ agentId, initialGraph }: Props) {
  const initial = useMemo(() => graphToReactFlow(initialGraph), [initialGraph]);
  const [nodes, setNodes] = useState<RFNode[]>(initial.nodes);
  const [edges, setEdges] = useState<RFEdge[]>(initial.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [resetting, startResetting] = useTransition();
  const [status, setStatus] = useState<
    { kind: 'ok'; message: string } | { kind: 'error'; message: string } | null
  >(null);

  const onNodesChange = useCallback(
    (changes: NodeChange<RFNode>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<RFEdge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...conn,
            id: newEdgeId(conn.source ?? 'src', conn.target ?? 'tgt'),
            data: { condition: 'any' },
          } as RFEdge,
          eds,
        ),
      ),
    [],
  );

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  function addNode(kind: FlowNodeKind) {
    // Só pode existir 1 TRIGGER por grafo (validação do schema). Se já tem,
    // bloqueia + sinaliza feedback inline em vez de criar segundo (que faria
    // o save falhar no Zod superRefine).
    if (kind === 'TRIGGER' && nodes.some((n) => n.data.kind === 'TRIGGER')) {
      setStatus({ kind: 'error', message: 'Já existe um node TRIGGER — só pode ter 1.' });
      return;
    }
    const id = `${kind.toLowerCase()}_${Math.random().toString(36).slice(2, 7)}`;
    const newNode: RFNode = {
      id,
      type: 'trato',
      position: { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: { kind, config: defaultConfigFor(kind) },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(id);
  }

  function updateNodeConfig(nodeId: string, patch: Record<string, unknown>) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } } }
          : n,
      ),
    );
  }

  function updateNodeLabel(nodeId: string, label: string) {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label } } : n)),
    );
  }

  function deleteSelectedNode() {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }

  function onSave() {
    setStatus(null);
    const graph = reactFlowToGraph(nodes, edges);
    startSaving(async () => {
      const r = await saveFlowGraph({ agentId, flowGraph: graph });
      if (r.status === 'ok') {
        setStatus({ kind: 'ok', message: `Salvo como v${r.versionNumber}` });
      } else {
        setStatus({ kind: 'error', message: r.error });
      }
    });
  }

  function onReset() {
    if (!confirm('Resetar pro fluxo default? Cria nova versão.')) return;
    setStatus(null);
    startResetting(async () => {
      const r = await clearFlowGraph(agentId);
      if (r.status === 'ok') {
        const seed = seedFromDefault();
        setNodes(seed.nodes);
        setEdges(seed.edges);
        setStatus({ kind: 'ok', message: `Resetado em v${r.versionNumber}` });
      } else {
        setStatus({ kind: 'error', message: r.error });
      }
    });
  }

  // Limpa status após 4s
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <div className="flex h-full">
      {/* Toolbar lateral */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Adicionar bloco
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1.5">
            {NODE_KINDS.map((kind) => {
              const Icon = NODE_ICONS[kind];
              const hasTrigger = nodes.some((n) => n.data.kind === 'TRIGGER');
              const disabled = kind === 'TRIGGER' && hasTrigger;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => addNode(kind)}
                  disabled={disabled}
                  title={disabled ? 'Só pode ter 1 TRIGGER por grafo' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5',
                    disabled && 'opacity-50 cursor-not-allowed hover:bg-background hover:border-border',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {NODE_LABELS[kind]}
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Ajuda
            </p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
              <li>• Arraste pra mover</li>
              <li>• Conecte alça → alça</li>
              <li>• Clique pra editar config</li>
              <li>• Delete pra remover selecionado</li>
            </ul>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-border bg-muted/30 p-3 space-y-2">
          {status && (
            <div
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-[11px]',
                status.kind === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-destructive/40 bg-destructive/10 text-destructive',
              )}
            >
              {status.kind === 'ok' ? <Check className="mr-1 inline h-3 w-3" /> : '⚠ '}
              {status.message}
            </div>
          )}
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={onSave}
            disabled={saving || resetting}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Salvar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            onClick={onReset}
            disabled={saving || resetting}
          >
            {resetting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Resetar pro default
          </Button>
        </div>
      </aside>

      {/* Canvas */}
      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelectedNodeId(n.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          onNodesDelete={(deleted) => {
            const ids = new Set(deleted.map((d) => d.id));
            setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)));
            if (selectedNodeId && ids.has(selectedNodeId)) setSelectedNodeId(null);
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!bg-card !border-border" />
        </ReactFlow>

        {/* Floating: hint quando vazio */}
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-lg bg-card/90 px-4 py-2 text-sm text-muted-foreground shadow-md">
              <Play className="mr-2 inline h-3.5 w-3.5" />
              Adicione blocos pela barra à esquerda
            </p>
          </div>
        )}
      </div>

      {/* Inspector */}
      {selectedNode && (
        <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {selectedNode.data.kind}
              </p>
              <p className="text-sm font-medium">{selectedNode.data.label ?? NODE_LABELS[selectedNode.data.kind]}</p>
            </div>
            <button
              type="button"
              onClick={deleteSelectedNode}
              className="rounded-md border border-border px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
            >
              Remover
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            <Field label="Label (opcional)">
              <input
                type="text"
                value={selectedNode.data.label ?? ''}
                onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                placeholder={NODE_LABELS[selectedNode.data.kind]}
                className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </Field>
            <NodeConfigEditor
              node={selectedNode}
              onUpdate={(patch) => updateNodeConfig(selectedNode.id, patch)}
            />
          </div>
        </aside>
      )}
    </div>
  );
}

function defaultConfigFor(kind: FlowNodeKind): Record<string, unknown> {
  switch (kind) {
    case 'TRIGGER':
      return { messageTypes: ['text'] };
    case 'CLASSIFY':
      return {};
    case 'RAG_SEARCH':
      return { topK: 4 };
    case 'TOOL_CALL':
      return { toolName: '' };
    case 'AGENT_RESPONSE':
      return { maxSteps: 5, timeoutMs: 30_000, allowGlobalTools: true };
    case 'BRANCH':
      return { expression: '$classification.needs_handoff === true' };
    case 'HANDOFF':
      return { reason: 'Transferência manual via flow' };
    case 'END':
      return {};
    default:
      return {};
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function NodeConfigEditor({
  node,
  onUpdate,
}: {
  node: RFNode;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const cfg = node.data.config;
  switch (node.data.kind) {
    case 'RAG_SEARCH':
      return (
        <Field label="topK (chunks recuperados)">
          <input
            type="number"
            min={1}
            max={20}
            value={(cfg['topK'] as number) ?? 4}
            onChange={(e) => onUpdate({ topK: Number.parseInt(e.target.value, 10) || 4 })}
            className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm"
          />
        </Field>
      );
    case 'AGENT_RESPONSE':
      return (
        <>
          <Field label="maxSteps (tool iterations)">
            <input
              type="number"
              min={1}
              max={10}
              value={(cfg['maxSteps'] as number) ?? 5}
              onChange={(e) => onUpdate({ maxSteps: Number.parseInt(e.target.value, 10) || 5 })}
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm"
            />
          </Field>
          <Field label="timeoutMs">
            <input
              type="number"
              min={1000}
              max={120000}
              step={1000}
              value={(cfg['timeoutMs'] as number) ?? 30000}
              onChange={(e) => onUpdate({ timeoutMs: Number.parseInt(e.target.value, 10) || 30000 })}
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm"
            />
          </Field>
          <Field label="Tools globais habilitadas">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(cfg['allowGlobalTools'] ?? true)}
                onChange={(e) => onUpdate({ allowGlobalTools: e.target.checked })}
                className="h-4 w-4"
              />
              Permite search_knowledge, transfer_to_human, etc.
            </label>
          </Field>
        </>
      );
    case 'TOOL_CALL':
      return (
        <Field label="Nome da tool">
          <input
            type="text"
            value={(cfg['toolName'] as string) ?? ''}
            onChange={(e) => onUpdate({ toolName: e.target.value })}
            placeholder="ex: track_order"
            className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm font-mono"
          />
        </Field>
      );
    case 'BRANCH':
      return (
        <Field label="Expressão (sintaxe própria, sem eval)">
          <textarea
            value={(cfg['expression'] as string) ?? ''}
            onChange={(e) => onUpdate({ expression: e.target.value })}
            rows={3}
            placeholder='$classification.needs_handoff === true'
            className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs font-mono"
          />
        </Field>
      );
    case 'HANDOFF':
      return (
        <Field label="Motivo (visível no audit log)">
          <input
            type="text"
            value={(cfg['reason'] as string) ?? ''}
            onChange={(e) => onUpdate({ reason: e.target.value })}
            className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm"
          />
        </Field>
      );
    case 'TRIGGER':
      return (
        <Field label="Tipos de mensagem que disparam">
          <p className="text-[11px] text-muted-foreground">
            Por enquanto: text. Outros tipos (image/audio) ficam pendentes do agent.
          </p>
        </Field>
      );
    default:
      return <p className="text-xs text-muted-foreground">Sem configuração disponível.</p>;
  }
}

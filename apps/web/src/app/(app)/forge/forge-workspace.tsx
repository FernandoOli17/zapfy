'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import {
  ArrowUp,
  Check,
  CircleDashed,
  ListChecks,
  Loader2,
  RotateCcw,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Button, cn } from '@zapai/ui';
import {
  FORGE_PHASE_IDS,
  type ForgePhaseId,
  type ForgeState,
} from '@zapai/ai/forge/types';

import { resetForgeSession, sendForgeMessage } from './actions';
import { AudioRecorder } from './audio-recorder';

const PHASE_LABELS: Record<ForgePhaseId, string> = {
  DISCOVERY: 'Descobrir',
  VERTICAL_DETECTION: 'Vertical',
  GOALS: 'Objetivos',
  TONE: 'Tom',
  KNOWLEDGE: 'Conhecimento',
  TOOLS: 'Tools',
  HANDOFF: 'Handoff',
  REVIEW: 'Revisar',
  PUBLISH: 'Publicar',
  REFINEMENT: 'Refinamento',
};

const PHASE_SUBTITLES: Record<ForgePhaseId, string> = {
  DISCOVERY: 'Me conta do seu negócio',
  VERTICAL_DETECTION: 'Identificando vertical',
  GOALS: 'O que ele precisa fazer',
  TONE: 'Como ele deve falar',
  KNOWLEDGE: 'O que ele precisa saber',
  TOOLS: 'Selecionando tools',
  HANDOFF: 'Quando passar pra humano',
  REVIEW: 'Conferindo o agente',
  PUBLISH: 'Publicando v1',
  REFINEMENT: 'Modo refinamento',
};

const MAIN_FLOW: ForgePhaseId[] = [
  'DISCOVERY',
  'VERTICAL_DETECTION',
  'GOALS',
  'TONE',
  'KNOWLEDGE',
  'TOOLS',
  'HANDOFF',
  'REVIEW',
  'PUBLISH',
];

interface Props {
  initialState: ForgeState;
  /** Mostra CTA "Editor avançado" no header (devMode ON + OWNER/ADMIN). */
  showDevHandoff?: boolean;
}

export function ForgeWorkspace({ initialState, showDevHandoff = false }: Props) {
  const [state, setState] = useState<ForgeState>(initialState);
  const [draft, setDraft] = useState('');
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // scroll automático para o fim quando muda transcript
  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [state.transcript.length, thinking]);

  const onSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setError(null);
    setDraft('');
    setThinking(true);
    startTransition(async () => {
      const result = await sendForgeMessage({ sessionId: state.sessionId, userMessage: text });
      setThinking(false);
      if (result.status === 'error') {
        setError(result.error);
        // devolve a mensagem ao input pra não perder
        setDraft(text);
        return;
      }
      setState(result.state);
    });
  }, [draft, state.sessionId]);

  const onReset = useCallback(() => {
    if (!confirm('Resetar a conversa? A sessão atual será marcada como abandonada.')) return;
    startTransition(async () => {
      const { sessionId } = await resetForgeSession(state.sessionId);
      setState({
        sessionId,
        workspaceId: state.workspaceId,
        currentPhase: 'DISCOVERY',
        transcript: [],
        answers: {
          business: {},
          goals: [],
          knowledge: [],
          tools: [],
        },
      });
      setError(null);
      setDraft('');
    });
  }, [state.sessionId, state.workspaceId]);

  const isPublished = state.currentPhase === 'PUBLISH' && !!state.answers.agentName;

  return (
    <div className="grid h-[calc(100vh-3.75rem)] grid-cols-1 lg:h-[calc(100vh-0px)] lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px]">
      {/* Chat (esquerda) */}
      <section className="relative flex h-full min-h-0 flex-col">
        <ChatHeader
          phase={state.currentPhase}
          onReset={onReset}
          busy={busy}
          showDevHandoff={showDevHandoff}
        />

        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10"
        >
          <div className="mx-auto max-w-2xl">
            {state.transcript.length === 0 ? (
              <EmptyState
                onSuggest={(suggestion) => {
                  setDraft(suggestion);
                }}
              />
            ) : (
              <ol className="space-y-6">
                {state.transcript.map((m) => (
                  <li key={m.id}>
                    <Message
                      role={m.role === 'assistant' ? 'forge' : 'user'}
                      content={m.content}
                      {...(m.toolCalls ? { toolCalls: m.toolCalls } : {})}
                    />
                  </li>
                ))}
                {thinking && (
                  <li>
                    <Message role="forge" content="" thinking />
                  </li>
                )}
              </ol>
            )}
          </div>
        </div>

        <div className="border-t border-border/60 bg-background/80 px-6 py-4 backdrop-blur md:px-10">
          <div className="mx-auto max-w-2xl">
            {error && (
              <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card/40 p-2 transition-colors focus-within:border-primary/60">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !busy) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                disabled={busy || isPublished}
                rows={1}
                placeholder={
                  isPublished
                    ? 'Agente publicado. Use /forge novamente pra refinar.'
                    : state.transcript.length === 0
                    ? 'Me conta do seu negócio. O que vocês vendem ou fazem?'
                    : 'Escreve sua resposta…'
                }
                className="flex-1 max-h-40 resize-none bg-transparent px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                style={{ minHeight: '40px' }}
              />
              <AudioRecorder
                disabled={busy || isPublished}
                onTranscribed={(text) => {
                  // Concatena com o que já está no draft (caso usuário tenha começado a escrever)
                  setDraft((prev) => (prev.trim() ? prev + ' ' + text : text));
                }}
              />
              <Button
                type="button"
                size="icon"
                onClick={onSend}
                disabled={busy || isPublished || !draft.trim()}
                className="h-10 w-10 rounded-xl"
                aria-label="Enviar"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              <kbd className="rounded bg-secondary px-1.5">Enter</kbd> envia ·{' '}
              <kbd className="rounded bg-secondary px-1.5">Shift+Enter</kbd> nova linha ·{' '}
              clique no mic pra falar em vez de digitar
            </p>
          </div>
        </div>
      </section>

      {/* Preview (direita) */}
      <aside className="hidden border-l border-border/60 bg-secondary/15 lg:flex lg:flex-col">
        <PreviewPanel state={state} />
      </aside>
    </div>
  );
}

function ChatHeader({
  phase,
  onReset,
  busy,
  showDevHandoff,
}: {
  phase: ForgePhaseId;
  onReset: () => void;
  busy: boolean;
  showDevHandoff: boolean;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border/60 bg-background/60 px-6 py-4 backdrop-blur md:px-10">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Forge</p>
          <p className="text-sm font-medium">
            {PHASE_LABELS[phase]} <span className="text-muted-foreground">· {PHASE_SUBTITLES[phase]}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showDevHandoff && (
          <a
            href="/developer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-400"
            title="Editor avançado (flow visual + tools custom + prompt raw)"
          >
            <Wrench className="h-3 w-3" />
            Editor avançado
          </a>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={busy}
          className="text-xs"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Resetar
        </Button>
      </div>
    </header>
  );
}

function EmptyState({ onSuggest }: { onSuggest: (text: string) => void }) {
  const SUGGESTIONS = [
    'Loja online de tênis pra corrida, atende em todo o Brasil',
    'Clínica de fisioterapia em São Paulo, 3 profissionais',
    'Restaurante mexicano com delivery próprio',
    'Curso online de inglês pra adultos com aulas ao vivo',
  ];
  return (
    <div className="py-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        Forge pronto
      </div>
      <h2 className="mt-6 text-3xl font-medium leading-tight tracking-tight md:text-5xl">
        Vamos montar seu agente.{' '}
        <span className="font-serif italic font-normal text-primary">
          Me conta do negócio.
        </span>
      </h2>
      <p className="mt-4 max-w-lg text-muted-foreground md:text-lg">
        Em uma conversa, eu entendo seu negócio, classifico o vertical, escolho as tools,
        defino tom e handoff, e gero o agente versionado pronto pra atender no WhatsApp.
      </p>

      <p className="mt-10 text-xs uppercase tracking-widest text-muted-foreground">
        Pra começar, descreve em uma frase:
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggest(s)}
            className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ToolCallSummary {
  id: string;
  name: string;
  args: unknown;
}

function Message({
  role,
  content,
  toolCalls,
  thinking,
}: {
  role: 'user' | 'forge';
  content: string;
  toolCalls?: ToolCallSummary[];
  thinking?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-md text-[10px] font-semibold uppercase tracking-widest',
          isUser
            ? 'bg-secondary text-muted-foreground'
            : 'bg-primary/15 text-primary',
        )}
      >
        {isUser ? 'Vc' : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div className={cn('flex-1 space-y-2', isUser && 'items-end text-right')}>
        {toolCalls && toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {toolCalls.map((tc) => (
              <span
                key={tc.id}
                title={typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args)}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary"
              >
                <Wrench className="h-3 w-3" />
                {tc.name}
              </span>
            ))}
          </div>
        )}
        <div
          className={cn(
            'whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed',
            isUser
              ? 'rounded-br-sm bg-secondary text-foreground'
              : 'rounded-bl-sm bg-card border border-border/60',
            thinking && 'animate-pulse text-muted-foreground',
          )}
        >
          {thinking ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
            </span>
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({ state }: { state: ForgeState }) {
  const { answers, currentPhase } = state;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Progresso de fases */}
      <div className="border-b border-border/60 p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Progresso</p>
        <ol className="mt-4 space-y-2">
          {MAIN_FLOW.map((phase, i) => {
            const currentIdx = MAIN_FLOW.indexOf(currentPhase);
            const isCurrent = phase === currentPhase;
            const isDone = currentIdx > i;
            return (
              <li
                key={phase}
                className={cn(
                  'flex items-center gap-2.5 text-sm',
                  isCurrent ? 'text-foreground' : isDone ? 'text-muted-foreground' : 'text-muted-foreground/60',
                )}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : isCurrent ? (
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                  </span>
                ) : (
                  <CircleDashed className="h-3.5 w-3.5 opacity-50" />
                )}
                <span className={cn(isCurrent && 'font-medium')}>{PHASE_LABELS[phase]}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {answers.business?.description && (
          <Field label="Negócio" value={answers.business.description} />
        )}
        {answers.business?.brandName && <Field label="Marca" value={answers.business.brandName} />}
        {answers.vertical && (
          <Field label="Vertical" value={answers.vertical} accent />
        )}

        {answers.goals && answers.goals.length > 0 && (
          <FieldList label="Objetivos" items={answers.goals} />
        )}

        {answers.tone && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Tom</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Tag>{answers.tone.tone}</Tag>
              <Tag>emoji: {answers.tone.emoji}</Tag>
              {answers.tone.neverSay?.slice(0, 3).map((s) => (
                <Tag key={s} intent="warning">
                  ✕ {s}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {answers.knowledge && answers.knowledge.length > 0 && (
          <FieldList
            label="Conhecimento"
            items={answers.knowledge.map((k) => `${k.kind} · ${k.title}`)}
          />
        )}

        {answers.tools && answers.tools.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Tools ativas</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {answers.tools.map((t) => (
                <Tag key={t}>
                  <Wrench className="mr-1 inline h-3 w-3" />
                  {t}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {answers.handoff && (answers.handoff.keywords.length > 0 || answers.handoff.conditions.length > 0) && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Handoff</p>
            {answers.handoff.keywords.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Palavras-chave</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {answers.handoff.keywords.map((k) => (
                    <Tag key={k}>{k}</Tag>
                  ))}
                </div>
              </div>
            )}
            {answers.handoff.conditions.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Condições</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {answers.handoff.conditions.map((c) => (
                    <li key={c}>· {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {answers.systemPromptDraft && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              System prompt
            </p>
            <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-card/60 p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
              {answers.systemPromptDraft}
            </pre>
          </div>
        )}

        {answers.agentName && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-widest text-primary">Agente publicado</p>
            <p className="mt-2 text-lg font-medium tracking-tight">{answers.agentName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Versão 1 ativa. Em breve conecte o WhatsApp pra começar a atender.
            </p>
          </div>
        )}

        {!hasAnswers(answers) && (
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            <ListChecks className="mb-2 h-4 w-4 text-muted-foreground/60" />
            Conforme o Forge for coletando informação, aparece aqui em tempo real. Comece a conversa
            ao lado.
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn('mt-1.5 text-sm', accent && 'text-primary font-medium')}>{value}</p>
    </div>
  );
}

function FieldList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((it, i) => (
          <li key={`${label}-${i}`} className="text-foreground/80">
            <span className="text-primary/60">·</span> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tag({
  children,
  intent = 'default',
}: {
  children: React.ReactNode;
  intent?: 'default' | 'warning';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]',
        intent === 'warning'
          ? 'border-destructive/40 bg-destructive/5 text-destructive'
          : 'border-border/60 bg-background/40 text-foreground/80',
      )}
    >
      {children}
    </span>
  );
}

function hasAnswers(a: ForgeState['answers']): boolean {
  return Boolean(
    a.business?.description ||
      a.vertical ||
      a.goals?.length ||
      a.tone ||
      a.knowledge?.length ||
      a.tools?.length ||
      a.handoff ||
      a.systemPromptDraft,
  );
}

// usado no preview; força tree-shake-friendly de FORGE_PHASE_IDS
void FORGE_PHASE_IDS;

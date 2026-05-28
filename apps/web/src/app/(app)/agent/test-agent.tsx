'use client';

import { useState, useTransition } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  PhoneOff,
  PlayCircle,
  Wrench,
} from 'lucide-react';
import { Button, cn } from '@zapfy/ui';

import { testAgent, type TestAgentResult } from './actions';

interface Props {
  agentId: string;
  vertical: string;
}

const EXAMPLES_BY_VERTICAL: Record<string, string[]> = {
  RESTAURANT: ['oi quero ver o cardápio', 'qual o tempo de entrega?', 'tem opção sem glúten?'],
  ECOMMERCE: ['tô procurando uma camiseta básica branca M', 'quanto custa o frete pra 04001-000?', 'cadê meu pedido 12345?'],
  CLINIC: ['oi gostaria de marcar uma consulta', 'precisa de encaminhamento?', 'quanto custa uma limpeza?'],
  INFOPRODUCT: ['vi o anúncio. me explica como funciona o curso?', 'tem garantia?', 'aceita parcelar em quantas?'],
  SERVICE: ['preciso de um eletricista', 'vocês atendem aos sábados?', 'quanto custa pintar uma sala?'],
  OTHER: ['oi qual o horário de vocês?', 'onde fica?', 'tem desconto pra cliente novo?'],
};

export function TestAgent({ agentId, vertical }: Props) {
  const [text, setText] = useState('');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TestAgentResult | null>(null);

  const examples = EXAMPLES_BY_VERTICAL[vertical] ?? EXAMPLES_BY_VERTICAL['OTHER']!;

  function onRun() {
    if (!text.trim()) return;
    setResult(null);
    startTransition(async () => {
      const r = await testAgent({ agentId, inboundText: text });
      setResult(r);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PlayCircle className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Testar agente</h2>
          <p className="text-xs text-muted-foreground">
            Simula uma mensagem como se viesse do WhatsApp. Não envia nada nem cobra mensagem.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !pending) {
              e.preventDefault();
              onRun();
            }
          }}
          rows={2}
          maxLength={1000}
          placeholder="Digita o que um cliente mandaria… (Ctrl+Enter envia)"
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onRun}
            disabled={pending || !text.trim()}
            size="sm"
          >
            {pending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Testando…
              </>
            ) : (
              <>
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                Testar
              </>
            )}
          </Button>
          <span className="text-[11px] text-muted-foreground">Exemplos:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              disabled={pending}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {ex.length > 32 ? ex.slice(0, 32) + '…' : ex}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="mt-5 border-t border-border pt-5">
          {result.status === 'error' ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{result.error}</span>
            </div>
          ) : (
            <ResultView result={result} />
          )}
        </div>
      )}
    </div>
  );
}

function ResultView({ result }: { result: Extract<TestAgentResult, { status: 'ok' }> }) {
  return (
    <div className="space-y-4">
      {/* Resposta */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Bot className="h-3 w-3" />
          Resposta do agente
        </div>
        <div className="mt-2 whitespace-pre-wrap rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3 text-sm leading-relaxed">
          {result.replyText || (
            <span className="italic text-muted-foreground">(sem texto — handoff?)</span>
          )}
        </div>
      </div>

      {/* Metadados */}
      <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <Meta
          icon={Clock}
          label="Tempo"
          value={`${(result.tookMs / 1000).toFixed(1)}s`}
        />
        <Meta
          icon={Wrench}
          label="Tools"
          value={result.toolsUsed.length === 0 ? '—' : `${result.toolsUsed.length}`}
          tooltip={result.toolsUsed.join(', ')}
        />
        <Meta
          icon={Bot}
          label="Tokens"
          value={`${result.tokensIn}/${result.tokensOut}`}
          tooltip="entrada / saída"
        />
        <Meta
          icon={PhoneOff}
          label="Handoff"
          value={result.handedOff ? 'sim' : 'não'}
          highlight={result.handedOff}
        />
      </div>

      {/* Tools usadas */}
      {result.toolsUsed.length > 0 && (
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">Tools chamadas:</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {result.toolsUsed.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-mono text-primary"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.ragChunksUsed > 0 && (
        <p className="text-[11px] text-muted-foreground">
          ⓘ Usou {result.ragChunksUsed} chunk{result.ragChunksUsed === 1 ? '' : 's'} da base de conhecimento.
        </p>
      )}
      {result.mode === 'flow' && (
        <p className="text-[11px] text-primary">
          ⓘ Execução via flow customizado (modo desenvolvedor).
        </p>
      )}
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
  tooltip,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tooltip?: string;
  highlight?: boolean;
}) {
  return (
    <div
      title={tooltip}
      className={cn(
        'rounded-md border bg-background px-2.5 py-1.5',
        highlight ? 'border-amber-500/40 bg-amber-500/5' : 'border-border',
      )}
    >
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <div
        className={cn(
          'mt-0.5 font-mono text-xs',
          highlight ? 'text-amber-700 dark:text-amber-400' : 'text-foreground',
        )}
      >
        {value}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useTransition } from 'react';
import { Check, Loader2, Save } from 'lucide-react';
import { Button, cn } from '@zapfy/ui';

import { saveRawPrompt } from './actions';

interface Props {
  agentId: string;
  initialPrompt: string;
}

export function RawPromptEditor({ agentId, initialPrompt }: Props) {
  const [text, setText] = useState(initialPrompt);
  const [saving, startSaving] = useTransition();
  const [status, setStatus] = useState<
    { kind: 'ok'; message: string } | { kind: 'error'; message: string } | null
  >(null);
  const [notes, setNotes] = useState('');

  const dirty = text !== initialPrompt;
  const tokensEstimate = Math.ceil(text.length / 4);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  function onSave() {
    setStatus(null);
    startSaving(async () => {
      const r = await saveRawPrompt({
        agentId,
        systemPrompt: text,
        ...(notes.trim() ? { changeNotes: notes.trim() } : {}),
      });
      if (r.status === 'ok') {
        setStatus({ kind: 'ok', message: `Salvo como v${r.versionNumber}` });
        setNotes('');
      } else {
        setStatus({ kind: 'error', message: r.error });
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            System prompt bruto · pula o Forge e edita direto
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            ~{tokensEstimate} tokens · {text.length} chars · Ctrl+S salva
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <span
              className={cn(
                'rounded-md border px-2 py-1 text-xs',
                status.kind === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-destructive/40 bg-destructive/10 text-destructive',
              )}
            >
              {status.kind === 'ok' && <Check className="mr-1 inline h-3 w-3" />}
              {status.message}
            </span>
          )}
          {dirty && !status && (
            <span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-400">
              Não salvo
            </span>
          )}
          <Button type="button" size="sm" onClick={onSave} disabled={saving || !dirty}>
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1fr_280px]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              if (dirty && !saving) onSave();
            }
          }}
          spellCheck={false}
          className="h-full w-full resize-none bg-background p-6 font-mono text-[13px] leading-relaxed text-foreground focus:outline-none"
          placeholder="# Identidade
Você é um agente IA pra atendimento WhatsApp da empresa X.

# Tom
…"
        />
        <aside className="hidden border-l border-border bg-card p-5 lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Notas da mudança
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Ex: removi tom formal, adicionei exemplo de upsell"
            className="mt-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs"
          />

          <div className="mt-6 rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <p className="font-medium text-foreground">Boas práticas</p>
            <ul className="mt-2 space-y-1.5">
              <li>• Seções claras (Identidade, Tom, Restrições)</li>
              <li>• Few-shot examples no final</li>
              <li>• &gt; 1024 tokens engaja prompt cache (Anthropic)</li>
              <li>• Nunca incluir credenciais</li>
            </ul>
          </div>

          <p className="mt-6 text-[11px] text-muted-foreground">
            Cada save cria nova <strong>AgentVersion</strong>. Histórico fica visível em{' '}
            <code className="rounded bg-muted px-1">/agent</code> e dá pra fazer rollback.
          </p>
        </aside>
      </div>
    </div>
  );
}

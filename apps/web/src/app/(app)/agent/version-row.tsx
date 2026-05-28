'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, ChevronDown, Loader2, RotateCcw } from 'lucide-react';
import { Button, cn } from '@zapfy/ui';

import { rollbackToVersion } from './actions';

interface VersionRowProps {
  version: {
    id: string;
    agentId: string;
    versionNumber: number;
    createdAt: string;
    changeNotes: string | null;
    isCurrent: boolean;
    systemPromptPreview: string;
    systemPromptFull: string;
    toolsEnabled: string[];
  };
  canRollback: boolean;
}

export function VersionRow({ version, canRollback }: VersionRowProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRollback() {
    if (
      !confirm(
        `Voltar pra v${version.versionNumber}? A versão atual fica no histórico, sem perder dados.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await rollbackToVersion({
        agentId: version.agentId,
        versionId: version.id,
      });
      if (r.status === 'error') setError(r.error);
    });
  }

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              v{version.versionNumber}
            </p>
            {version.isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
                <CheckCircle2 className="h-2.5 w-2.5" />
                ativa
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(version.createdAt).toLocaleString('pt-BR')}
            </span>
          </div>
          {version.changeNotes && (
            <p className="mt-1 text-sm text-muted-foreground">{version.changeNotes}</p>
          )}
          {version.toolsEnabled.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {version.toolsEnabled.slice(0, 5).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border/60 bg-background/40 px-1.5 text-[10px] font-mono text-muted-foreground"
                >
                  {t}
                </span>
              ))}
              {version.toolsEnabled.length > 5 && (
                <span className="text-[10px] text-muted-foreground">
                  +{version.toolsEnabled.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
        {canRollback && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRollback}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Voltar pra essa
          </Button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-xs text-destructive">{error}</p>
      )}

      <details className="mt-3 group">
        <summary
          className={cn(
            'flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground',
          )}
        >
          <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
          Ver system prompt
        </summary>
        <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-background/40 p-3 font-mono text-[11px] leading-relaxed">
          {version.systemPromptFull}
        </pre>
      </details>
    </div>
  );
}

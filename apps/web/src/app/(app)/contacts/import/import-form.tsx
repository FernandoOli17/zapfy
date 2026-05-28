'use client';

import { useRef, useState, useTransition } from 'react';
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { Button, Label } from '@zapfy/ui';

import { importContactsCsv, type ImportResult } from './actions';

export function ImportForm() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFileName(f?.name ?? null);
    setResult(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    startTransition(async () => {
      const r = await importContactsCsv(fd);
      setResult(r);
      if (r.status === 'ok' && fileRef.current) {
        fileRef.current.value = '';
        setFileName(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="file">Arquivo CSV</Label>
          <div className="mt-1.5 flex items-center gap-3">
            <label
              htmlFor="file"
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 text-sm hover:bg-secondary"
            >
              <FileUp className="h-4 w-4" />
              {fileName ?? 'Escolher arquivo'}
            </label>
            <input
              ref={fileRef}
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              onChange={onFileChange}
              className="sr-only"
            />
            {fileName && (
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando…
                  </>
                ) : (
                  'Importar agora'
                )}
              </Button>
            )}
          </div>
        </div>
      </form>

      {result && (
        <div
          className={
            result.status === 'error'
              ? 'rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive'
              : 'rounded-md border border-primary/30 bg-primary/5 p-4 text-sm'
          }
        >
          {result.status === 'error' ? (
            <>
              <AlertCircle className="mr-2 inline h-4 w-4" />
              {result.error}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Importação concluída
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <li>
                  <span className="text-xs text-muted-foreground">Criados</span>
                  <p className="text-2xl font-medium tabular-nums text-primary">{result.created}</p>
                </li>
                <li>
                  <span className="text-xs text-muted-foreground">Atualizados</span>
                  <p className="text-2xl font-medium tabular-nums">{result.updated}</p>
                </li>
                <li>
                  <span className="text-xs text-muted-foreground">Sem mudança</span>
                  <p className="text-2xl font-medium tabular-nums text-muted-foreground">{result.skipped}</p>
                </li>
                <li>
                  <span className="text-xs text-muted-foreground">Falharam</span>
                  <p className="text-2xl font-medium tabular-nums text-destructive">{result.failed}</p>
                </li>
              </ul>
              {result.failures.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    Ver {result.failures.length} {result.failures.length === 1 ? 'falha' : 'falhas'}
                  </summary>
                  <ul className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border/60 bg-background/40 p-2 font-mono text-[11px]">
                    {result.failures.slice(0, 100).map((f, i) => (
                      <li key={i} className="text-muted-foreground">
                        linha {f.row}
                        {f.phone ? ` (${f.phone})` : ''}: {f.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

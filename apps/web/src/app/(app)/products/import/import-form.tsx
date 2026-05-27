'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { Button, useToast } from '@zapai/ui';

import { importProductsCsv, type ImportResult } from '../actions';

const EXAMPLE = `name,description,price,sku,category,stock,active
Pizza Marguerita,Mussarela + tomate + manjericão,45.00,PIZ-MAR,Pizzas,,true
Pizza Calabresa,Calabresa + cebola,48.00,PIZ-CAL,Pizzas,,true
Coca-Cola 2L,,15.00,BEB-COC2L,Bebidas,20,true`;

export function ImportForm() {
  const router = useRouter();
  const { push } = useToast();
  const [csv, setCsv] = useState('');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (csv.trim().length < 10) return;
    setResult(null);
    startTransition(async () => {
      const r = await importProductsCsv({ csv });
      setResult(r);
      if (r.status === 'ok') {
        push({
          type: 'success',
          message: `${r.created} criados, ${r.updated} atualizados${r.skipped ? `, ${r.skipped} pulados` : ''}`,
        });
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  function onUseExample() {
    setCsv(EXAMPLE);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      push({ type: 'error', message: 'Arquivo maior que 2MB' });
      return;
    }
    const text = await file.text();
    setCsv(text);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" htmlFor="csv-input">
            Conteúdo CSV
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onUseExample}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Usar exemplo
            </button>
            <span className="text-muted-foreground">·</span>
            <label className="cursor-pointer text-xs text-primary hover:text-primary/80">
              <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
              Carregar arquivo
            </label>
          </div>
        </div>
        <textarea
          id="csv-input"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={14}
          placeholder={EXAMPLE}
          spellCheck={false}
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed focus:border-primary focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{csv.length} chars</p>
      </div>

      {result && result.status === 'ok' && (
        <div className="space-y-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Importação concluída
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <Stat label="Criados" value={result.created} accent="text-emerald-600 dark:text-emerald-400" />
            <Stat label="Atualizados" value={result.updated} accent="text-sky-600 dark:text-sky-400" />
            <Stat label="Pulados" value={result.skipped} accent="text-muted-foreground" />
          </div>
          {result.errors.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium text-amber-700 dark:text-amber-400">
                {result.errors.length} erro{result.errors.length === 1 ? '' : 's'} (clique pra ver)
              </summary>
              <ul className="mt-2 space-y-1">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i} className="font-mono text-[11px] text-muted-foreground">
                    Linha {e.row}: {e.error}
                  </li>
                ))}
                {result.errors.length > 20 && (
                  <li className="text-[11px] text-muted-foreground">
                    +{result.errors.length - 20} erros adicionais
                  </li>
                )}
              </ul>
            </details>
          )}
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => router.push('/products')}>
              Ver catálogo
            </Button>
          </div>
        </div>
      )}

      {result && result.status === 'error' && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {result.error}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={pending || csv.trim().length < 10}>
          {pending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Importando…
            </>
          ) : (
            <>
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Importar
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-md bg-background p-2">
      <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

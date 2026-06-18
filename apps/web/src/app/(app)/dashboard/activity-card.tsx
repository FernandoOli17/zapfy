interface Props {
  atividade14d: Array<{ label: string; value: number }>;
  planoUso: { usado: number; limite: number | null };
}

/** Atividade (14 dias) + uso do plano no ciclo. Lado a lado; empilha no mobile. */
export function ActivityCard({ atividade14d, planoUso }: Props) {
  const max = Math.max(1, ...atividade14d.map((d) => d.value));
  const totalPeriodo = atividade14d.reduce((acc, d) => acc + d.value, 0);
  const pct =
    planoUso.limite && planoUso.limite > 0
      ? Math.min(100, Math.round((planoUso.usado / planoUso.limite) * 100))
      : null;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Atividade · 14 dias</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {totalPeriodo.toLocaleString('pt-BR')} conversas
          </span>
        </div>
        <div className="mt-4 flex h-24 items-end gap-1" aria-hidden>
          {atividade14d.map((d, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-primary/60 transition-all"
              style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }}
              title={`${d.label}: ${d.value}`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold tracking-tight">Plano · ciclo</h2>
        <div className="mt-3 text-2xl font-semibold tabular-nums">
          {planoUso.usado.toLocaleString('pt-BR')}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            / {planoUso.limite === null ? '∞' : planoUso.limite.toLocaleString('pt-BR')}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">conversas de IA neste ciclo</p>
        {pct !== null && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

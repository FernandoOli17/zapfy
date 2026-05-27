import { cn } from '@zapai/ui';

/**
 * Contador module-scope pra gerar IDs únicos de gradient. Como o Sparkline
 * é um Server Component (sem hooks), não dá pra usar `useId`. O contador
 * funciona porque cada render do server reincia o module — em produção,
 * cada page load começa em 0, mas dentro do mesmo render todos os IDs são
 * únicos. NUNCA reusar o mesmo `colorClass` como ID (collision quando 2
 * sparklines compartilham cor).
 */
let sparkSeq = 0;

/**
 * Sparkline SVG simples — barras verticais com gradiente. Sem Recharts,
 * sem framer-motion. Renderiza no server (Server Component).
 */
export function Sparkline({
  data,
  height = 60,
  className,
  emptyLabel = 'Sem dados',
  colorClass = 'text-primary',
  format = 'number',
  currency = 'BRL',
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  className?: string;
  emptyLabel?: string;
  colorClass?: string;
  format?: 'number' | 'percent' | 'duration' | 'currency';
  currency?: string;
}) {
  if (data.length === 0) {
    return <p className={cn('text-xs text-muted-foreground', className)}>{emptyLabel}</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(2, Math.floor(280 / data.length) - 2);
  const totalWidth = data.length * (barWidth + 2);

  const gradId = `spark-grad-${++sparkSeq}`;

  function formatValue(v: number): string {
    if (format === 'percent') return `${v.toLocaleString('pt-BR')}%`;
    if (format === 'duration') {
      if (v < 60) return `${Math.round(v)}s`;
      if (v < 3600) return `${Math.round(v / 60)}min`;
      return `${(v / 3600).toFixed(1)}h`;
    }
    if (format === 'currency') {
      return (v / 100).toLocaleString('pt-BR', { style: 'currency', currency });
    }
    return v.toLocaleString('pt-BR');
  }

  return (
    <div className={cn('overflow-hidden', className)}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Sparkline"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.85" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <g className={colorClass}>
          {data.map((d, i) => {
            const h = (d.value / max) * (height - 4);
            const x = i * (barWidth + 2);
            const y = height - h;
            return (
              <rect
                key={`${d.label}-${i}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(h, 1)}
                fill={`url(#${gradId})`}
                rx="1"
              >
                <title>
                  {d.label}: {formatValue(d.value)}
                </title>
              </rect>
            );
          })}
        </g>
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        {data.length > 4 && <span>{data[Math.floor(data.length / 2)]?.label}</span>}
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

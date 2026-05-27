import { cn } from '@zapai/ui';

/**
 * Sparkline SVG simples — barras verticais com gradiente. Sem Recharts,
 * sem framer-motion. Renderiza no server (Server Component).
 *
 * `data` = array de pontos em ordem cronológica.
 * `height` em px (default 60).
 */
export function UsageSparkline({
  data,
  height = 60,
  className,
  emptyLabel = 'Sem uso neste período',
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  className?: string;
  emptyLabel?: string;
}) {
  if (data.length === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>{emptyLabel}</p>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(2, Math.floor(280 / data.length) - 2);
  const totalWidth = data.length * (barWidth + 2);

  return (
    <div className={cn('overflow-hidden', className)}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Gráfico de uso"
      >
        <defs>
          <linearGradient id="usage-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.85" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <g className="text-primary">
          {data.map((d, i) => {
            const h = (d.value / max) * (height - 4);
            const x = i * (barWidth + 2);
            const y = height - h;
            return (
              <g key={`${d.label}-${i}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  fill="url(#usage-grad)"
                  rx="1"
                >
                  <title>
                    {d.label}: {d.value.toLocaleString('pt-BR')}
                  </title>
                </rect>
              </g>
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

import { Bot, Clock, MessageSquare } from 'lucide-react';
import { cn } from '@zapfy/ui';

interface Props {
  conversasHoje: number;
  resolvidasIaCount: number;
  resolvidasIaPct: number;
  aguardandoTotal: number;
}

/** Strip de 3 métricas grandes (Direção 1). "Aguardando você" em âmbar quando >0. */
export function MetricStrip({ conversasHoje, resolvidasIaCount, resolvidasIaPct, aguardandoTotal }: Props) {
  const waiting = aguardandoTotal > 0;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Metric
        icon={<MessageSquare className="h-4 w-4" aria-hidden />}
        label="Conversas hoje"
        value={conversasHoje.toLocaleString('pt-BR')}
        tone="neutral"
      />
      <Metric
        icon={<Bot className="h-4 w-4" aria-hidden />}
        label="Resolvidas pela IA"
        value={resolvidasIaCount.toLocaleString('pt-BR')}
        hint={conversasHoje > 0 ? `${resolvidasIaPct}% do total` : 'sem conversas hoje'}
        tone="primary"
      />
      <Metric
        icon={<Clock className="h-4 w-4" aria-hidden />}
        label="Aguardando você"
        value={aguardandoTotal.toLocaleString('pt-BR')}
        hint={waiting ? 'precisam de atendimento' : 'nada na fila'}
        tone={waiting ? 'warn' : 'neutral'}
      />
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: 'neutral' | 'primary' | 'warn';
}) {
  return (
    <div
      role="group"
      aria-label={hint ? `${label}: ${value}, ${hint}` : `${label}: ${value}`}
      className={cn(
        'rounded-xl border bg-card p-4',
        tone === 'warn' ? 'border-warning/40' : 'border-border',
      )}
    >
      <div
        aria-hidden
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          tone === 'primary'
            ? 'bg-primary/10 text-primary'
            : tone === 'warn'
              ? 'bg-warning/15 text-warning'
              : 'bg-muted text-muted-foreground',
        )}
      >
        {icon}
      </div>
      <div
        aria-hidden
        className={cn(
          'mt-3 text-3xl font-semibold tracking-tight tabular-nums',
          tone === 'primary' && 'text-primary',
          tone === 'warn' && 'text-warning',
        )}
      >
        {value}
      </div>
      <div aria-hidden className="mt-0.5 text-xs font-medium">{label}</div>
      {hint && <div aria-hidden className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

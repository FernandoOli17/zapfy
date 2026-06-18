import { cn } from '@zapfy/ui';

export function PlanBadge({ status, plan }: { status: string; plan: string }) {
  const noPlan = status === 'INCOMPLETE' || status === 'TRIALING';
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
      <span className="font-semibold uppercase tracking-wider">{plan}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className={cn('font-medium', noPlan ? 'text-muted-foreground' : 'text-primary')}>
        {noPlan ? 'sem plano ativo' : status.toLowerCase()}
      </span>
    </div>
  );
}

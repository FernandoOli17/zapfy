import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Empty state padrão: ilustração (ícone Lucide grande), título, descrição e CTA opcional.
 *
 * Uso:
 *   <EmptyState
 *     icon={Inbox}
 *     title="Sem mensagens ainda"
 *     description="Conecte o WhatsApp pra começar."
 *     action={<Link href="/whatsapp">Conectar agora</Link>}
 *   />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'md',
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: { icon: 'h-5 w-5', wrap: 'h-10 w-10', title: 'text-base', container: 'py-8' },
    md: { icon: 'h-6 w-6', wrap: 'h-12 w-12', title: 'text-lg', container: 'py-12' },
    lg: { icon: 'h-8 w-8', wrap: 'h-16 w-16', title: 'text-2xl', container: 'py-16' },
  }[size];

  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border bg-card/40 px-8 text-center',
        sizeClasses.container,
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto flex items-center justify-center rounded-full bg-primary/10 text-primary',
          sizeClasses.wrap,
        )}
      >
        <Icon className={sizeClasses.icon} />
      </div>
      <h3 className={cn('mt-4 font-semibold tracking-tight', sizeClasses.title)}>{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6 inline-flex">{action}</div>}
    </div>
  );
}

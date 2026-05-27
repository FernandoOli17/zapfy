import { cn } from '../lib/utils';

/**
 * Spinner SVG simples com animação pure CSS (rotate). Sem framer-motion.
 *
 * Variantes:
 *   <Spinner /> — 16px, currentColor
 *   <Spinner size="lg" />
 *   <Spinner className="text-primary" />
 */
export function Spinner({
  size = 'md',
  className,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const px = { xs: 12, sm: 14, md: 16, lg: 24 }[size];
  return (
    <svg
      className={cn('animate-spin', className)}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Carregando"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Inline pill enquanto carrega — texto + spinner */
export function LoadingPill({ label = 'Carregando', className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground',
        className,
      )}
    >
      <Spinner size="xs" />
      {label}
    </span>
  );
}

import { cn } from '@zapai/ui';

interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  children: React.ReactNode;
  eyebrow?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
  bordered?: boolean;
  muted?: boolean;
}

export function Section({
  children,
  eyebrow,
  title,
  description,
  align = 'left',
  bordered = false,
  muted = false,
  className,
  ...rest
}: SectionProps) {
  return (
    <section
      className={cn(
        'py-20 md:py-28',
        bordered && 'border-y border-border/60',
        muted && 'bg-secondary/20',
        className,
      )}
      {...rest}
    >
      <div className={cn('mx-auto max-w-6xl px-6', align === 'center' && 'text-center')}>
        {(eyebrow || title || description) && (
          <header
            className={cn(
              'max-w-3xl',
              align === 'center' && 'mx-auto',
            )}
          >
            {eyebrow && (
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
            )}
            {title && (
              <h2 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
                {title}
              </h2>
            )}
            {description && (
              <div className="mt-5 text-lg leading-relaxed text-muted-foreground md:text-xl">
                {description}
              </div>
            )}
          </header>
        )}
        <div className={cn((eyebrow || title || description) && 'mt-14')}>{children}</div>
      </div>
    </section>
  );
}

/** Headline com Instrument Serif italic no destaque — passe um span com font-serif italic */
export function EditorialHeadline({
  children,
  size = 'md',
  className,
}: {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  return (
    <h2
      className={cn(
        'font-medium leading-[1.05] tracking-tight',
        size === 'sm' && 'text-3xl md:text-4xl',
        size === 'md' && 'text-4xl md:text-6xl',
        size === 'lg' && 'text-5xl md:text-7xl',
        size === 'xl' && 'text-[clamp(2.75rem,8vw,7rem)]',
        className,
      )}
    >
      {children}
    </h2>
  );
}

'use client';

import { useReveal } from './use-reveal';

/** Revela o conteúdo com fade-up quando entra na viewport. Respeita reduced-motion. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(16px)',
        transition:
          'opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

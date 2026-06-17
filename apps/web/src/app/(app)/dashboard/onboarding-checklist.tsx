'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, ChevronUp, Circle } from 'lucide-react';
import { Button, cn } from '@zapfy/ui';

import type { OnboardingProgress } from '@/lib/onboarding';

const MINIMIZED_KEY = 'zapfy.onboarding.minimized';

/**
 * Card "Coloque sua IA pra atender" — jornada de 5 passos derivada do DB
 * (ver lib/onboarding.ts). Some sozinho quando completa; minimizável via
 * localStorage (estado de UI local, não de negócio).
 */
export function OnboardingChecklist({ progress }: { progress: OnboardingProgress }) {
  const [minimized, setMinimized] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMinimized(localStorage.getItem(MINIMIZED_KEY) === '1');
    setHydrated(true);
  }, []);

  if (progress.complete) return null;

  function toggle() {
    const next = !minimized;
    setMinimized(next);
    localStorage.setItem(MINIMIZED_KEY, next ? '1' : '0');
  }

  const pct = Math.round((progress.completedCount / progress.steps.length) * 100);

  if (hydrated && minimized) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-sm transition-colors hover:border-primary/40"
        aria-expanded={false}
      >
        <span className="text-muted-foreground">
          Continuar configuração{' '}
          <span className="font-mono tabular-nums">
            ({progress.completedCount}/{progress.steps.length})
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
      </button>
    );
  }

  return (
    <section className="animate-slide-up overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Coloque sua IA pra atender · {pct}%
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
            {progress.completedCount} de {progress.steps.length} passos
          </h2>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Minimizar checklist"
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-5 space-y-2">
        {progress.steps.map((step) => {
          const isNext = progress.next?.id === step.id;
          return (
            <li
              key={step.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                step.done && 'border-emerald-500/30 bg-emerald-500/5',
                isNext && 'border-primary/40 bg-primary/5',
                !step.done && !isNext && 'border-border bg-card opacity-70',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  step.done
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : isNext
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground',
                )}
                aria-hidden
              >
                {step.done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.done && 'text-muted-foreground line-through',
                  )}
                >
                  {step.title}
                </p>
                {isNext && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>
              {isNext && (
                <Button asChild size="sm" className="shrink-0">
                  <Link href={step.href}>
                    Continuar
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

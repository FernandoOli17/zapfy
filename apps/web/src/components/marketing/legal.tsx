import Link from 'next/link';

import { cn } from '@zapfy/ui';

interface LegalPageProps {
  eyebrow: string;
  title: string;
  emphasis: string;
  lastUpdated: string;
  children: React.ReactNode;
  toc?: Array<{ id: string; label: string }>;
}

export function LegalPage({ eyebrow, title, emphasis, lastUpdated, children, toc }: LegalPageProps) {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-10 md:pt-28">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-4 text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
            {title}{' '}
            <span className="font-serif italic font-normal text-primary">{emphasis}</span>
          </h1>
          <p className="mt-6 text-sm text-muted-foreground">
            Última atualização: <span className="text-foreground">{lastUpdated}</span>
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className={cn('grid gap-12', toc && 'md:grid-cols-[240px_1fr] md:gap-16')}>
            {toc && (
              <aside className="hidden md:block">
                <div className="sticky top-24">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Índice</p>
                  <nav className="mt-4">
                    <ol className="space-y-2 text-sm">
                      {toc.map((item, i) => (
                        <li key={item.id}>
                          <Link
                            href={`#${item.id}`}
                            className="block text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <span className="tabular-nums text-xs">
                              {(i + 1).toString().padStart(2, '0')}.
                            </span>{' '}
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </div>
              </aside>
            )}
            <article className="max-w-2xl">{children}</article>
          </div>
        </div>
      </section>
    </>
  );
}

export function LegalSection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border/60 pt-10 first:border-0 first:pt-0">
      <div className="flex items-baseline gap-4">
        <span className="font-serif text-2xl italic text-primary">
          {number.toString().padStart(2, '0')}
        </span>
        <h2 className="text-2xl font-medium tracking-tight md:text-3xl">{title}</h2>
      </div>
      <div className="mt-5 space-y-4 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="ml-6 list-disc space-y-2 marker:text-primary/60">{children}</ul>;
}

export function LegalDt({ children }: { children: React.ReactNode }) {
  return <span className="text-foreground font-medium">{children}</span>;
}

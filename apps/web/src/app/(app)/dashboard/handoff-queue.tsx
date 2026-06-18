import Link from 'next/link';
import { ArrowRight, CheckCircle2, Phone } from 'lucide-react';

import type { HandoffItem } from '@/lib/dashboard-stats';

interface Props {
  items: HandoffItem[];
  total: number;
  whatsappConnected: boolean;
}

function initials(label: string): string {
  const parts = label.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function waitingLabel(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  return `há ${h}h`;
}

/** Fila "Aguardando você" — conversas em HUMAN_HANDLING, mais antigo primeiro. */
export function HandoffQueue({ items, total, whatsappConnected }: Props) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          Aguardando você
          {total > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              {total}
            </span>
          )}
        </h2>
        {items.length > 0 && (
          <Link
            href="/inbox"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
          >
            Abrir inbox <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        )}
      </div>

      {!whatsappConnected ? (
        <EmptyState
          icon={<Phone className="h-5 w-5" aria-hidden />}
          title="Conecte o WhatsApp pra ver o pulso"
          body="Quando seu número estiver no ar, as conversas que precisam de você aparecem aqui."
          cta={{ href: '/whatsapp', label: 'Conectar WhatsApp' }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden />}
          title="Tudo em dia"
          body="A IA está dando conta — ninguém esperando atendimento humano agora."
        />
      ) : (
        <ul role="list" className="mt-4 space-y-1">
          {items.map((it) => (
            <li key={it.conversationId}>
              <Link
                href="/inbox"
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
                  aria-hidden
                >
                  {initials(it.contactLabel)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{it.contactLabel}</span>
                  <span className="block truncate text-xs text-muted-foreground">{it.preview}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{waitingLabel(it.waitingSince)}</span>
              </Link>
            </li>
          ))}
          {total > items.length && (
            <li className="pt-1 text-center">
              <Link href="/inbox" className="text-xs font-medium text-primary hover:text-primary/80">
                + {total - items.length} na fila
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <p className="mt-2 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          {cta.label} <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
    </div>
  );
}

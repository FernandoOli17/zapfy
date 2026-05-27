import Link from 'next/link';
import { ArrowRight, BookOpen, Check, MessageSquareText, Phone, Sparkles, Users } from 'lucide-react';
import { cn } from '@zapai/ui';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  done: boolean;
}

/**
 * Checklist pós-signup mostrado no topo do /dashboard até completar.
 * Lê estado real do DB pra marcar steps automaticamente — não tem
 * "marcar como feito" manual.
 *
 * Steps:
 *  1. Forge concluído (workspace tem currentVersion publicado num agent)
 *  2. WhatsApp conectado (WhatsAppAccount status=CONNECTED)
 *  3. Knowledge base com ao menos 1 doc indexado
 *  4. Time convidado (>1 membro OU envio de invite registrado)
 *  5. Primeira mensagem (ao menos 1 Message no inbox)
 */
export function OnboardingChecklist({
  workspaceSlug,
  status,
}: {
  workspaceSlug: string;
  status: {
    forgeComplete: boolean;
    whatsappConnected: boolean;
    knowledgeBaseStarted: boolean;
    teamInvited: boolean;
    firstMessage: boolean;
  };
}) {
  const items: ChecklistItem[] = [
    {
      id: 'forge',
      title: 'Configurar seu agente IA',
      description: 'Conversa com o Forge — leva ~3 min.',
      href: '/forge',
      icon: Sparkles,
      done: status.forgeComplete,
    },
    {
      id: 'whatsapp',
      title: 'Conectar WhatsApp',
      description: 'Cole credenciais do seu Meta App.',
      href: '/whatsapp',
      icon: Phone,
      done: status.whatsappConnected,
    },
    {
      id: 'knowledge',
      title: 'Adicionar base de conhecimento',
      description: 'Suba PDFs, FAQs ou cole texto. RAG melhora as respostas.',
      href: '/knowledge',
      icon: BookOpen,
      done: status.knowledgeBaseStarted,
    },
    {
      id: 'team',
      title: 'Convidar time',
      description: 'Pra fazer handoff humano em conversas complexas.',
      href: '/team',
      icon: Users,
      done: status.teamInvited,
    },
    {
      id: 'message',
      title: 'Primeira mensagem',
      description: 'Mande um WhatsApp pro seu número de teste pra ver tudo funcionando.',
      href: '/inbox',
      icon: MessageSquareText,
      done: status.firstMessage,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;
  const pct = Math.round((completedCount / items.length) * 100);

  if (allDone) return null;

  return (
    <section className="animate-slide-up mb-8 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Começando · {pct}%
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
            Configure {workspaceSlug} em 5 passos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada passo destrava recursos do produto. Não obrigatório, mas recomendado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm tabular-nums text-muted-foreground">
            {completedCount}/{items.length}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Items */}
      <ul className="animate-stagger mt-5 grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-primary/40 hover:bg-primary/5',
                item.done
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border bg-card',
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  item.done
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary/10 text-primary',
                )}
              >
                {item.done ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <item.icon className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm font-medium',
                    item.done && 'text-muted-foreground line-through',
                  )}
                >
                  {item.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
              </div>
              {!item.done && (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

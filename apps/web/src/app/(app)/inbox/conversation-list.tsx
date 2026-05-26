'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Bot, Headset, Inbox as InboxIcon, Search, X } from 'lucide-react';
import { cn } from '@zapai/ui';

import { useInboxChannel } from '@/lib/realtime/pusher-client';

import type { InboxConversationListItem, InboxFilter } from '@/lib/inbox';

const FILTERS: Array<{ id: InboxFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'ai', label: 'IA' },
  { id: 'human', label: 'Humano' },
  { id: 'closed', label: 'Fechadas' },
];

interface Props {
  initialConversations: InboxConversationListItem[];
}

export function ConversationListClient({ initialConversations }: Props) {
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();
  const selected = params?.conversationId;

  const [conversations, setConversations] = useState(initialConversations);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [query, setQuery] = useState('');
  const [, startTransition] = useTransition();

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filter === 'ai' && c.status !== 'AI_HANDLING') return false;
      if (filter === 'human' && c.status !== 'HUMAN_HANDLING') return false;
      if (filter === 'closed' && c.status !== 'CLOSED') return false;
      if (filter === 'all' && c.status === 'CLOSED') return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const inName = (c.contact.name ?? '').toLowerCase().includes(q);
        const inPhone = c.contact.phoneE164.includes(q.replace(/\D/g, ''));
        if (!inName && !inPhone) return false;
      }
      return true;
    });
  }, [conversations, filter, query]);

  function handleClick(id: string) {
    startTransition(() => router.push(`/inbox/${id}`));
  }

  return (
    <aside className="flex min-h-0 flex-col border-r border-border bg-card">
      <header className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <InboxIcon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Inbox</h2>
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length}</span>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nome ou telefone…"
            className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-8 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="mt-3 flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                filter === f.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            {query
              ? 'Nada encontrado.'
              : conversations.length === 0
                ? 'Sem conversas ainda. Quando alguém mandar mensagem no número conectado, aparece aqui.'
                : 'Nenhuma conversa nesse filtro.'}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => {
              const isSelected = selected === c.id;
              const initials = (c.contact.name ?? c.contact.phoneE164).slice(0, 2).toUpperCase();
              return (
                <li key={c.id}>
                  <Link
                    href={`/inbox/${c.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleClick(c.id);
                    }}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50',
                      isSelected && 'bg-primary/[0.06] border-l-2 border-l-primary pl-[14px]',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        c.unreadCount > 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-primary/10 text-primary',
                      )}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            'truncate text-sm',
                            c.unreadCount > 0 ? 'font-semibold' : 'font-medium',
                          )}
                        >
                          {c.contact.name ?? `+${c.contact.phoneE164}`}
                        </p>
                        <p className="shrink-0 text-[10px] text-muted-foreground">
                          {c.lastMessageAt ? formatRelative(c.lastMessageAt) : ''}
                        </p>
                      </div>
                      {c.lastMessagePreview && (
                        <p
                          className={cn(
                            'mt-0.5 truncate text-xs',
                            c.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {c.lastMessageFromAi && '🤖 '}
                          {c.lastMessagePreview}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <StatusBadge status={c.status} />
                        {c.unreadCount > 0 && (
                          <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function StatusBadge({ status }: { status: InboxConversationListItem['status'] }) {
  if (status === 'AI_HANDLING')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
        <Bot className="h-2.5 w-2.5" /> IA
      </span>
    );
  if (status === 'HUMAN_HANDLING')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        <Headset className="h-2.5 w-2.5" /> Humano
      </span>
    );
  return (
    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
      fechada
    </span>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Subscribe a real-time + faz router.refresh quando algo muda — pode ficar em separado. */
export function ConversationListRealtime({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  useInboxChannel(`private-workspace-${workspaceId}`, 'message.new', () => {
    router.refresh();
  });
  useInboxChannel(`private-workspace-${workspaceId}`, 'conversation.updated', () => {
    router.refresh();
  });
  return null;
}

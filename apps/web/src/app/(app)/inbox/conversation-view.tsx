'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  AlertCircle,
  ArrowUp,
  Bot,
  CheckCheck,
  CheckCircle2,
  Clock,
  Headset,
  Loader2,
  PhoneOff,
  Tag,
  Undo2,
  UserCheck,
} from 'lucide-react';
import { Button, cn } from '@zapai/ui';

import type { InboxConversationDetail, InboxMessage } from '@/lib/inbox';

import {
  assumeConversation,
  closeConversation,
  returnConversationToAi,
  sendInboxMessage,
  setContactTags,
  setInternalNote,
} from './actions';

export function ConversationView({ detail }: { detail: InboxConversationDetail }) {
  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_320px]">
      <ChatColumn detail={detail} />
      <ContactPanel detail={detail} />
    </div>
  );
}

function ChatColumn({ detail }: { detail: InboxConversationDetail }) {
  const [pendingAction, startActionTransition] = useTransition();
  const [draft, setDraft] = useState('');
  const [busy, startSendTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [detail.messages.length]);

  function onSend() {
    const text = draft.trim();
    if (!text) return;
    setError(null);
    setDraft('');
    startSendTransition(async () => {
      const r = await sendInboxMessage({ conversationId: detail.id, body: text });
      if (r.status === 'error') {
        setError(r.error);
        setDraft(text);
      }
    });
  }

  function onAssume() {
    setError(null);
    startActionTransition(async () => {
      await assumeConversation(detail.id);
    });
  }

  function onReturnToAi() {
    setError(null);
    startActionTransition(async () => {
      await returnConversationToAi(detail.id);
    });
  }

  function onClose() {
    if (!confirm('Encerrar essa conversa? Aparece em "Fechadas".')) return;
    setError(null);
    startActionTransition(async () => {
      await closeConversation(detail.id);
    });
  }

  const isClosed = detail.status === 'CLOSED';
  const isHuman = detail.status === 'HUMAN_HANDLING';

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border/60 bg-background/60 px-6 py-4 backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {detail.contact.name ? `+${detail.contact.phoneE164}` : 'Contato'}
          </p>
          <h2 className="mt-0.5 text-lg font-medium tracking-tight">
            {detail.contact.name ?? `+${detail.contact.phoneE164}`}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isClosed && isHuman && (
            <Button type="button" variant="outline" size="sm" onClick={onReturnToAi} disabled={pendingAction}>
              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
              Voltar pra IA
            </Button>
          )}
          {!isClosed && !isHuman && (
            <Button type="button" variant="outline" size="sm" onClick={onAssume} disabled={pendingAction}>
              <UserCheck className="mr-1.5 h-3.5 w-3.5" />
              Assumir
            </Button>
          )}
          {!isClosed && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={pendingAction}
              className="text-muted-foreground hover:text-destructive"
            >
              <PhoneOff className="mr-1.5 h-3.5 w-3.5" />
              Encerrar
            </Button>
          )}
        </div>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-8 md:px-10">
        <div className="mx-auto max-w-3xl space-y-3">
          {detail.messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Sem mensagens nessa conversa ainda.
            </p>
          ) : (
            detail.messages.map((m, i) => {
              const prev = i > 0 ? detail.messages[i - 1] : null;
              const showDateBreak =
                !prev ||
                new Date(m.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
              return (
                <div key={m.id}>
                  {showDateBreak && (
                    <div className="my-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </div>
                  )}
                  <MessageBubble message={m} />
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/80 px-6 py-4 backdrop-blur md:px-10">
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {isClosed ? (
            <div className="rounded-md border border-border/60 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
              Conversa encerrada. Reabra usando a próxima mensagem que o contato mandar.
            </div>
          ) : !isHuman ? (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              <span className="text-primary">IA respondendo automaticamente.</span>{' '}
              <span className="text-muted-foreground">
                Clique em &quot;Assumir&quot; pra parar a IA e responder você mesmo.
              </span>
            </div>
          ) : (
            <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card/40 p-2 focus-within:border-primary/60">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !busy) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={1}
                placeholder="Sua mensagem… (Enter envia, Shift+Enter quebra linha)"
                className="flex-1 max-h-40 resize-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                style={{ minHeight: '40px' }}
              />
              <Button
                type="button"
                size="icon"
                onClick={onSend}
                disabled={busy || !draft.trim()}
                className="h-10 w-10 rounded-xl"
                aria-label="Enviar"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: InboxMessage }) {
  const isInbound = message.direction === 'INBOUND';
  const text =
    typeof message.content['text'] === 'string'
      ? (message.content['text'] as string)
      : typeof message.content['caption'] === 'string'
        ? (message.content['caption'] as string)
        : `[${message.type.toLowerCase()}]`;

  return (
    <div className={cn('flex', isInbound ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'group max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
          isInbound
            ? 'rounded-bl-sm bg-secondary text-foreground'
            : message.fromAi
              ? 'rounded-br-sm bg-primary/10 text-foreground'
              : 'rounded-br-sm bg-primary text-primary-foreground',
        )}
      >
        {message.fromAi && (
          <p className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary/90">
            <Bot className="h-3 w-3" /> Agente IA
          </p>
        )}
        <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
          <span>
            {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isInbound && <StatusGlyph status={message.status} hasError={!!message.errorMessage} />}
        </div>
        {message.errorMessage && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle className="h-3 w-3" /> {message.errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusGlyph({ status, hasError }: { status: InboxMessage['status']; hasError: boolean }) {
  if (hasError) return <AlertCircle className="h-3 w-3 text-destructive" />;
  if (status === 'READ')
    return <CheckCheck className="h-3 w-3 text-blue-400" aria-label="lido" />;
  if (status === 'DELIVERED') return <CheckCheck className="h-3 w-3" aria-label="entregue" />;
  if (status === 'SENT') return <CheckCircle2 className="h-3 w-3" aria-label="enviado" />;
  return <Clock className="h-3 w-3" aria-label="enviando" />;
}

function ContactPanel({ detail }: { detail: InboxConversationDetail }) {
  const [tagDraft, setTagDraft] = useState('');
  const [tags, setTags] = useState(detail.contact.tags);
  const [note, setNote] = useState(detail.internalNotes ?? '');
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTags(detail.contact.tags);
  }, [detail.contact.tags]);

  function addTag(t: string) {
    const clean = t.trim();
    if (!clean) return;
    if (tags.includes(clean)) return;
    const next = [...tags, clean];
    setTags(next);
    setTagDraft('');
    startTransition(async () => {
      await setContactTags({ conversationId: detail.id, tags: next });
    });
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    startTransition(async () => {
      await setContactTags({ conversationId: detail.id, tags: next });
    });
  }

  function saveNote() {
    startTransition(async () => {
      await setInternalNote({ conversationId: detail.id, note });
    });
  }

  const statusLabel: Record<typeof detail.status, string> = {
    AI_HANDLING: 'IA atendendo',
    HUMAN_HANDLING: 'Humano atendendo',
    CLOSED: 'Fechada',
  };

  return (
    <aside className="hidden flex-col gap-5 border-l border-border/60 bg-secondary/15 p-5 lg:flex">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Status</p>
        <div className="mt-2 flex items-center gap-2 text-sm">
          {detail.status === 'AI_HANDLING' ? (
            <Bot className="h-4 w-4 text-primary" />
          ) : detail.status === 'HUMAN_HANDLING' ? (
            <Headset className="h-4 w-4 text-foreground" />
          ) : (
            <PhoneOff className="h-4 w-4 text-muted-foreground" />
          )}
          {statusLabel[detail.status]}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Telefone</p>
        <p className="mt-2 font-mono text-sm">+{detail.contact.phoneE164}</p>
      </div>

      {detail.contact.lastSeenAt && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Última vez</p>
          <p className="mt-2 text-sm text-foreground/80">
            {new Date(detail.contact.lastSeenAt).toLocaleString('pt-BR')}
          </p>
        </div>
      )}

      {detail.contact.optedOut && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Contato optou por não receber mensagens ativas (opt-out LGPD).
        </div>
      )}

      <div>
        <p className="flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground">
          <Tag className="h-3 w-3" /> Tags
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="group inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-xs"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                aria-label={`Remover ${t}`}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag(tagDraft);
              }
            }}
            placeholder="Nova tag…"
            className="h-9 flex-1 rounded-md border border-border/60 bg-background/40 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="button" size="sm" variant="outline" onClick={() => addTag(tagDraft)}>
            Add
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Anotação interna</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          placeholder="Visível só pro time. Não vai pro cliente."
          rows={4}
          className="mt-2 w-full resize-none rounded-md border border-border/60 bg-background/40 p-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">Salva automaticamente ao sair do campo.</p>
      </div>
    </aside>
  );
}

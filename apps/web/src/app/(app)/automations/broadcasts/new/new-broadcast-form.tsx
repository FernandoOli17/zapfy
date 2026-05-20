'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Megaphone } from 'lucide-react';
import { Button, Input, Label } from '@zapai/ui';

import { createBroadcast, type CreateBroadcastInput } from '../actions';

interface TemplateLite {
  id: string;
  name: string;
  language: string;
  category: string;
}

export function NewBroadcastForm({
  templates,
  tags,
  totalContacts,
}: {
  templates: TemplateLite[];
  tags: string[];
  totalContacts: number;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [mode, setMode] = useState<'all' | 'tag' | 'ids'>('all');
  const [tag, setTag] = useState(tags[0] ?? '');
  const [idsRaw, setIdsRaw] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Dê um nome ao broadcast');
      return;
    }
    if (!templateId) {
      setError('Selecione um template');
      return;
    }

    let target: CreateBroadcastInput['target'];
    if (mode === 'all') {
      target = { mode: 'all' };
    } else if (mode === 'tag') {
      if (!tag.trim()) {
        setError('Escolha uma tag');
        return;
      }
      target = { mode: 'tag', tag: tag.trim() };
    } else {
      const ids = idsRaw
        .split(/[\s,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 0) {
        setError('Cole pelo menos um contactId');
        return;
      }
      target = { mode: 'ids', contactIds: ids };
    }

    const input: CreateBroadcastInput = {
      name: name.trim(),
      templateId,
      target,
      ...(scheduledFor ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
    };

    startTransition(async () => {
      const r = await createBroadcast(input);
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      router.push('/automations/broadcasts');
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <Label htmlFor="b-name">Nome interno</Label>
        <Input
          id="b-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Black Friday — reativação clientes inativos"
          className="mt-1.5 h-10"
          maxLength={120}
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Só pra você se achar depois. Não aparece pro cliente.
        </p>
      </div>

      <div>
        <Label htmlFor="b-template">Template HSM</Label>
        <select
          id="b-template"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.language} · {t.category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>Destinatários</Label>
        <div className="mt-1.5 space-y-2">
          <label className="flex items-start gap-2 rounded-md border border-border/60 p-3 text-sm hover:bg-secondary/40">
            <input
              type="radio"
              name="mode"
              value="all"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              className="mt-1"
            />
            <span>
              <strong>Todos os contatos elegíveis</strong>
              <span className="ml-2 text-muted-foreground">
                ({totalContacts} contato{totalContacts === 1 ? '' : 's'} ativo
                {totalContacts === 1 ? '' : 's'}, sem opt-out)
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 rounded-md border border-border/60 p-3 text-sm hover:bg-secondary/40">
            <input
              type="radio"
              name="mode"
              value="tag"
              checked={mode === 'tag'}
              onChange={() => setMode('tag')}
              className="mt-1"
              disabled={tags.length === 0}
            />
            <span className="flex-1">
              <strong>Por tag</strong>
              {tags.length === 0 ? (
                <span className="ml-2 text-muted-foreground">
                  (nenhuma tag cadastrada em contatos ainda)
                </span>
              ) : (
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  disabled={mode !== 'tag'}
                  className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  {tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </span>
          </label>

          <label className="flex items-start gap-2 rounded-md border border-border/60 p-3 text-sm hover:bg-secondary/40">
            <input
              type="radio"
              name="mode"
              value="ids"
              checked={mode === 'ids'}
              onChange={() => setMode('ids')}
              className="mt-1"
            />
            <span className="flex-1">
              <strong>IDs específicos</strong>
              <textarea
                value={idsRaw}
                onChange={(e) => setIdsRaw(e.target.value)}
                disabled={mode !== 'ids'}
                rows={3}
                placeholder="cole contactIds separados por vírgula ou linha"
                className="mt-2 w-full rounded-md border border-input bg-background p-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </span>
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="b-when">Quando enviar</Label>
        <Input
          id="b-when"
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className="mt-1.5 h-10"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Deixe vazio pra ficar como rascunho (você lança manualmente depois).
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando…
            </>
          ) : (
            <>
              <Megaphone className="mr-2 h-4 w-4" />
              Criar broadcast
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

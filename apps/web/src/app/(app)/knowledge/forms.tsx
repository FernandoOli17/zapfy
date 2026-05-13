'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@zapai/ui';

import { addManualKnowledge, addUrlKnowledge } from './actions';

export function AddUrlForm() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await addUrlKnowledge({
        url,
        ...(title.trim() ? { customTitle: title.trim() } : {}),
      });
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      setSaved(true);
      setUrl('');
      setTitle('');
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://minhaempresa.com.br/faq"
          className="mt-1.5 h-10"
        />
      </div>
      <div>
        <Label htmlFor="custom-title">Título (opcional)</Label>
        <Input
          id="custom-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Deixa em branco pra usar o título da página"
          className="mt-1.5 h-10"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" disabled={busy || !url}>
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Baixando…
          </>
        ) : saved ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Adicionado
          </>
        ) : (
          'Adicionar URL'
        )}
      </Button>
    </form>
  );
}

export function AddManualForm() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await addManualKnowledge({ title, text });
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      setSaved(true);
      setTitle('');
      setText('');
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          type="text"
          required
          minLength={2}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Política de troca, Horários, Tabela de preços"
          className="mt-1.5 h-10"
        />
      </div>
      <div>
        <Label htmlFor="text">Conteúdo</Label>
        <textarea
          id="text"
          required
          minLength={10}
          maxLength={50_000}
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Texto que o agente pode usar pra responder…"
          className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {text.length.toLocaleString('pt-BR')} / 50.000 chars
        </p>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" disabled={busy || !title || text.length < 10}>
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando…
          </>
        ) : saved ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Adicionado
          </>
        ) : (
          'Adicionar texto'
        )}
      </Button>
    </form>
  );
}

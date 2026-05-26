'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@zapai/ui';

import { changeSlug, renameWorkspace } from './actions';

interface Props {
  workspace: { id: string; name: string; slug: string };
  isOwner: boolean;
}

export function WorkspaceForm({ workspace, isOwner }: Props) {
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<'name' | 'slug' | null>(null);

  function flashSaved(field: 'name' | 'slug') {
    setSavedField(field);
    setTimeout(() => setSavedField(null), 1800);
  }

  function onSaveName(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await renameWorkspace({ name });
      if (r.status === 'error') setError(r.error);
      else flashSaved('name');
    });
  }

  function onSaveSlug(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await changeSlug({ slug });
      if (r.status === 'error') setError(r.error);
      else flashSaved('slug');
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSaveName} className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <div className="flex gap-2">
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isOwner || busy}
            className="h-10 flex-1"
            minLength={2}
            maxLength={80}
            required
          />
          <Button type="submit" disabled={!isOwner || busy || name === workspace.name}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
        {savedField === 'name' && (
          <p className="inline-flex items-center gap-1 text-xs text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Salvo
          </p>
        )}
      </form>

      <form onSubmit={onSaveSlug} className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <div className="flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition">
          <span className="px-3 text-sm text-muted-foreground select-none border-r border-border/60">
            Orbe.dev/
          </span>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '')
                  .slice(0, 40),
              )
            }
            disabled={!isOwner || busy}
            pattern="[a-z0-9-]+"
            minLength={3}
            required
            className="h-10 flex-1 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
          />
          <div className="pr-2">
            <Button type="submit" size="sm" disabled={!isOwner || busy || slug === workspace.slug}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Mudar o slug muda a URL pública e pode quebrar links existentes. Pense duas vezes.
        </p>
        {savedField === 'slug' && (
          <p className="inline-flex items-center gap-1 text-xs text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Salvo
          </p>
        )}
      </form>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

'use client';

import { useActionState, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@zapfy/ui';

import { createWorkspaceAction } from './actions';

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function OnboardingForm() {
  const [state, formAction] = useActionState(createWorkspaceAction, undefined);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('slug', effectiveSlug);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="name">Nome da empresa</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Minha Empresa Ltda."
          className="mt-1.5 h-11"
        />
      </div>
      <div>
        <Label htmlFor="slug">Slug (URL)</Label>
        <div className="mt-1.5 flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition">
          <span className="px-3 text-sm text-muted-foreground select-none border-r border-border/60">
            Trato.dev/
          </span>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            minLength={3}
            pattern="[a-z0-9-]+"
            value={effectiveSlug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setSlugTouched(true);
            }}
            placeholder="minha-empresa"
            className="flex-1 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Letras minúsculas, números e hífen. Usado na URL do dashboard.
        </p>
      </div>

      {state?.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Button type="submit" className="w-full h-11" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Criando workspace…
          </>
        ) : (
          'Criar workspace e continuar'
        )}
      </Button>
    </form>
  );
}

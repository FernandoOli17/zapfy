'use client';

import { useActionState } from 'react';
import { Button, Input, Label } from '@zapai/ui';

import { createWorkspaceAction } from './actions';

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createWorkspaceAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="name">Nome da empresa</Label>
        <Input id="name" name="name" type="text" required minLength={2} className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          name="slug"
          type="text"
          required
          minLength={3}
          pattern="[a-z0-9-]+"
          className="mt-1.5"
          placeholder="minha-empresa"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Apenas minúsculas, números e hífen. Usado nas URLs do dashboard.
        </p>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Criando…' : 'Criar workspace'}
      </Button>
    </form>
  );
}

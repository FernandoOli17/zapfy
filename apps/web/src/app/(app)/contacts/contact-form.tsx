'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Trash2, UserPlus } from 'lucide-react';
import { Button, Input, Label } from '@zapfy/ui';

import {
  createContact,
  deleteContact,
  updateContact,
  type ContactInput,
} from './actions';

export interface ContactFormInitial {
  id?: string;
  phone: string;
  name: string;
  email: string;
  tagsCsv: string;
  optedOut: boolean;
}

export function ContactForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial: ContactFormInitial;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(initial.phone);
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [tagsCsv, setTagsCsv] = useState(initial.tagsCsv);
  const [optedOut, setOptedOut] = useState(initial.optedOut);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: ContactInput = {
      phone,
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      tags: tagsCsv,
      optedOut,
    };

    startTransition(async () => {
      const r =
        mode === 'create'
          ? await createContact(input)
          : await updateContact({ ...input, id: initial.id! });
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      router.push('/contacts');
    });
  }

  function onDelete() {
    if (!initial.id) return;
    if (
      !confirm(
        `Deletar este contato? A entrada vira soft-deleted e o hard delete LGPD acontece em 30d.`,
      )
    )
      return;
    startDelete(async () => {
      const r = await deleteContact(initial.id!);
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      router.push('/contacts');
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <Label htmlFor="c-phone">Telefone (E.164)</Label>
        <Input
          id="c-phone"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+55 11 91234-5678"
          className="mt-1.5 h-10"
          autoComplete="tel"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Com código do país. Só dígitos são guardados.
        </p>
      </div>

      <div>
        <Label htmlFor="c-name">Nome</Label>
        <Input
          id="c-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Maria Souza"
          className="mt-1.5 h-10"
          maxLength={120}
        />
      </div>

      <div>
        <Label htmlFor="c-email">E-mail</Label>
        <Input
          id="c-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="maria@empresa.com"
          className="mt-1.5 h-10"
          autoComplete="email"
        />
      </div>

      <div>
        <Label htmlFor="c-tags">Tags (separadas por vírgula)</Label>
        <Input
          id="c-tags"
          value={tagsCsv}
          onChange={(e) => setTagsCsv(e.target.value)}
          placeholder="cliente, vip, sp"
          className="mt-1.5 h-10"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Lowercase, sem espaços nas pontas. Usadas em filtros e broadcasts.
        </p>
      </div>

      <label className="flex items-start gap-2 rounded-md border border-border/60 p-3 text-sm">
        <input
          type="checkbox"
          checked={optedOut}
          onChange={(e) => setOptedOut(e.target.checked)}
          className="mt-1"
        />
        <span>
          <strong>Opt-out</strong> — não receber mensagens ativas (broadcasts, lembretes).
          Marcar quando o cliente pede.
        </span>
      </label>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending || deleting}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando…
            </>
          ) : mode === 'create' ? (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Criar contato
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar alterações
            </>
          )}
        </Button>

        {mode === 'edit' && initial.id && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={pending || deleting}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Deletar contato
          </Button>
        )}
      </div>
    </form>
  );
}

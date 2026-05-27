'use client';

import { useState, useTransition } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import { Button, cn, EmptyState, Input, Label, useToast } from '@zapai/ui';

import { deleteProfessional, saveProfessional } from './actions';

interface Pro {
  id: string;
  name: string;
  specialty: string | null;
  email: string | null;
  active: boolean;
  appointmentsCount: number;
  hasGoogleCalendar: boolean;
}

export function ProfessionalsManager({
  professionals,
  isAdmin,
}: {
  professionals: Pro[];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState<Pro | null>(null);
  const [creating, setCreating] = useState(false);

  if (professionals.length === 0 && !creating) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="Sem profissionais cadastrados"
        description="Cadastre o primeiro profissional. Pode ser médico, dentista, terapeuta — qualquer um que receba agendamentos."
        action={
          isAdmin ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Cadastrar profissional
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && !creating && !editing && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo profissional
          </Button>
        </div>
      )}

      {(creating || editing) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <ProForm
            initial={editing}
            onDone={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        </div>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {professionals.map((p) => (
          <li key={p.id}>
            <ProRow pro={p} isAdmin={isAdmin} onEdit={() => setEditing(p)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProRow({
  pro,
  isAdmin,
  onEdit,
}: {
  pro: Pro;
  isAdmin: boolean;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  function onDelete() {
    if (!confirm(`Apagar profissional "${pro.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteProfessional(pro.id);
      if (r.status === 'error') {
        push({ type: 'error', message: r.error });
      } else {
        push({ type: 'success', message: `"${pro.name}" removido` });
      }
    });
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 transition-colors hover:bg-muted/30',
        !pro.active && 'opacity-60',
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {pro.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {pro.name}
          {!pro.active && (
            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              inativo
            </span>
          )}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {pro.specialty && <span>{pro.specialty}</span>}
          {pro.email && <span className="truncate">{pro.email}</span>}
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {pro.appointmentsCount} agend{pro.appointmentsCount === 1 ? 'amento' : 'amentos'}
          </span>
          {pro.hasGoogleCalendar ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Google Calendar
            </span>
          ) : (
            <span className="text-muted-foreground/60">sem Google Calendar</span>
          )}
        </div>
      </div>
      {isAdmin && (
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            disabled={pending}
            aria-label="Apagar"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function ProForm({ initial, onDone }: { initial: Pro | null; onDone: () => void }) {
  const { push } = useToast();
  const [name, setName] = useState(initial?.name ?? '');
  const [specialty, setSpecialty] = useState(initial?.specialty ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    startTransition(async () => {
      const r = await saveProfessional({
        ...(initial?.id ? { id: initial.id } : {}),
        name: name.trim(),
        ...(specialty.trim() ? { specialty: specialty.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        active,
      });
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      push({ type: 'success', message: initial ? 'Atualizado' : 'Profissional cadastrado' });
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{initial ? `Editar ${initial.name}` : 'Novo profissional'}</p>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDone} aria-label="Fechar">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="pro-name">Nome *</Label>
          <Input
            id="pro-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            autoFocus
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="pro-specialty">Especialidade</Label>
          <Input
            id="pro-specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            maxLength={80}
            placeholder="ex: Clínica geral"
            className="mt-1.5"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="pro-email">E-mail (opcional)</Label>
        <Input
          id="pro-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="quando configurar Google Calendar"
          className="mt-1.5"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4"
        />
        Ativo — disponível pra novos agendamentos
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Salvando…
            </>
          ) : (
            'Salvar'
          )}
        </Button>
      </div>
    </form>
  );
}

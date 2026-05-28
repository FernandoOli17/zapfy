'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { Button, Input, Label, cn } from '@zapfy/ui';

import { createApiKey } from './actions';

const SCOPE_LIST = [
  { id: 'lgpd:export', label: 'LGPD · Exportar', description: 'Acesso ao POST /api/lgpd/export' },
  { id: 'lgpd:delete', label: 'LGPD · Deletar', description: 'Acesso ao POST /api/lgpd/delete' },
  { id: 'lgpd:opt-out', label: 'LGPD · Opt-out', description: 'Acesso ao POST /api/lgpd/opt-out' },
  { id: 'contacts:read', label: 'Contatos · Ler', description: 'Listar contatos do workspace' },
  { id: 'contacts:write', label: 'Contatos · Escrever', description: 'Criar/atualizar contatos' },
  { id: 'conversations:read', label: 'Conversas · Ler', description: 'Listar conversas e mensagens' },
  { id: 'messages:send', label: 'Mensagens · Enviar', description: 'Disparar mensagens via Cloud API' },
] as const;

export function CreateKeyForm() {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['lgpd:export', 'lgpd:delete', 'lgpd:opt-out']);
  const [expiresIn, setExpiresIn] = useState<string>(''); // string pra controlled
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ secret: string; prefix: string; name: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  function toggleScope(s: string) {
    setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (scopes.length === 0) {
      setError('Selecione pelo menos um scope');
      return;
    }
    const exp = expiresIn ? Number.parseInt(expiresIn, 10) : undefined;
    startTransition(async () => {
      const r = await createApiKey({
        name,
        scopes: scopes as never,
        ...(exp ? { expiresInDays: exp } : {}),
      });
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      setCreated({ secret: r.secret, prefix: r.prefix, name: r.name });
      setName('');
    });
  }

  async function onCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* */
    }
  }

  if (created) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Chave criada: {created.name}</p>
            <p className="mt-1 text-muted-foreground">
              Copie agora — não mostramos o segredo de novo. A gente só guarda o hash.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 p-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate font-mono text-sm">{created.secret}</code>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border/60 px-2 text-xs hover:bg-secondary"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
        <Button type="button" variant="ghost" onClick={() => setCreated(null)}>
          Criar outra
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Integração CRM, Bot LGPD…"
            className="mt-1.5 h-10"
          />
        </div>
        <div>
          <Label htmlFor="expiresIn">Expira em (dias)</Label>
          <Input
            id="expiresIn"
            type="number"
            min={1}
            max={365}
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            placeholder="opcional"
            className="mt-1.5 h-10"
          />
        </div>
      </div>

      <div>
        <Label>Scopes</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Permissões dessa chave. Princípio do menor privilégio — só marque o que vai usar.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SCOPE_LIST.map((s) => {
            const active = scopes.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleScope(s.id)}
                className={cn(
                  'flex items-start gap-2 rounded-lg border bg-background/40 p-3 text-left text-sm transition-colors',
                  active
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border/60 hover:border-border',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                  )}
                >
                  {active && <CheckCircle2 className="h-3 w-3" />}
                </span>
                <span>
                  <span className="font-medium">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Gerando…
          </>
        ) : (
          'Gerar API key'
        )}
      </Button>
    </form>
  );
}

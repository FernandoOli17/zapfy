'use client';

import { useState, useTransition } from 'react';
import { AlertCircle, Check, Copy, Loader2, Plus, Power, Trash2 } from 'lucide-react';
import { Button, cn, Input, Label } from '@zapai/ui';

import { createCustomTool, deleteCustomTool, toggleCustomTool } from './actions';

interface CustomToolSummary {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  secretPrefix: string;
  active: boolean;
  createdAt: string;
}

const SAMPLE_SCHEMA = JSON.stringify(
  {
    type: 'object',
    properties: {
      order_id: { type: 'string', description: 'ID do pedido a rastrear' },
    },
    required: ['order_id'],
  },
  null,
  2,
);

export function CustomToolsManager({ tools }: { tools: CustomToolSummary[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Tools customizadas</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Crie ferramentas HTTP que o agente IA pode invocar. Cada chamada vai com header{' '}
              <code className="rounded bg-muted px-1 font-mono text-xs">x-trato-signature</code>{' '}
              (HMAC SHA-256 do body com seu secret). Você verifica do seu lado.
            </p>
          </div>
          {!creating && (
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nova tool
            </Button>
          )}
        </div>

        {creating && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <CreateToolForm
              onDone={() => setCreating(false)}
              onCancel={() => setCreating(false)}
            />
          </div>
        )}

        <div className="mt-8 space-y-3">
          {tools.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center">
              <p className="text-sm font-medium">Nenhuma tool customizada ainda.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Clique em &quot;Nova tool&quot; pra criar a primeira.
              </p>
            </div>
          ) : (
            tools.map((t) => <ToolRow key={t.id} tool={t} />)
          )}
        </div>
      </div>
    </div>
  );
}

function CreateToolForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [schemaText, setSchemaText] = useState(SAMPLE_SCHEMA);
  const [timeoutMs, setTimeoutMs] = useState(10_000);
  const [creating, startCreating] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ secret: string; prefix: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let inputSchema: unknown;
    try {
      inputSchema = JSON.parse(schemaText);
    } catch {
      setError('JSON Schema inválido — confira a sintaxe');
      return;
    }

    startCreating(async () => {
      const r = await createCustomTool({
        name,
        description,
        inputSchema,
        endpoint,
        timeoutMs,
      });
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      setCreated({ secret: r.secret, prefix: r.prefix });
    });
  }

  async function copySecret() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* silent */
    }
  }

  if (created) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <Check className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-medium">Tool criada com sucesso.</p>
            <p className="mt-1 text-muted-foreground">
              Copie o secret agora — não mostramos de novo. Use pra verificar a assinatura HMAC.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate font-mono text-sm">{created.secret}</code>
            <button
              type="button"
              onClick={copySecret}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-[11px]">
{`# Pseudocódigo de verificação no seu endpoint
const expected = "sha256=" + sha256_hmac(secret + body)
if (req.headers['x-trato-signature'] !== expected) {
  return 401
}`}
        </pre>
        <Button type="button" onClick={onDone}>
          Concluído
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="tool-name">Nome</Label>
          <Input
            id="tool-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="track_order"
            required
            className="mt-1.5 font-mono"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            só minúsculas, números, _. usado pelo LLM como tool name.
          </p>
        </div>
        <div>
          <Label htmlFor="tool-timeout">Timeout (ms)</Label>
          <Input
            id="tool-timeout"
            type="number"
            min={1000}
            max={60_000}
            step={500}
            value={timeoutMs}
            onChange={(e) => setTimeoutMs(Number.parseInt(e.target.value, 10) || 10_000)}
            className="mt-1.5"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="tool-desc">Descrição</Label>
        <textarea
          id="tool-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          required
          placeholder="Rastreia o status de um pedido pelo ID. Retorna {status, eta, tracking_url}."
          className="mt-1.5 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          O LLM lê isso pra decidir quando invocar. Seja claro sobre input e output.
        </p>
      </div>

      <div>
        <Label htmlFor="tool-endpoint">Endpoint HTTPS</Label>
        <Input
          id="tool-endpoint"
          type="url"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          required
          placeholder="https://api.suaempresa.com/tools/track-order"
          className="mt-1.5 font-mono"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Recebemos POST com JSON. Bloqueamos IPs privados / localhost (SSRF guard).
        </p>
      </div>

      <div>
        <Label htmlFor="tool-schema">Input JSON Schema</Label>
        <textarea
          id="tool-schema"
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          rows={10}
          required
          spellCheck={false}
          className="mt-1.5 w-full rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={creating}>
          Cancelar
        </Button>
        <Button type="submit" disabled={creating}>
          {creating ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Criando…
            </>
          ) : (
            'Criar tool'
          )}
        </Button>
      </div>
    </form>
  );
}

function ToolRow({ tool }: { tool: CustomToolSummary }) {
  const [pending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      await toggleCustomTool(tool.id, !tool.active);
    });
  }
  function onDelete() {
    if (!confirm(`Apagar tool "${tool.name}"? Essa ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      await deleteCustomTool(tool.id);
    });
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 transition-colors',
        tool.active ? 'border-border' : 'border-border/50 opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm font-medium">{tool.name}</code>
            {!tool.active && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                desligada
              </span>
            )}
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{tool.description}</p>
          <div className="mt-3 grid gap-2 text-xs">
            <Row label="Endpoint">
              <code className="break-all font-mono">{tool.endpoint}</code>
            </Row>
            <Row label="Secret">
              <span className="font-mono" title="O secret completo só é mostrado uma vez na criação">
                {tool.secretPrefix}…
              </span>
            </Row>
            <Row label="Criada">
              {new Date(tool.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Row>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggle}
            disabled={pending}
            title={tool.active ? 'Desativar' : 'Ativar'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            title="Apagar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate text-foreground">{children}</span>
    </div>
  );
}

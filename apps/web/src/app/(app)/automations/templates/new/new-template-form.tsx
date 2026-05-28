'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@zapfy/ui';

import { createMessageTemplate } from '../actions';

export function NewTemplateForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'pt_BR' | 'en_US' | 'es_ES'>('pt_BR');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('UTILITY');
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createMessageTemplate({
        name,
        language,
        category,
        components: {
          ...(header.trim() ? { header: { type: 'TEXT', text: header.trim() } } : {}),
          body: { text: body.trim() },
          ...(footer.trim() ? { footer: { text: footer.trim() } } : {}),
        },
      });
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      router.push('/automations/templates');
    });
  }

  const previewParams = body.match(/\{\{\d+\}\}/g) ?? [];

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Nome técnico</Label>
          <Input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) =>
              setName(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, '_')
                  .slice(0, 60),
              )
            }
            placeholder="confirma_pedido"
            className="mt-1.5 h-10 font-mono"
            minLength={2}
            pattern="[a-z0-9_]+"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            snake_case. Único por idioma.
          </p>
        </div>
        <div className="grid gap-4 grid-cols-2">
          <div>
            <Label htmlFor="language">Idioma</Label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'pt_BR' | 'en_US' | 'es_ES')}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="pt_BR">pt-BR</option>
              <option value="en_US">en-US</option>
              <option value="es_ES">es-ES</option>
            </select>
          </div>
          <div>
            <Label htmlFor="category">Categoria</Label>
            <select
              id="category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION')
              }
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="UTILITY">Utility</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="header">Header (opcional)</Label>
        <Input
          id="header"
          type="text"
          maxLength={60}
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          placeholder="Confirmação do seu pedido"
          className="mt-1.5 h-10"
        />
        <p className="mt-1 text-xs text-muted-foreground">{header.length} / 60</p>
      </div>

      <div>
        <Label htmlFor="body">Body</Label>
        <textarea
          id="body"
          required
          minLength={1}
          maxLength={1024}
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Oi {{1}}! Seu pedido {{2}} foi confirmado. Previsão de entrega: {{3}}. Qualquer dúvida, é só chamar."
          className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {body.length} / 1024 ·{' '}
          {previewParams.length === 0
            ? 'sem parâmetros'
            : `${previewParams.length} parâmetro${previewParams.length === 1 ? '' : 's'}: ${previewParams.join(', ')}`}
        </p>
      </div>

      <div>
        <Label htmlFor="footer">Footer (opcional)</Label>
        <Input
          id="footer"
          type="text"
          maxLength={60}
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          placeholder="Equipe Zapfy"
          className="mt-1.5 h-10"
        />
        <p className="mt-1 text-xs text-muted-foreground">{footer.length} / 60</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy || !name || body.length < 1}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submetendo…
            </>
          ) : (
            'Criar e submeter'
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          MVP: cria com status &quot;em análise&quot;. Submissão real à Meta entra na Fase 9
          completa.
        </p>
      </div>
    </form>
  );
}

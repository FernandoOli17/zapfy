'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, Input, Label, useToast } from '@zapfy/ui';

import { saveProduct } from './actions';

interface Props {
  /** Quando presente, é edição. */
  initial?: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number | null;
    sku: string | null;
    category: string | null;
    stock: number | null;
    imageUrl: string | null;
    checkoutUrl: string | null;
    active: boolean;
  };
}

export function ProductForm({ initial }: Props) {
  const router = useRouter();
  const { push } = useToast();
  const isEdit = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priceReais, setPriceReais] = useState(
    initial?.priceCents !== null && initial?.priceCents !== undefined
      ? (initial.priceCents / 100).toFixed(2)
      : '',
  );
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [stock, setStock] = useState(
    initial?.stock !== null && initial?.stock !== undefined ? String(initial.stock) : '',
  );
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [checkoutUrl, setCheckoutUrl] = useState(initial?.checkoutUrl ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    const priceCents = priceReais.trim()
      ? Math.round(Number.parseFloat(priceReais.replace(',', '.')) * 100)
      : null;
    if (priceCents !== null && (!Number.isFinite(priceCents) || priceCents < 0)) {
      setError('Preço inválido');
      return;
    }
    const stockN = stock.trim() ? Number.parseInt(stock, 10) : null;

    startSaving(async () => {
      const r = await saveProduct({
        ...(initial?.id ? { id: initial.id } : {}),
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        priceCents,
        ...(sku.trim() ? { sku: sku.trim() } : {}),
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
        ...(checkoutUrl.trim() ? { checkoutUrl: checkoutUrl.trim() } : {}),
        ...(stockN !== null ? { stock: stockN } : { stock: null }),
        active,
      });
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      push({ type: 'success', message: isEdit ? 'Produto atualizado' : 'Produto criado' });
      router.push('/products');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *" htmlFor="name">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            autoFocus
          />
        </Field>
        <Field label="SKU / código" htmlFor="sku">
          <Input
            id="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            maxLength={50}
            className="font-mono"
            placeholder="opcional"
          />
        </Field>
      </div>

      <Field label="Descrição" htmlFor="desc">
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Descrição curta. O agente IA lê pra recomendar pro cliente."
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Preço (R$)" htmlFor="price">
          <Input
            id="price"
            type="text"
            inputMode="decimal"
            value={priceReais}
            onChange={(e) => setPriceReais(e.target.value)}
            placeholder="49.90"
          />
        </Field>
        <Field label="Categoria" htmlFor="category">
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={60}
            placeholder="Ex: Pizzas, Acessórios"
          />
        </Field>
        <Field label="Estoque" htmlFor="stock">
          <Input
            id="stock"
            type="text"
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))}
            placeholder="opcional"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="URL da imagem" htmlFor="image">
          <Input
            id="image"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </Field>
        <Field label="URL de checkout direto" htmlFor="checkout">
          <Input
            id="checkout"
            type="url"
            value={checkoutUrl}
            onChange={(e) => setCheckoutUrl(e.target.value)}
            placeholder="Opcional — usado pela tool send_checkout_link"
          />
        </Field>
      </div>

      <Field label="" htmlFor="active">
        <label className="flex items-center gap-2 text-sm">
          <input
            id="active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4"
          />
          Ativo — visível pro agente IA e cliente final
        </label>
      </Field>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Salvando…
            </>
          ) : isEdit ? (
            'Salvar alterações'
          ) : (
            'Criar produto'
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

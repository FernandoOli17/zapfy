'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { Button, useToast } from '@zapai/ui';

import { changeQuoteStatus, saveQuoteDraft } from './actions';

interface ItemFormState {
  name: string;
  quantity: number;
  unitPriceCents: number;
  notes: string;
}

interface QuoteEditorProps {
  quoteId: string;
  initialServiceDescription: string;
  initialItems: ItemFormState[];
  initialValidUntil: string | null;
  initialNotes: string;
  currency: string;
}

function newRow(): ItemFormState {
  return { name: '', quantity: 1, unitPriceCents: 0, notes: '' };
}

/**
 * `<input type="date">` devolve 'YYYY-MM-DD' sem TZ. `new Date('YYYY-MM-DD')`
 * é parseado como UTC midnight — em qualquer TZ west of UTC isso vira o dia
 * anterior quando formatado local. Truque: cravar 12:00:00 local pra ficar
 * resiliente a qualquer offset razoável (até ±11h).
 */
function dateInputToIso(value: string): string | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
}

export function QuoteEditor(props: QuoteEditorProps) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  const [serviceDescription, setServiceDescription] = useState(props.initialServiceDescription);
  const [items, setItems] = useState<ItemFormState[]>(
    props.initialItems.length > 0 ? props.initialItems : [newRow()],
  );
  const [validUntil, setValidUntil] = useState<string>(
    props.initialValidUntil ? props.initialValidUntil.slice(0, 10) : '',
  );
  const [notes, setNotes] = useState(props.initialNotes);

  const subtotal = items.reduce(
    (acc, it) => acc + Math.max(0, Math.round(it.unitPriceCents * it.quantity)),
    0,
  );
  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: props.currency });

  function updateRow(idx: number, patch: Partial<ItemFormState>) {
    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeRow(idx: number) {
    setItems((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)));
  }
  function addRow() {
    setItems((rows) => [...rows, newRow()]);
  }

  function onSaveDraft(e?: React.FormEvent) {
    e?.preventDefault();
    startTransition(async () => {
      const cleaned = items
        .map((it) => ({
          name: it.name.trim(),
          quantity: Number(it.quantity) || 0,
          unitPriceCents: Math.round(Number(it.unitPriceCents) || 0),
          notes: it.notes.trim() || undefined,
        }))
        .filter((it) => it.name.length > 0);

      if (cleaned.length === 0) {
        push({ type: 'error', message: 'Adicione ao menos 1 item com nome' });
        return;
      }

      const r = await saveQuoteDraft({
        quoteId: props.quoteId,
        serviceDescription: serviceDescription.trim(),
        items: cleaned,
        validUntil: dateInputToIso(validUntil),
        notes: notes.trim(),
      });
      if (r.status === 'ok') {
        push({ type: 'success', message: `Rascunho salvo · total ${formatBRL(r.totalCents)}` });
        router.refresh();
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  function onSend() {
    if (!confirm('Enviar orçamento ao cliente? Após enviar não dá pra editar items.')) return;
    startTransition(async () => {
      // Salva primeiro pra garantir consistência
      const cleaned = items
        .map((it) => ({
          name: it.name.trim(),
          quantity: Number(it.quantity) || 0,
          unitPriceCents: Math.round(Number(it.unitPriceCents) || 0),
          notes: it.notes.trim() || undefined,
        }))
        .filter((it) => it.name.length > 0);
      if (cleaned.length === 0) {
        push({ type: 'error', message: 'Adicione itens antes de enviar' });
        return;
      }
      const s = await saveQuoteDraft({
        quoteId: props.quoteId,
        serviceDescription: serviceDescription.trim(),
        items: cleaned,
        validUntil: dateInputToIso(validUntil),
        notes: notes.trim(),
      });
      if (s.status !== 'ok') {
        push({ type: 'error', message: s.error });
        return;
      }
      const r = await changeQuoteStatus({ quoteId: props.quoteId, status: 'SENT' });
      if (r.status === 'ok') {
        push({ type: 'success', message: 'Orçamento enviado' });
        router.refresh();
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  return (
    <form onSubmit={onSaveDraft} className="space-y-6">
      <div>
        <label className="text-sm font-medium" htmlFor="qe-svc">
          Descrição do serviço
        </label>
        <textarea
          id="qe-svc"
          rows={3}
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
          required
          maxLength={2000}
          placeholder="Pintura completa de 3 cômodos com tinta acrílica..."
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">Itens</label>
          <Button type="button" size="sm" variant="outline" onClick={addRow}>
            <Plus className="mr-1 h-3 w-3" /> Adicionar item
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 items-start gap-2 rounded-md border border-border bg-card p-3"
            >
              <div className="col-span-12 md:col-span-5">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Item
                </label>
                <input
                  type="text"
                  value={it.name}
                  onChange={(e) => updateRow(idx, { name: e.target.value })}
                  placeholder="Mão-de-obra pintura..."
                  maxLength={200}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={it.notes}
                  onChange={(e) => updateRow(idx, { notes: e.target.value })}
                  placeholder="Observação (opcional)"
                  maxLength={300}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Qtd
                </label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={it.quantity}
                  onChange={(e) => updateRow(idx, { quantity: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm tabular-nums focus:border-primary focus:outline-none"
                />
              </div>
              <div className="col-span-5 md:col-span-3">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Valor unit. (R$)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={(it.unitPriceCents / 100).toString()}
                  onChange={(e) =>
                    updateRow(idx, {
                      unitPriceCents: Math.round((Number(e.target.value) || 0) * 100),
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm tabular-nums focus:border-primary focus:outline-none"
                />
              </div>
              <div className="col-span-3 md:col-span-1 text-right">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Total
                </label>
                <p className="mt-1 truncate text-sm font-semibold tabular-nums">
                  {formatBRL(Math.round(it.unitPriceCents * it.quantity))}
                </p>
              </div>
              <div className="col-span-1 md:col-span-1 flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={items.length === 1}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40"
                  aria-label="Remover item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end border-t border-border pt-3">
          <p className="text-base font-semibold tabular-nums">Total: {formatBRL(subtotal)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="qe-valid">
            Validade (opcional)
          </label>
          <input
            id="qe-valid"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="qe-notes">
            Notas internas (não vai pro cliente)
          </label>
          <input
            id="qe-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            placeholder="Cliente indicou orçamento ABC..."
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Salvar rascunho
        </Button>
        <Button type="button" disabled={pending || subtotal === 0} onClick={onSend}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Salvar + Enviar
        </Button>
      </div>
    </form>
  );
}

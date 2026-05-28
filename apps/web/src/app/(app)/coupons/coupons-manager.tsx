'use client';

import { useState, useTransition } from 'react';
import {
  AlertCircle,
  Calendar,
  Loader2,
  Percent,
  Pencil,
  Plus,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import { Button, cn, EmptyState, Input, Label, useToast } from '@zapfy/ui';

import { deleteCoupon, saveCoupon } from './actions';

interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED_CENTS';
  discountValue: number;
  minSubtotalCents: number | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  active: boolean;
}

export function CouponsManager({
  coupons,
  isAdmin,
}: {
  coupons: Coupon[];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [creating, setCreating] = useState(false);

  if (coupons.length === 0 && !creating) {
    return (
      <EmptyState
        icon={Ticket}
        title="Sem cupons cadastrados"
        description="Crie um cupom de desconto pra agente IA aplicar quando cliente pedir."
        action={
          isAdmin ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Criar cupom
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
            Novo cupom
          </Button>
        </div>
      )}

      {(creating || editing) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <CouponForm
            initial={editing}
            onDone={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {coupons.map((c) => (
          <li key={c.id}>
            <CouponRow coupon={c} isAdmin={isAdmin} onEdit={() => setEditing(c)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CouponRow({
  coupon,
  isAdmin,
  onEdit,
}: {
  coupon: Coupon;
  isAdmin: boolean;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  function onDelete() {
    if (!confirm(`Apagar cupom "${coupon.code}"?`)) return;
    startTransition(async () => {
      const r = await deleteCoupon(coupon.id);
      if (r.status === 'error') {
        push({ type: 'error', message: r.error });
      } else {
        push({ type: 'success', message: 'Cupom removido' });
      }
    });
  }

  const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
  const maxed =
    coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions;

  return (
    <div
      className={cn(
        'flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors',
        coupon.active && !expired && !maxed
          ? 'border-border hover:border-primary/30'
          : 'border-dashed border-border/60 opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <code className="rounded bg-primary/10 px-2 py-1 font-mono text-sm font-semibold text-primary">
            {coupon.code}
          </code>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} aria-label="Editar">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              disabled={pending}
              aria-label="Apagar"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>
        )}
      </div>

      <div className="text-2xl font-bold">
        {coupon.discountType === 'PERCENT' ? (
          <span>
            {coupon.discountValue}
            <Percent className="ml-0.5 inline h-4 w-4 text-muted-foreground" />
          </span>
        ) : (
          <span>
            {(coupon.discountValue / 100).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </span>
        )}
        <span className="ml-2 text-xs font-normal text-muted-foreground">de desconto</span>
      </div>

      <div className="mt-auto space-y-1 text-[11px] text-muted-foreground">
        {coupon.minSubtotalCents !== null && (
          <p>
            Compra mín:{' '}
            {(coupon.minSubtotalCents / 100).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </p>
        )}
        <p>
          Usado: {coupon.redeemedCount}
          {coupon.maxRedemptions !== null && ` / ${coupon.maxRedemptions}`}
          {maxed && <span className="ml-1 text-amber-600">(esgotado)</span>}
        </p>
        {coupon.expiresAt && (
          <p className={cn(expired && 'text-destructive')}>
            <Calendar className="mr-1 inline h-3 w-3" />
            {expired ? 'Expirou em' : 'Válido até'}{' '}
            {new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}
          </p>
        )}
        {!coupon.active && (
          <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider">
            desativado
          </span>
        )}
      </div>
    </div>
  );
}

function CouponForm({ initial, onDone }: { initial: Coupon | null; onDone: () => void }) {
  const { push } = useToast();
  const [code, setCode] = useState(initial?.code ?? '');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED_CENTS'>(
    initial?.discountType ?? 'PERCENT',
  );
  const [discountValue, setDiscountValue] = useState(
    initial
      ? initial.discountType === 'FIXED_CENTS'
        ? (initial.discountValue / 100).toFixed(2)
        : String(initial.discountValue)
      : '10',
  );
  const [minSubtotal, setMinSubtotal] = useState(
    initial?.minSubtotalCents !== null && initial?.minSubtotalCents !== undefined
      ? (initial.minSubtotalCents / 100).toFixed(2)
      : '',
  );
  const [maxRedemptions, setMaxRedemptions] = useState(
    initial?.maxRedemptions !== null && initial?.maxRedemptions !== undefined
      ? String(initial.maxRedemptions)
      : '',
  );
  const [expiresAt, setExpiresAt] = useState(
    initial?.expiresAt ? initial.expiresAt.slice(0, 10) : '',
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError('Código é obrigatório');
      return;
    }
    const rawValue = Number.parseFloat(discountValue.replace(',', '.'));
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      setError('Valor de desconto inválido');
      return;
    }
    const finalValue =
      discountType === 'FIXED_CENTS' ? Math.round(rawValue * 100) : Math.round(rawValue);

    const minCents = minSubtotal.trim()
      ? Math.round(Number.parseFloat(minSubtotal.replace(',', '.')) * 100)
      : null;
    const maxRed = maxRedemptions.trim() ? Number.parseInt(maxRedemptions, 10) : null;
    const expiresIso = expiresAt ? new Date(expiresAt + 'T23:59:59').toISOString() : null;

    startTransition(async () => {
      const r = await saveCoupon({
        ...(initial?.id ? { id: initial.id } : {}),
        code: code.trim(),
        discountType,
        discountValue: finalValue,
        minSubtotalCents: minCents,
        maxRedemptions: maxRed,
        expiresAt: expiresIso,
        active,
      });
      if (r.status === 'error') {
        setError(r.error);
        return;
      }
      push({ type: 'success', message: initial ? 'Cupom atualizado' : 'Cupom criado' });
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{initial ? `Editar ${initial.code}` : 'Novo cupom'}</p>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDone} aria-label="Fechar">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Código *</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            maxLength={40}
            placeholder="BLACKFRIDAY"
            className="mt-1.5 font-mono"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="type">Tipo de desconto *</Label>
          <select
            id="type"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FIXED_CENTS')}
            className="mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value="PERCENT">Percentual (%)</option>
            <option value="FIXED_CENTS">Valor fixo (R$)</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="value">
            Valor * {discountType === 'PERCENT' ? '(%)' : '(R$)'}
          </Label>
          <Input
            id="value"
            type="text"
            inputMode="decimal"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            required
            className="mt-1.5"
            placeholder={discountType === 'PERCENT' ? '10' : '5.00'}
          />
        </div>
        <div>
          <Label htmlFor="min">Compra mín (R$)</Label>
          <Input
            id="min"
            type="text"
            inputMode="decimal"
            value={minSubtotal}
            onChange={(e) => setMinSubtotal(e.target.value)}
            className="mt-1.5"
            placeholder="opcional"
          />
        </div>
        <div>
          <Label htmlFor="max">Usos máximos</Label>
          <Input
            id="max"
            type="text"
            inputMode="numeric"
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value.replace(/\D/g, ''))}
            className="mt-1.5"
            placeholder="ilimitado"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="exp">Expira em</Label>
        <Input
          id="exp"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
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
        Ativo
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

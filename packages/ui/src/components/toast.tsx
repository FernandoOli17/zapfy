'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Toast system minimalista — sem dependência externa (radix-toast adiciona ~10KB).
 * API estilo react-hot-toast: `toast.success("msg")`, `toast.error("msg")`.
 *
 * Setup (1x no root layout):
 *   <ToastProvider>
 *     {children}
 *     <Toaster />
 *   </ToastProvider>
 *
 * Uso (qualquer componente client):
 *   const { push } = useToast();
 *   push({ type: 'success', message: 'Salvo!' });
 */

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  /** ms até auto-dismiss; 0 = nunca */
  duration?: number;
}

interface ToastCtx {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const toast: Toast = { id, ...t };
      setToasts((prev) => [...prev, toast]);
      const duration = t.duration ?? 4000;
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      // cleanup all timers
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    },
    [],
  );

  return <Ctx.Provider value={{ toasts, push, dismiss }}>{children}</Ctx.Provider>;
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useToast precisa estar dentro de <ToastProvider>');
  }
  return ctx;
}

/** Container fixo. Renderiza uma vez no layout. */
export function Toaster() {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  return (
    <div
      role="region"
      aria-label="Notificações"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {ctx.toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => ctx.dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info;
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex min-w-[260px] max-w-[420px] items-start gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg transition-all duration-200',
        visible ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0',
        toast.type === 'success' && 'border-emerald-500/30',
        toast.type === 'error' && 'border-destructive/40',
        toast.type === 'info' && 'border-border',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          toast.type === 'success' && 'text-emerald-500',
          toast.type === 'error' && 'text-destructive',
          toast.type === 'info' && 'text-primary',
        )}
      />
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

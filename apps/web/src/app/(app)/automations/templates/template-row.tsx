'use client';

import { useTransition } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  PauseCircle,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button, useToast } from '@zapai/ui';

import {
  deleteMessageTemplate,
  mockApproveTemplate,
  refreshTemplateStatus,
  submitTemplateToMeta,
} from './actions';

interface TemplateRowProps {
  template: {
    id: string;
    name: string;
    language: string;
    category: string;
    status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';
    submittedAt: string | null;
    approvedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
    metaTemplateId: string | null;
  };
}

export function TemplateRow({ template }: TemplateRowProps) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  function onDelete() {
    if (!confirm(`Apagar template "${template.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteMessageTemplate(template.id);
      if (r.status === 'error') push({ type: 'error', message: r.error });
    });
  }

  function onMockApprove(approved: boolean) {
    startTransition(async () => {
      await mockApproveTemplate(template.id, approved);
    });
  }

  function onSubmitMeta() {
    if (!confirm(`Submeter "${template.name}" pra Meta? Análise leva ~1-24h.`)) return;
    startTransition(async () => {
      const r = await submitTemplateToMeta(template.id);
      if (r.status === 'ok') {
        push({ type: 'success', message: 'Enviado pra análise da Meta' });
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  function onRefresh() {
    startTransition(async () => {
      const r = await refreshTemplateStatus(template.id);
      if (r.status === 'ok') {
        push({ type: 'success', message: `Status: ${r.templateStatus.toLowerCase()}` });
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-sm">{template.name}</code>
            <span className="rounded-full border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              {template.language}
            </span>
            <span className="rounded-full border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              {template.category.toLowerCase()}
            </span>
            <StatusBadge status={template.status} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Criado em {new Date(template.createdAt).toLocaleString('pt-BR')}
            {template.approvedAt && ` · aprovado em ${new Date(template.approvedAt).toLocaleString('pt-BR')}`}
          </p>
          {template.rejectionReason && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {template.rejectionReason}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Submeter pra Meta — só se ainda não tem metaTemplateId */}
          {!template.metaTemplateId && template.status === 'SUBMITTED' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSubmitMeta}
              disabled={pending}
              title="Submeter pra aprovação da Meta"
            >
              <Send className="mr-1 h-3 w-3" />
              Submeter Meta
            </Button>
          )}
          {/* Refresh status — só se já foi submetido */}
          {template.metaTemplateId && template.status === 'SUBMITTED' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={pending}
              title="Atualizar status com Meta agora"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} />
            </Button>
          )}
          {/* Mock approve/reject — só em dev sem metaTemplateId */}
          {!template.metaTemplateId && template.status === 'SUBMITTED' && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onMockApprove(true)}
                disabled={pending}
                title="Mock: simular aprovação (dev only)"
                className="text-primary"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onMockApprove(false)}
                disabled={pending}
                title="Mock: simular rejeição (dev only)"
                className="text-muted-foreground hover:text-destructive"
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TemplateRowProps['template']['status'] }) {
  if (status === 'APPROVED')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
        <CheckCircle2 className="h-2.5 w-2.5" />
        aprovado
      </span>
    );
  if (status === 'SUBMITTED')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Clock className="h-2.5 w-2.5 animate-pulse" />
        em análise
      </span>
    );
  if (status === 'REJECTED')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-destructive">
        <XCircle className="h-2.5 w-2.5" />
        rejeitado
      </span>
    );
  if (status === 'PAUSED')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <PauseCircle className="h-2.5 w-2.5" />
        pausado
      </span>
    );
  return (
    <span className="rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
      {status.toLowerCase()}
    </span>
  );
}

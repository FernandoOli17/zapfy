'use client';

import { useTransition } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  PauseCircle,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@zapai/ui';

import { deleteMessageTemplate, mockApproveTemplate } from './actions';

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
  };
}

export function TemplateRow({ template }: TemplateRowProps) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`Apagar template "${template.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteMessageTemplate(template.id);
      if (r.status === 'error') alert(r.error);
    });
  }

  function onMockApprove(approved: boolean) {
    startTransition(async () => {
      await mockApproveTemplate(template.id, approved);
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
          {template.status === 'SUBMITTED' && (
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

'use client';

import { useTransition } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button, cn } from '@zapfy/ui';

import { deleteKnowledgeDocument, reprocessKnowledgeDocument } from './actions';

interface DocProps {
  doc: {
    id: string;
    title: string;
    source: 'UPLOAD' | 'URL' | 'MANUAL';
    sourceUrl: string | null;
    status: 'PROCESSING' | 'READY' | 'ERROR';
    chunksCount: number;
    createdAt: string;
    errorMessage: string | null;
  };
}

export function DocumentRow({ doc }: DocProps) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`Apagar "${doc.title}"?`)) return;
    startTransition(async () => {
      await deleteKnowledgeDocument(doc.id);
    });
  }

  function onReprocess() {
    startTransition(async () => {
      await reprocessKnowledgeDocument(doc.id);
    });
  }

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <SourceIcon source={doc.source} />
          <div className="min-w-0">
            <p className="truncate font-medium">{doc.title}</p>
            {doc.sourceUrl && (
              <a
                href={doc.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-xs text-muted-foreground hover:text-primary"
              >
                {doc.sourceUrl}
              </a>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <StatusBadge status={doc.status} />
              <span>·</span>
              <span>{doc.chunksCount} chunk{doc.chunksCount === 1 ? '' : 's'}</span>
              <span>·</span>
              <span>{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            {doc.errorMessage && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {doc.errorMessage}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {doc.status === 'ERROR' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReprocess}
              disabled={pending}
              className="text-muted-foreground hover:text-primary"
              title="Reprocessar"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
            title="Apagar"
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

function SourceIcon({ source }: { source: DocProps['doc']['source'] }) {
  const Icon = source === 'URL' ? Globe : source === 'MANUAL' ? Pencil : Upload;
  return (
    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </div>
  );
}

function StatusBadge({ status }: { status: DocProps['doc']['status'] }) {
  if (status === 'READY')
    return (
      <span className="inline-flex items-center gap-1 text-primary">
        <CheckCircle2 className="h-3 w-3" />
        Pronto
      </span>
    );
  if (status === 'PROCESSING')
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-muted-foreground')}
      >
        <Clock className="h-3 w-3 animate-pulse" />
        Processando
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-destructive">
      <AlertCircle className="h-3 w-3" />
      Erro
    </span>
  );
}

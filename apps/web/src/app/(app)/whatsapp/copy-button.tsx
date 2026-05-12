'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-secondary"
      aria-label={label ?? 'Copiar'}
      title={copied ? 'Copiado!' : 'Copiar'}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@zapai/ui';

/**
 * Imagem de produto com fallback automático pro placeholder Package quando:
 *  - src vazio
 *  - imagem 404 / erro de carregamento (onError handler)
 */
export function ProductImage({
  src,
  alt = '',
  className,
  size = 40,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  size?: number;
}) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md bg-muted',
          className,
        )}
        style={{ width: size, height: size }}
      >
        <Package className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={cn('shrink-0 rounded-md object-cover', className)}
      style={{ width: size, height: size }}
    />
  );
}

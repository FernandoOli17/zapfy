'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Quando o broadcast está RUNNING, refresca a página a cada 5s pra atualizar
 * progress bar + counts. Para quando sai da DOM.
 */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}

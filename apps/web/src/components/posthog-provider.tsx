'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

/**
 * Cliente PostHog inicializado uma vez no boot da árvore React. Sem key,
 * no-op total (não carrega o JS remoto).
 *
 * Captura automaticamente:
 *  - $pageview em mudança de rota
 *  - $autocapture clicks/forms (config padrão)
 *
 * NÃO identifica o user automaticamente — fluxo de signup chama identifyUser
 * no server e o client pega via cookie/session.
 */
let initialized = false;

function init() {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
  if (!key) return;
  posthog.init(key, {
    api_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://app.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // capturamos manualmente abaixo
    capture_pageleave: true,
    autocapture: {
      dom_event_allowlist: ['click', 'submit', 'change'],
      url_allowlist: [], // sem restrição — captura tudo
    },
  });
  initialized = true;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    let url = window.location.origin + pathname;
    if (searchParams && searchParams.toString()) {
      url += `?${searchParams.toString()}`;
    }
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}

import { expect, test } from '@playwright/test';

import { signupNewUser } from './helpers';

/**
 * Dashboard operacional (sub-projeto "Redesign do dashboard"): num workspace
 * recém-criado, `getDashboardStats` retorna dados zerados (conversasHoje 0,
 * fila vazia, WhatsApp não conectado), então o bloco `stats` renderiza com:
 *  - strip de métricas zeradas,
 *  - fila de handoff no empty-state "conecte o WhatsApp" (não conectado),
 *  - faixa de ações rápidas sempre presente.
 *
 * Estado 100% derivado do DB (lib/dashboard-stats.ts) — sem fixture nem IA.
 *
 * Nota de escopo: o link "Forge"/"Inbox" também existe na sidebar (layout.tsx),
 * então as ações rápidas são consultadas dentro da própria seção "Ações
 * rápidas" pra evitar colisão de strict mode do Playwright.
 */
test.describe('dashboard operacional', () => {
  test('mostra ações rápidas e empty-state do pulso (WhatsApp não conectado)', async ({
    page,
  }) => {
    await signupNewUser(page);

    await page.goto('/dashboard');

    // A seção de ações rápidas é identificada pelo heading; consultamos os
    // links DENTRO dela pra não colidir com os links homônimos da sidebar.
    const quickActions = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Ações rápidas' }) })
      .last();

    await expect(quickActions.getByRole('link', { name: 'Forge' })).toBeVisible();
    await expect(quickActions.getByRole('link', { name: 'Inbox' })).toBeVisible();
    await expect(quickActions.getByRole('link', { name: 'Conhecimento' })).toBeVisible();
    await expect(quickActions.getByRole('link', { name: 'Broadcasts' })).toBeVisible();

    // Sem WhatsApp conectado → empty-state da fila aponta pra conexão.
    await expect(page.getByText('Conecte o WhatsApp pra ver o pulso')).toBeVisible();
    await expect(page.getByRole('link', { name: /Conectar WhatsApp/ })).toHaveAttribute(
      'href',
      '/whatsapp',
    );
  });
});

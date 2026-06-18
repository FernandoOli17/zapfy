import { test, expect } from '@playwright/test';

test.describe('Landing (home de marketing)', () => {
  test('lidera pelo moat e não tem depoimento fabricado', async ({ page }) => {
    await page.goto('/');

    // Hero lidera pelo moat
    await expect(page.getByRole('heading', { level: 1 })).toContainText('monta a IA');

    // CTA principal aponta pro signup
    await expect(
      page.getByRole('link', { name: /Montar meu agente/i }).first(),
    ).toHaveAttribute('href', '/signup');

    // Honestidade: depoimentos fabricados não existem mais
    await expect(page.getByText('Ana Lima')).toHaveCount(0);
    await expect(page.getByText('+340%')).toHaveCount(0);
    await expect(page.getByText('Dr. Carlos Mendes')).toHaveCount(0);

    // Prova de produto honesta presente
    await expect(page.getByText('Cloud API oficial da Meta').first()).toBeVisible();
  });
});

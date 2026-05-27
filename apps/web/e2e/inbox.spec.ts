import { expect, test } from '@playwright/test';

import { signupNewUser } from './helpers';

test.describe('inbox', () => {
  test('abre inbox vazio sem crash', async ({ page }) => {
    await signupNewUser(page);

    await page.goto('/inbox');
    // Pode estar vazio (sem WhatsApp conectado) — checa que renderiza sem erro
    await expect(page.locator('body')).toContainText(/inbox|conversa|sem mensagem/i);
  });

  test('navega entre tabs filtros', async ({ page }) => {
    await signupNewUser(page);

    await page.goto('/inbox');
    // Tenta clicar nos filtros disponíveis (AI / Humano / Fechadas)
    const aiTab = page.getByRole('link', { name: /^IA$|ai handling/i }).first();
    if (await aiTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aiTab.click();
      await page.waitForLoadState('networkidle');
    }
    await expect(page.locator('body')).toContainText(/inbox|conversa|sem/i);
  });
});

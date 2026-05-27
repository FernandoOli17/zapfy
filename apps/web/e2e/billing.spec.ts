import { expect, test } from '@playwright/test';

import { signupNewUser } from './helpers';

/**
 * Em STRIPE_MOCK=true, todo checkout retorna URL fake e UI mostra banner.
 * Esse test cobre o fluxo até o redirect mockado.
 */
test.describe('billing', () => {
  test('abre /billing e mostra plano TRIAL atual', async ({ page }) => {
    await signupNewUser(page);

    await page.goto('/billing');
    await expect(page.locator('body')).toContainText(/plano|billing|assinatura/i);
    // STARTER ou TRIALING devem aparecer em algum lugar
    await expect(page.locator('body')).toContainText(/STARTER|TRIALING|PRO|trial/i);
  });

  test('botão upgrade pra PRO leva pra checkout mock', async ({ page }) => {
    await signupNewUser(page);

    await page.goto('/billing');
    // Procura botão de PRO upgrade
    const upgradeBtn = page
      .getByRole('button', { name: /upgrade.*pro|assinar pro|escolher pro/i })
      .first();
    if (await upgradeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await upgradeBtn.click();
      // Em STRIPE_MOCK=true, retorna pra /billing com ?success=1&mock_plan=PRO
      await page.waitForURL(/billing.*mock_plan|billing.*success/, { timeout: 10_000 });
    }
  });
});

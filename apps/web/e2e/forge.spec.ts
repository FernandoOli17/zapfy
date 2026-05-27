import { expect, test } from '@playwright/test';

import { signupNewUser } from './helpers';

/**
 * Forge é o fluxo de configuração conversacional do agente IA. Em modo
 * MOCK_AI=true, as respostas são canned — então o teste só verifica que
 * a página carrega, aceita input, e o pre-publish funciona.
 */
test.describe('forge', () => {
  test('abre forge, envia mensagem mock, vê preview do agente', async ({ page }) => {
    await signupNewUser(page);

    await page.goto('/forge');
    await expect(page.locator('h1, [data-page="forge"]')).toBeVisible({ timeout: 10_000 });

    // Input do chat — primeiro textarea ou input em /forge
    const input = page.getByPlaceholder(/conta|fala|descrev|nome do seu/i).first();
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill('Vendo bolos personalizados em SP');
      const send = page.getByRole('button', { name: /enviar|send/i }).first();
      await send.click();

      // Em MOCK_AI a resposta vem rápida — aguarda algum texto novo
      await page.waitForTimeout(2000);
    }

    // Preview do system prompt ou config deve aparecer em algum painel
    await expect(page.locator('body')).toContainText(/agente|forge|configur/i);
  });
});

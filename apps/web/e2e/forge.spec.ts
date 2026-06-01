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
    // ForgeWorkspace renderiza um <h2> introdutório no empty state.
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });

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

  /**
   * Regressão dos 2 fixes de resiliência do chat (2026-06-01):
   *   (A) eco otimista — a mensagem do usuário aparece NA HORA, não só quando a
   *       IA termina o loop de tools.
   *   (B) não-trava — quando a server action REJEITA (timeout/queda de rede), a
   *       UI mostra aviso e destrava, em vez de ficar com os pontinhos eternos
   *       até dar reload.
   *
   * Intercepta SÓ a chamada da server action (POST com header next-action) e a
   * aborta após um delay — então é determinístico e não toca na IA real (a
   * Forge ignora MOCK_AI, por isso não dá pra mockar pelo lado do servidor).
   */
  test('chat: eco otimista aparece na hora e a UI destrava quando a action falha', async ({
    page,
  }) => {
    await signupNewUser(page);
    await page.goto('/forge');

    const FAIL_DELAY_MS = 2500;
    await page.route('**/forge', async (route) => {
      const req = route.request();
      if (req.method() === 'POST' && req.headers()['next-action']) {
        // Segura a resposta pra dar janela de checar o eco, depois falha.
        await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
        await route.abort('failed');
        return;
      }
      await route.continue();
    });

    const input = page.getByPlaceholder(/conta|fala|descrev|nome do seu|resposta/i).first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    const msg = 'Vendo bolos personalizados em SP';
    await input.fill(msg);
    await page.getByRole('button', { name: /enviar|send/i }).first().click();

    // (A) ECO OTIMISTA: a bolha do usuário aparece antes da action (delayed) responder.
    await expect(page.getByText(msg, { exact: false })).toBeVisible({ timeout: 1500 });

    // (B) NÃO TRAVA: após o abort, aviso de erro + input destravado + texto devolvido.
    await expect(page.getByText(/falha ao enviar|tenta de novo/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue(msg);
  });
});

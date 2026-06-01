import { expect, test, type Page } from '@playwright/test';

import { signupNewUser } from './helpers';

/**
 * Forge guiada (2026-06-01): numa sessão nova, /forge abre um WIZARD de 4 passos
 * (nome → tipo → estilo humano/bot → objetivo) que, ao concluir, cai no chat
 * conversacional. O wizard NÃO chama IA (`saveForgeBasics` é determinística),
 * então estes testes não tocam na IA real — são 100% determinísticos.
 */
async function completeWizard(page: Page): Promise<void> {
  // Passo 1: nome (placeholder "Ex: Bella Pizza")
  await page.getByPlaceholder(/Bella Pizza|nome/i).first().fill('Bella Pizza');
  await page.getByRole('button', { name: /próximo/i }).click();
  // Passo 2: tipo (auto-avança ao clicar)
  await page.getByRole('button', { name: /restaurante/i }).click();
  // Passo 3: estilo (auto-avança ao clicar)
  await page.getByRole('button', { name: /como uma pessoa real/i }).click();
  // Passo 4: objetivos + concluir
  await page.getByRole('button', { name: /mostrar o cardápio/i }).click();
  await page.getByRole('button', { name: /concluir e montar/i }).click();
  // Caiu no chat: a mensagem de abertura semeada menciona o nome do negócio.
  await expect(page.getByText(/Bella Pizza/).first()).toBeVisible({ timeout: 15_000 });
}

test.describe('forge', () => {
  test('forge guiada: wizard de 4 passos cai no chat com mensagem semeada', async ({ page }) => {
    await signupNewUser(page);
    await page.goto('/forge');
    await completeWizard(page);

    // A abertura semeada pede o conhecimento/cardápio — confirma que entrou no chat.
    await expect(
      page.getByText(/me manda o que ela precisa saber|cardápio/i).first(),
    ).toBeVisible();
  });

  /**
   * Regressão dos 2 fixes de resiliência do chat (2026-06-01):
   *   (A) eco otimista — a mensagem do usuário aparece NA HORA, não só quando a
   *       IA termina o loop de tools.
   *   (B) não-trava — quando a server action REJEITA (timeout/queda de rede), a
   *       UI mostra aviso e destrava, em vez de ficar com os pontinhos eternos.
   *
   * O wizard gateia o chat numa sessão nova, então completa ele primeiro; só
   * DEPOIS intercepta a action (o envio do chat) e a aborta — assim o save do
   * wizard não é afetado e o teste segue determinístico (não toca na IA real).
   */
  test('chat: eco otimista aparece na hora e a UI destrava quando a action falha', async ({
    page,
  }) => {
    await signupNewUser(page);
    await page.goto('/forge');
    await completeWizard(page);

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

    const input = page.getByPlaceholder(/resposta|conta|fala|descrev/i).first();
    await expect(input).toBeVisible({ timeout: 10_000 });

    const msg = 'Temos FAQ no site';
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

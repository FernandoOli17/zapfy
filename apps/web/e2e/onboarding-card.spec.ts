import { expect, test } from '@playwright/test';

import { signupNewUser } from './helpers';

/**
 * Card de onboarding (sub-projeto "UX do cliente"): num workspace recém-criado,
 * nenhum dos 5 passos "valor antes de pagar" está feito, então o /dashboard
 * mostra o card no passo 1 (Forge) e o CTA aponta pra /forge.
 *
 * Estado 100% derivado do DB (ver lib/onboarding.ts) — sem fixture nem IA. O
 * minimizar é estado de UI local (localStorage), validado aqui por reload.
 *
 * Nota (desvio do esqueleto do plano): o segundo cenário previsto — "após
 * publicar agente, o CTA aponta pra /agent" — exigiria publicar uma AgentVersion
 * (agent.currentVersionId != null). O wizard da Forge (forge.spec.ts) só semeia
 * o chat; publicar depende do loop de tool calls da IA, que é mockada em E2E
 * (MOCK_AI) e não dispara `publish_agent_version` de forma determinística. Logo,
 * o avanço de passo é coberto pela derivação pura (Task 1), não por E2E.
 */
test.describe('onboarding card', () => {
  test('mostra o próximo passo (Forge) e minimizar persiste após reload', async ({ page }) => {
    await signupNewUser(page);

    await page.goto('/dashboard');

    // Passo 1: card visível, CTA aponta pro Forge.
    await expect(page.getByText('Coloque sua IA pra atender')).toBeVisible();
    await expect(page.getByRole('link', { name: /Continuar/ })).toHaveAttribute(
      'href',
      '/forge',
    );

    // Minimizar persiste após reload (localStorage).
    await page.getByRole('button', { name: 'Minimizar checklist' }).click();
    await page.reload();
    await expect(page.getByText(/Continuar configuração \(0\/5\)/)).toBeVisible();
  });
});

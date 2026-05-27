import { expect, test } from '@playwright/test';

import { signupNewUser, uniqueEmail } from './helpers';

test.describe('signup', () => {
  test('cria conta e chega no app autenticado', async ({ page }) => {
    const { email } = await signupNewUser(page);

    // Sidebar/header deve mostrar o user de alguma forma
    const body = page.locator('body');
    await expect(body).toContainText(/Trato/i);
    expect(email).toMatch(/@/);
  });

  test('bloqueia signup com email duplicado', async ({ page }) => {
    const email = uniqueEmail();
    const password = 'Test1234!_secure';

    await page.goto('/signup');
    await page.getByLabel(/nome/i).fill('Primeiro');
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel(/senha/i).first().fill(password);
    await page.getByRole('button', { name: /criar conta/i }).click();
    await page.waitForURL(/(onboarding|dashboard|forge)/);

    // Logout (limpa cookie via /api/auth/sign-out) e tenta de novo
    await page.context().clearCookies();

    await page.goto('/signup');
    await page.getByLabel(/nome/i).fill('Segundo');
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel(/senha/i).first().fill(password);
    await page.getByRole('button', { name: /criar conta/i }).click();

    // Esperamos ver erro — texto pode variar
    await expect(page.locator('body')).toContainText(/já|existe|duplicad|exists/i, {
      timeout: 8000,
    });
  });

  test('valida senha curta', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel(/nome/i).fill('Curta');
    await page.getByLabel(/e-?mail/i).fill(uniqueEmail());
    await page.getByLabel(/senha/i).first().fill('123');
    await page.getByRole('button', { name: /criar conta/i }).click();
    await expect(page.locator('body')).toContainText(/senha|password|8|caracter/i);
  });
});

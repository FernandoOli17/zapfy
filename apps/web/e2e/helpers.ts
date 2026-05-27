import type { Page } from '@playwright/test';

/**
 * Utilidades reusadas em testes E2E. Mantém testes focados no fluxo.
 */

let counter = 0;

export function uniqueEmail(): string {
  counter += 1;
  return `e2e-${Date.now()}-${counter}@trato-test.dev`;
}

/**
 * Faz signup completo e retorna { email, password } pra reuso. Espera
 * landing → /signup → onboarding flow.
 */
export async function signupNewUser(page: Page): Promise<{ email: string; password: string }> {
  const email = uniqueEmail();
  const password = 'Test1234!_secure';

  await page.goto('/signup');
  await page.getByLabel(/nome|name/i).fill('Teste E2E');
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/senha|password/i).first().fill(password);
  await page.getByRole('button', { name: /criar conta|sign up/i }).click();

  // Após signup, redireciona pra onboarding ou dashboard
  await page.waitForURL(/(onboarding|dashboard|forge)/, { timeout: 15_000 });

  return { email, password };
}

export async function loginExisting(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/senha|password/i).fill(password);
  await page.getByRole('button', { name: /entrar|login|sign in/i }).click();
  await page.waitForURL(/(dashboard|forge|onboarding|inbox)/, { timeout: 15_000 });
}

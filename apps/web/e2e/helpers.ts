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

  // Após signup, redireciona pra onboarding ou dashboard.
  // Primeira request pode demorar — turbopack compila a route /api/auth/[...all]
  // em ~25s no cold start; depois é instantâneo. 60s cobre os dois cenários.
  await page.waitForURL(/(onboarding|dashboard|forge)/, { timeout: 60_000 });

  // Se caiu em /onboarding, completa a criação de workspace pra deixar o user
  // navegável em todas as rotas (/billing, /inbox etc. exigem workspace).
  // Nome único por test pra não colidir em slug.
  if (page.url().includes('/onboarding')) {
    const wsName = `E2E ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await page.getByLabel(/nome da empresa/i).fill(wsName);
    await page.getByRole('button', { name: /criar workspace/i }).click();
    await page.waitForURL(/(dashboard|forge)/, { timeout: 30_000 });
  }

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
  await page.waitForURL(/(dashboard|forge|onboarding|inbox)/, { timeout: 60_000 });
}

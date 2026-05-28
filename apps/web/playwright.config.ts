import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config pra E2E. Roda contra `next dev` na porta 3000 (default).
 *
 * Pré-requisitos pra dev local:
 *  - .env com DATABASE_URL configurado (DB de teste recomendado, NÃO prod)
 *  - MOCK_AI=true e STRIPE_MOCK=true pra evitar APIs externas
 *
 * Em CI: `pnpm playwright install --with-deps` antes do test.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // shared DB — não paraleliza pra evitar interferência
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: process.env['CI'] ? 'github' : 'list',
  // 90s cobre o cold-start do turbopack na primeira request por rota (~25-30s)
  // + signup/login pipeline (~3s warm). Sem isso, primeiro test sempre falha.
  timeout: 90_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: process.env['E2E_NO_SERVER']
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        timeout: 120_000,
        reuseExistingServer: !process.env['CI'],
        env: {
          MOCK_AI: 'true',
          STRIPE_MOCK: 'true',
        },
      },
});

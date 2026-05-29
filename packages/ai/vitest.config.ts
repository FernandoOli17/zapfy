import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // DATABASE_URL dummy só pra satisfazer o guard de import do @zapfy/db
    // (vertical tools o importam no load). Nenhum teste toca o banco de verdade.
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    },
  },
});

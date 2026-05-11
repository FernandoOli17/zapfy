import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

/**
 * Cliente Prisma singleton com Neon HTTP/WebSocket adapter.
 *
 * - Queries runtime usam HTTPS (porta 443) via @neondatabase/serverless,
 *   escapa de firewall de rede que bloqueia porta 5432 (Cisco Umbrella etc.)
 * - prisma migrate / db push continuam usando TCP 5432 direto (precisa de
 *   rede sem filtro pra criar schema)
 *
 * Em Node (ambiente serverful como Next.js dev/worker), neon-serverless
 * precisa do polyfill de WebSocket. No edge runtime, ws nao eh necessario.
 */
if (typeof globalThis.WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL não configurada');
}

const adapter = new PrismaNeon({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
export type { Prisma } from '@prisma/client';

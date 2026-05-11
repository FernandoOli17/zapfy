import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma singleton (evita N conexões em dev com HMR).
 * Em produção (Vercel serverless / Railway worker), cada invocação cria sua instância.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
export type { Prisma } from '@prisma/client';

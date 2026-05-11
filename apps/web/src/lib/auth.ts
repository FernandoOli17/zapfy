import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink } from 'better-auth/plugins';
import { prisma } from '@zapai/db';

import { env } from '@/env';

const socialProviders =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  ...(socialProviders ? { socialProviders } : {}),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // TODO Fase 2: enviar via Resend. Em dev, log no console.
        if (env.NODE_ENV !== 'production') {
          console.info(`🔗 Magic link pra ${email}: ${url}`);
          return;
        }
        // Em prod sem RESEND, falhar explicitamente.
        throw new Error('RESEND_API_KEY não configurada — magic link indisponível');
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24, // refresh a cada 1 dia
  },
});

export type Auth = typeof auth;

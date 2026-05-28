import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink } from 'better-auth/plugins';
import { prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';

import { env } from '@/env';
import { isEmailConfigured, sendEmail } from '@/lib/email/client';
import { magicLinkEmail, passwordResetEmail } from '@/lib/email/templates';

const log = createLogger('auth');

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
    sendResetPassword: async ({ user, url }) => {
      if (!isEmailConfigured()) {
        log.info({ email: user.email, url }, '🔑 Reset password (dev) — sem RESEND_API_KEY');
        if (env.NODE_ENV === 'production') {
          throw new Error('RESEND_API_KEY não configurada em produção');
        }
        return;
      }
      const tmpl = passwordResetEmail({ url, email: user.email });
      const result = await sendEmail({
        to: user.email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
      if (!result.ok) {
        throw new Error(result.error ?? 'Falha ao enviar reset link');
      }
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1h em segundos
  },
  ...(socialProviders ? { socialProviders } : {}),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (!isEmailConfigured()) {
          // Em dev, log no console pro user clicar.
          log.info({ email, url }, '🔗 Magic link (dev) — sem RESEND_API_KEY');
          if (env.NODE_ENV === 'production') {
            throw new Error('RESEND_API_KEY não configurada em produção');
          }
          return;
        }
        const tmpl = magicLinkEmail({ url, email });
        const result = await sendEmail({
          to: email,
          subject: tmpl.subject,
          html: tmpl.html,
          text: tmpl.text,
        });
        if (!result.ok) {
          throw new Error(result.error ?? 'Falha ao enviar magic link');
        }
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24, // refresh a cada 1 dia
  },
});

export type Auth = typeof auth;

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),

    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    ANTHROPIC_API_KEY: z.string().optional(),
    /** OpenAI: usado pra Whisper (transcrição de áudio do Forge). Opcional. */
    OPENAI_API_KEY: z.string().optional(),
    /** Modelo Whisper (default whisper-1). gpt-4o-transcribe quando GA. */
    WHISPER_MODEL: z.string().optional(),
    VOYAGE_API_KEY: z.string().optional(),

    META_APP_ID: z.string().optional(),
    META_APP_SECRET: z.string().optional(),
    META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_STARTER: z.string().optional(),
    STRIPE_PRICE_PRO: z.string().optional(),
    STRIPE_PRICE_PREMIUM: z.string().optional(),

    UPLOADTHING_TOKEN: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),

    PUSHER_APP_ID: z.string().optional(),
    PUSHER_KEY: z.string().optional(),
    PUSHER_SECRET: z.string().optional(),
    PUSHER_CLUSTER: z.string().optional(),

    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    ENCRYPTION_KEY: z.string().length(64, 'Use 64 chars hex (32 bytes)'),
    LOG_PII_SALT: z.string().min(16),

    SENTRY_DSN: z.string().url().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),

    /**
     * Token opcional pra liberar o modo detalhado de `/api/health`. Sem ele,
     * o endpoint só responde `{status, timestamp}`. Útil pra ops sem expor
     * presença de integrações publicamente.
     * Min 24 chars pra ter entropia razoável.
     */
    HEALTH_DETAIL_TOKEN: z.string().min(24).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
    NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
    NEXT_PUBLIC_PUSHER_KEY: process.env['NEXT_PUBLIC_PUSHER_KEY'],
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env['NEXT_PUBLIC_PUSHER_CLUSTER'],
    NEXT_PUBLIC_POSTHOG_KEY: process.env['NEXT_PUBLIC_POSTHOG_KEY'],
    NEXT_PUBLIC_POSTHOG_HOST: process.env['NEXT_PUBLIC_POSTHOG_HOST'],
  },
  skipValidation: process.env['SKIP_ENV_VALIDATION'] === 'true',
  emptyStringAsUndefined: true,
});

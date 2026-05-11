import pino from 'pino';

/**
 * Logger Pino estruturado. Sem PII em texto plano — use hashPii() pra telefone/email.
 * Em dev, formato bonitinho via pino-pretty (se instalado); em prod, JSON puro.
 */
export const createLogger = (name: string, level = process.env['LOG_LEVEL'] ?? 'info') =>
  pino({
    name,
    level,
    base: {
      env: process.env['NODE_ENV'] ?? 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'accessToken',
        'appSecret',
        'password',
        '*.password',
        '*.accessToken',
        '*.appSecret',
      ],
      remove: true,
    },
  });

export type Logger = ReturnType<typeof createLogger>;

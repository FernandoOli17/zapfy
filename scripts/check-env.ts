/**
 * Checa presença de credenciais SEM imprimir valores (só booleano) + flags.
 * Rodar: pnpm tsx scripts/check-env.ts
 */
import 'dotenv/config';

const has = (k: string) => (process.env[k] && process.env[k]!.trim().length > 0 ? '✅ set' : '❌ ausente');

console.info('ANTHROPIC_API_KEY :', has('ANTHROPIC_API_KEY'));
console.info('VOYAGE_API_KEY    :', has('VOYAGE_API_KEY'));
console.info('OPENAI_API_KEY    :', has('OPENAI_API_KEY'));
console.info('MOCK_AI           :', process.env['MOCK_AI'] ?? '(não definido)');
console.info('AI_PROVIDER       :', process.env['AI_PROVIDER'] ?? '(auto)');
console.info('AI_ROUTING        :', process.env['AI_ROUTING'] ?? '(off)');
console.info('DATABASE_URL      :', has('DATABASE_URL'));

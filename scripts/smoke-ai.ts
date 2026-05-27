/**
 * Smoke test mínimo da chave Anthropic.
 *
 * 1 chamada do classifier (Haiku 4.5) — ~150 in + ~50 out tokens.
 * Custo estimado: < $0.0005 (R$ 0,002).
 *
 * Rodar:
 *   pnpm tsx scripts/smoke-ai.ts
 */
import 'dotenv/config';
import { classifyMessage } from '../packages/ai/src/agent/classifier';

async function main() {
  if (!process.env['ANTHROPIC_API_KEY'] && !process.env['OPENAI_API_KEY']) {
    console.error('❌ Sem ANTHROPIC_API_KEY no .env. Aborta antes de gastar.');
    process.exit(1);
  }
  if (process.env['MOCK_AI'] === 'true') {
    console.warn('⚠️  MOCK_AI=true detectado — desliga pra teste real.');
    process.exit(1);
  }

  const start = Date.now();
  const result = await classifyMessage(
    'Oi, qual o horário de funcionamento da loja no sábado?',
  );
  const ms = Date.now() - start;

  console.log('✅ Classifier respondeu em', ms, 'ms');
  console.log('   intent:', result.intent);
  console.log('   sentiment:', result.sentiment);
  console.log('   needs_handoff:', result.needs_handoff);
  console.log('   language:', result.language);
  console.log('   topics:', result.topics);

  if (result.intent === 'other' && result.topics.length === 0) {
    console.warn('⚠️  Pode ter caído no fallback (erro silencioso). Verifica logs acima.');
  }
}

main().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});

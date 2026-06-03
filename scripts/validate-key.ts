/**
 * Valida a chave de IA de VERDADE (sem fallback que engole erro). Mostra o erro
 * cru (ex.: 401 Invalid authentication credentials) ou confirma com tokens reais.
 *
 * Rodar: pnpm tsx scripts/validate-key.ts
 */
import 'dotenv/config';
import { pingModel } from '../packages/ai/src/index';

async function main() {
  if (process.env['MOCK_AI'] === 'true') {
    console.error('⚠️ MOCK_AI=true — desligue pra validar a chave real.');
    process.exit(1);
  }
  try {
    const r = await pingModel('fast');
    console.info(`✅ chave VÁLIDA · provider=${r.provider} · tokens in/out=${r.tokensIn}/${r.tokensOut}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ chave INVÁLIDA / erro real da API:');
    console.error('   ', msg);
    process.exit(2);
  }
}

main();

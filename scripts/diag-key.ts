/**
 * Diagnóstico de precedência: o ambiente do SO tem ANTHROPIC_API_KEY setada?
 * Se sim, o dotenv NÃO sobrescreve e o .env é ignorado (causa de "troquei o
 * .env mas continua a chave velha"). Mostra só COMPRIMENTOS, nunca o valor.
 */
import { readFileSync } from 'node:fs';
import { parse, config } from 'dotenv';

const osLen = (process.env['ANTHROPIC_API_KEY'] ?? '').trim().length; // ANTES do dotenv
const fileLen = (parse(readFileSync('.env'))['ANTHROPIC_API_KEY'] ?? '').trim().length;

config(); // padrão: NÃO sobrescreve env existente
const effNoOverride = (process.env['ANTHROPIC_API_KEY'] ?? '').trim().length;

config({ override: true }); // força .env vencer
const effOverride = (process.env['ANTHROPIC_API_KEY'] ?? '').trim().length;

console.info('comprimentos (nunca o valor):');
console.info('  no ambiente do SO (antes do dotenv):', osLen, osLen > 0 ? '⚠️ TEM var no ambiente!' : '(vazio)');
console.info('  no arquivo .env                     :', fileLen);
console.info('  efetivo (dotenv padrão)             :', effNoOverride);
console.info('  efetivo (dotenv override:true)      :', effOverride);
console.info('');
if (osLen > 0 && osLen !== fileLen) {
  console.info('🔴 CULPADO: variável do SO está vencendo o .env. O app usa a do SO (velha).');
  console.info('   Fix: remover ANTHROPIC_API_KEY do ambiente do Windows OU usar override.');
} else if (osLen > 0 && osLen === fileLen) {
  console.info('🟡 Há var no SO com mesmo tamanho do .env — pode ser a velha disfarçada.');
} else {
  console.info('🟢 Sem var no SO. O .env é a fonte. Se ainda dá 401, a chave do .env está errada/revogada.');
}

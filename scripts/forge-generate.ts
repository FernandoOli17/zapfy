/**
 * Valida a GERAÇÃO do Forge com token real (#3): roda o meta-prompt (mesma
 * função que a engine usa) sobre uma config de exemplo e confirma que o system
 * prompt sai REAL (não canned/mock). 1 chamada Sonnet.
 *
 * Rodar (com .env: ANTHROPIC_API_KEY + MOCK_AI=false):
 *   pnpm tsx scripts/forge-generate.ts
 */
import 'dotenv/config';
import { generateSystemPrompt } from '../packages/ai/src/index';
import type { ForgeAnswers } from '../packages/ai/src/forge/types';

const answers = {
  agentName: 'Bia',
  business: {
    name: 'Pizzaria Forno de Lenha',
    description: 'Pizzaria delivery em Pinheiros, São Paulo. Massa artesanal.',
    city: 'São Paulo',
  },
  vertical: 'RESTAURANT',
  goals: ['Tirar pedido pelo WhatsApp', 'Informar cardápio e tempo de entrega'],
  tone: {
    description: 'Animada, simpática, gírias leves de SP, emoji com moderação',
    examples: ['Salve! Bora montar sua pizza? 🍕'],
  },
  knowledge: [
    { title: 'Cardápio', kind: 'manual', excerpt: 'Margherita, Calabresa, Portuguesa...' },
  ],
  tools: ['get_menu', 'submit_order', 'check_delivery_eta'],
  handoff: { rules: 'Reclamação de pedido errado vai pra humano' },
} as unknown as ForgeAnswers;

async function main() {
  if (!process.env['ANTHROPIC_API_KEY'] && !process.env['OPENAI_API_KEY']) {
    console.error('❌ Sem chave de IA. Aborta.');
    process.exit(1);
  }
  if (process.env['MOCK_AI'] === 'true') {
    console.error('⚠️ MOCK_AI=true — precisa de IA real. Aborta.');
    process.exit(1);
  }

  console.info('▶ gerando system prompt via Forge (meta-prompt, Sonnet)...\n');
  const sp = await generateSystemPrompt(answers);

  const mentionsBusiness = sp.toLowerCase().includes('forno de lenha') || sp.toLowerCase().includes('bia');
  const looksReal = sp.length > 300 && !sp.includes('[mock]') && mentionsBusiness;

  console.info(`length: ${sp.length} chars · menciona o negócio: ${mentionsBusiness ? 'sim' : 'não'}`);
  console.info(looksReal ? '🟢 system prompt REAL gerado (não canned)\n' : '⚠️ suspeito de canned/genérico\n');
  console.info('─── primeiros 600 chars ───');
  console.info(sp.slice(0, 600));
  if (!looksReal) process.exit(2);
}

main().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});

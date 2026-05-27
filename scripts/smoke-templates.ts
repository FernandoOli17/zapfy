/**
 * Smoke test dos templates do Forge.
 *  - confirma que cada template é encontrável por id e por vertical
 *  - mergeTemplate preserva business + sobrescreve goals/tone/tools/handoff vazios
 *  - renderTemplatePrompt substitui placeholders
 *
 * pnpm tsx scripts/smoke-templates.ts
 */
import {
  TEMPLATES,
  getTemplateById,
  getTemplatesForVertical,
  mergeTemplate,
  renderTemplatePrompt,
} from '../packages/ai/src/playbooks/templates';
import type { ForgeAnswers } from '../packages/ai/src/forge/types';

let pass = 0;
let fail = 0;

function expect(cond: boolean, msg: string) {
  if (cond) {
    pass += 1;
    console.log(`✅ ${msg}`);
  } else {
    fail += 1;
    console.error(`❌ ${msg}`);
  }
}

// 1. Todos os templates têm campos obrigatórios
for (const t of TEMPLATES) {
  expect(t.id.length > 0, `${t.name}: id válido`);
  expect(t.vertical !== undefined, `${t.name}: vertical definido`);
  expect(t.defaultAnswers.goals !== undefined && t.defaultAnswers.goals.length > 0, `${t.name}: goals preenchidos`);
  expect(t.defaultAnswers.tools !== undefined && t.defaultAnswers.tools.length > 0, `${t.name}: tools preenchidos`);
  expect(t.defaultAnswers.handoff !== undefined, `${t.name}: handoff preenchido`);
  expect(t.systemPromptTemplate.includes('{{brandName}}'), `${t.name}: prompt usa {{brandName}}`);
}

// 2. Lookup por id e por vertical
expect(getTemplateById('restaurant-delivery') !== undefined, 'getTemplateById encontra restaurant-delivery');
expect(getTemplateById('nao-existe') === undefined, 'getTemplateById retorna undefined pra id inválido');
expect(getTemplatesForVertical('RESTAURANT').length >= 1, 'getTemplatesForVertical RESTAURANT >= 1');
expect(getTemplatesForVertical('OTHER').length >= 1, 'getTemplatesForVertical OTHER >= 1');

// 3. Merge preserva business + sobrescreve quando vazio
const existing: ForgeAnswers = {
  business: { description: 'Loja de pizza no Tatuapé', brandName: 'Pizzaria do João' },
  goals: [],
  knowledge: [],
  tools: [],
};
const restaurant = getTemplateById('restaurant-delivery')!;
const merged = mergeTemplate(existing, restaurant);
expect(merged.business?.brandName === 'Pizzaria do João', 'merge preserva brandName');
expect(merged.business?.description === 'Loja de pizza no Tatuapé', 'merge preserva description');
expect(merged.vertical === 'RESTAURANT', 'merge sobrescreve vertical');
expect(merged.goals.length >= 3, 'merge preenche goals');
expect(merged.tools.length >= 4, 'merge preenche tools');
expect(merged.handoff !== undefined, 'merge preenche handoff');

// 4. Render substitui placeholders
const rendered = renderTemplatePrompt(restaurant, merged);
expect(rendered.includes('Pizzaria do João'), 'render insere brandName');
expect(rendered.includes('Loja de pizza no Tatuapé'), 'render insere descrição');
expect(!rendered.includes('{{brandName}}'), 'render não deixou placeholder');
expect(!rendered.includes('{{businessDescriptionClause}}'), 'render trocou descriptionClause');

// 5. Render sem brandName usa fallback
const empty: ForgeAnswers = {
  business: {},
  goals: [],
  knowledge: [],
  tools: [],
};
const renderedEmpty = renderTemplatePrompt(restaurant, empty);
expect(renderedEmpty.includes('sua empresa'), 'render usa fallback "sua empresa" quando sem brandName');

console.log(`\n${pass}/${pass + fail} passaram`);
if (fail > 0) process.exit(1);

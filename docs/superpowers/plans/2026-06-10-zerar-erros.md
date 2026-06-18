# Zerar Erros — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para
> implementar este plano tarefa a tarefa. Passos usam checkboxes (`- [ ]`).
> **Atenção:** as Tarefas 3 e 4 despacham subagentes (tool Agent) — precisam rodar na
> sessão principal, não dentro de um subagente.

**Goal:** Gate 100% verde (typecheck/lint/test/build) + fluxos críticos auditados por
5 agentes paralelos, bugs claros corrigidos com regressão, zona vermelha triada em
TASKs no vault, relatório final.

**Architecture:** Processo em 5 etapas da spec
`docs/superpowers/specs/2026-06-10-zerar-erros-design.md`: gate baseline → sinais →
auditoria paralela (5 domínios) → verificação adversarial + correção/triagem → gate
final + relatório. Artefatos da auditoria vivem em
`docs/superpowers/audits/2026-06-10-zerar-erros/`.

**Tech Stack:** Turbo/pnpm (gate), ripgrep (sinais), tool Agent (auditoria e
verificação), Vitest/Playwright (regressão), vault Obsidian (triagem).

**Regras transversais (valem em toda tarefa):**
- Trabalhar do root `C:\Users\ferna\zapai`. Commits locais, **sem push**.
- Convenções de fix: CLAUDE.md (AppError, Zod em boundary, sem `catch` swallow,
  scopedDb, regras WhatsApp invioláveis).
- Zona vermelha (NUNCA corrigir direto; sempre triar): caminhos de dinheiro em
  billing/Stripe, schema Prisma/migrações, comportamento de webhooks de produção
  (Meta/Stripe), preços/planos.
- Achados de UX/design não são corrigidos: vão pra seção "Anotações p/ sub-projetos
  2–4" do relatório.

---

### Task 1: Gate baseline

**Files:**
- Create: `docs/superpowers/audits/2026-06-10-zerar-erros/relatorio.md` (esqueleto)

- [ ] **Step 1: Rodar o gate completo**

```bash
cd /c/Users/ferna/zapai
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: 4 comandos verdes (typecheck/lint/test em 7 pacotes; build nos que têm
script de build). Anotar contagens e tempo.

- [ ] **Step 2: Se o build falhar por validação de env** (t3-oss exige vars de prod)

Verificar em `apps/web/src/env.ts` / `apps/worker/src/env.ts` se existe flag de skip
(`SKIP_ENV_VALIDATION`). Se existir: `SKIP_ENV_VALIDATION=1 pnpm build` e registrar no
relatório. **Não** criar/forjar secrets. Se não existir flag, registrar como achado
de infra no relatório e seguir sem o build (typecheck cobre parcial).

- [ ] **Step 3: Corrigir falhas do gate (se houver)**

Para cada falha: fix mínimo seguindo CLAUDE.md → re-rodar só o comando que falhou →
commit isolado:

```bash
git add <arquivos do fix>
git commit -m "fix(<pacote>): <descrição curta da falha de gate>"
```

- [ ] **Step 4: Criar esqueleto do relatório**

Criar `docs/superpowers/audits/2026-06-10-zerar-erros/relatorio.md`:

```markdown
# Relatório — Zerar Erros (2026-06-10)

## Gate baseline
- typecheck: <resultado> | lint: <resultado> | test: <resultado> | build: <resultado>
- Falhas corrigidas no baseline: <lista com commits, ou "nenhuma">

## Corrigidos
<preenchido na Task 5>

## Triados (aguardando OK)
<preenchido na Task 6>

## Descartados (falso positivo)
<preenchido na Task 4>

## Anotações p/ sub-projetos 2–4 (UX/design — não corrigido aqui)
<preenchido conforme aparecer>

## Gate final
<preenchido na Task 7>
```

- [ ] **Step 5: Commit do esqueleto**

```bash
git add docs/superpowers/audits/
git commit -m "docs(audit): esqueleto do relatorio zerar-erros + gate baseline"
```

---

### Task 2: Coleta de sinais

**Files:**
- Create: `docs/superpowers/audits/2026-06-10-zerar-erros/sinais.md`
- Read: `vault/Errors/*.md`, `vault/Blockers/*.md`, `vault/Tasks/TASK-0007*.md`,
  `vault/Tasks/TASK-0009*.md`, `ERRORS_LOG.md`, `BLOCKED.md`, `PLAN.md` (seção débitos)

- [ ] **Step 1: Ler fontes registradas**

Ler os arquivos acima e extrair: bugs ainda abertos, débitos confessos, padrões de
erro já vistos (ex.: ERR-0001 e-mail engolido → procurar o mesmo padrão em outros
pontos de envio).

- [ ] **Step 2: Greps de código suspeito**

```bash
cd /c/Users/ferna/zapai
rg -n "catch\s*(\([^)]*\))?\s*\{\s*(\/\/[^\n]*)?\s*\}" apps packages --type ts
rg -n "@ts-(ignore|expect-error)" apps packages --type ts
rg -n "TODO|FIXME|HACK|XXX" apps packages --type ts
rg -n ":\s*any\b|as any\b" apps packages --type ts
rg -n "console\.(log|warn|error)" apps/web/src apps/worker/src packages --type ts
rg -n "log\.warn" apps packages --type ts   # padrão do ERR-0001: falha rebaixada a warn
```

- [ ] **Step 3: Escrever `sinais.md`**

Agrupar resultados por domínio (auth / forge / whatsapp-worker / billing / web-geral),
formato:

```markdown
# Sinais — Zerar Erros (2026-06-10)

## Auth/Onboarding
- `<arquivo:linha>` — <o que o sinal indica>

## Forge
...

## WhatsApp/Worker
...

## Billing/Stripe
...

## App web geral
...

## Fontes registradas (vault/logs)
- TASK-0007 (testes de billing ausentes): <status do que existe hoje>
- TASK-0009 / ERR-0001 (falha de e-mail engolida): <pontos com mesmo padrão>
- <demais achados de leitura>
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-06-10-zerar-erros/sinais.md
git commit -m "docs(audit): sinais coletados pra auditoria zerar-erros"
```

---

### Task 3: Auditoria paralela (5 agentes)

**Files:**
- Create: `docs/superpowers/audits/2026-06-10-zerar-erros/achados-auth.md`
- Create: `docs/superpowers/audits/2026-06-10-zerar-erros/achados-forge.md`
- Create: `docs/superpowers/audits/2026-06-10-zerar-erros/achados-whatsapp.md`
- Create: `docs/superpowers/audits/2026-06-10-zerar-erros/achados-billing.md`
- Create: `docs/superpowers/audits/2026-06-10-zerar-erros/achados-web.md`

**Deve rodar na sessão principal (usa tool Agent).** Despachar os 5 agentes **numa
única mensagem** (paralelo), `subagent_type: general-purpose`.

- [ ] **Step 1: Montar o prompt base** (comum aos 5, preencher `<DOMÍNIO>`, `<ESCOPO>`
e `<SINAIS>`):

```text
Você é um auditor de bugs READ-ONLY no monorepo C:\Users\ferna\zapai (SaaS multi-tenant
de agente IA pra WhatsApp). NÃO edite nenhum arquivo — apenas leia e reporte.

Primeiro leia C:\Users\ferna\zapai\CLAUDE.md inteiro — as convenções dele são lei
(AppError, Zod em toda boundary, proibido catch swallow, scopedDb em toda query de
workspace, webhook Meta responde 200 em <1s, janela de 24h, split de msg >1024 chars,
tokens Meta cifrados AES-256-GCM, logs sem PII).

Seu domínio: <DOMÍNIO>
Escopo (leia estes caminhos a fundo, siga imports quando relevante): <ESCOPO>
Sinais já coletados pro seu domínio (investigue cada um): <SINAIS>

Procure BUGS REAIS, não estilo: erros engolidos ou rebaixados (log.warn em falha),
edge cases quebrados (null/undefined/lista vazia/timezone), validação faltando em
boundary, race conditions, estados inconsistentes (enum/status), queries sem
workspaceId (vazamento multi-tenant), promessas não aguardadas, retries que duplicam
efeito, links/rotas mortos.

NÃO reporte: melhorias de UX/design (anote no máximo 3 numa seção separada
"Anotações UX"), refactors estéticos, performance especulativa.

Retorne APENAS markdown neste formato (sem prosa fora dele):

## Achados
### A<N>: <título curto>
- **Arquivo:** <caminho:linha>
- **Severidade:** critico | medio | menor
- **Bug:** <o que acontece de errado, com o cenário concreto que dispara>
- **Evidência:** <trecho de código ou raciocínio que prova>
- **Fix proposto:** <mudança concreta, 1-3 frases>
- **Zona:** vermelha | segura   (vermelha = dinheiro/billing, schema/migração, webhook prod)

## Anotações UX
- <máx 3 itens, 1 linha cada>
```

- [ ] **Step 2: Preencher escopo e sinais por agente**

| Agente | `<DOMÍNIO>` | `<ESCOPO>` |
|---|---|---|
| 1 | Auth/Onboarding | `apps/web/src/app/(auth)/`, `apps/web/src/app/onboarding/`, `apps/web/src/app/invite/`, `apps/web/src/app/verify-device/`, config Better Auth em `apps/web/src/` (procurar `auth.ts`/`lib/auth`), e-mails via Resend |
| 2 | Forge | `packages/ai/src/forge/`, `apps/web/src/app/(app)/forge/`, server actions do wizard, snapshot de prompt, tools do Forge em `packages/ai/src/tools/` |
| 3 | WhatsApp/Worker | `packages/wa/src/`, `apps/worker/src/` (jobs BullMQ, process-message), webhook Meta em `apps/web/src/app/api/` (procurar rota de webhook), janela 24h, assinatura x-hub-signature-256 |
| 4 | Billing/Stripe | código de billing/assinatura em `apps/web/src/` (procurar `billing`, `stripe`), webhook Stripe em `apps/web/src/app/api/`, gate de plano em `apps/worker/src/jobs/process-message.ts`, contagem de conversas de IA, `marketingCredits` |
| 5 | App web geral | `apps/web/src/app/(app)/` (inbox, knowledge, dashboard, contacts, settings...), routers tRPC em `apps/web/src/` (procurar `server/` ou `trpc`), uso de `scopedDb` (isolamento multi-tenant), `packages/shared/src/` |

`<SINAIS>` = a seção correspondente de `sinais.md` (colar o texto).

- [ ] **Step 3: Despachar os 5 em paralelo e salvar saídas**

Salvar cada resposta verbatim em `achados-<dominio>.md` no diretório da auditoria.
Se um agente retornar vazio/falhar, re-despachar uma vez; se falhar de novo, registrar
no relatório e seguir.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-06-10-zerar-erros/achados-*.md
git commit -m "docs(audit): achados brutos dos 5 agentes de auditoria"
```

---

### Task 4: Verificação adversarial

**Files:**
- Create: `docs/superpowers/audits/2026-06-10-zerar-erros/achados-verificados.md`
- Modify: `docs/superpowers/audits/2026-06-10-zerar-erros/relatorio.md` (seção Descartados)

**Deve rodar na sessão principal (usa tool Agent).** Um verificador por domínio que
tenha achados (até 5 em paralelo), verificando cada achado individualmente.

- [ ] **Step 1: Despachar verificadores** com este prompt (preencher `<ACHADOS>` com o
conteúdo do `achados-<dominio>.md`):

```text
Você é um verificador adversarial READ-ONLY no monorepo C:\Users\ferna\zapai.
NÃO edite arquivos. Recebe achados de bug de outro auditor; seu trabalho é tentar
REFUTAR cada um, independentemente, lendo o código de verdade (abra os arquivos
citados e os chamadores).

Para cada achado, classifique:
- CONFIRMADO: o bug existe; você reproduziu o raciocínio no código e não achou guarda
  que o impeça. Cite a linha que confirma.
- REFUTADO: existe guarda/validação/fluxo que impede o bug. Cite a linha que refuta.
- INCERTO: depende de comportamento externo (Meta/Stripe/Redis) ou de dado de runtime
  que não dá pra provar só lendo. Diga o que falta pra decidir.

Seja cético: achado plausível-mas-sem-prova = INCERTO, não CONFIRMADO.

Achados a verificar:
<ACHADOS>

Retorne APENAS markdown:
### A<N>: <título original>
- **Veredito:** CONFIRMADO | REFUTADO | INCERTO
- **Prova:** <arquivo:linha + 1-2 frases>
```

- [ ] **Step 2: Consolidar `achados-verificados.md`**

Tabela única com todos os achados: id, domínio, severidade, zona, veredito. REFUTADOS
vão pro relatório (seção Descartados, com o motivo do verificador).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/audits/2026-06-10-zerar-erros/
git commit -m "docs(audit): verificacao adversarial consolidada"
```

---

### Task 5: Correção dos confirmados seguros

**Files:**
- Modify: conforme cada achado (código + teste no pacote dono)
- Modify: `docs/superpowers/audits/2026-06-10-zerar-erros/relatorio.md` (seção Corrigidos)

Para **cada** achado `CONFIRMADO + zona segura`, em ordem de severidade
(critico → medio → menor), repetir o ciclo abaixo. Um commit por achado.

- [ ] **Step 1: Escrever teste de regressão que falha**

No pacote dono do bug (Vitest em `packages/*`; pra código de `apps/web` sem harness
de unit, usar o teste do pacote mais próximo ou Playwright se for fluxo). O teste
reproduz o cenário concreto do achado. Se o fix for impossível de testar (ex.: erro
de tipo puro), pular Steps 1-2 e justificar no corpo do commit.

- [ ] **Step 2: Rodar e ver falhar**

```bash
pnpm --filter <pacote> test -- <arquivo-do-teste>
```

Expected: FAIL reproduzindo o bug.

- [ ] **Step 3: Fix mínimo**

Seguindo CLAUDE.md. Sem refactor oportunista — só o necessário pro bug.

- [ ] **Step 4: Rodar e ver passar + gate dirigido**

```bash
pnpm --filter <pacote> test
pnpm typecheck && pnpm lint
```

Expected: tudo verde.

- [ ] **Step 5: Commit + relatório**

```bash
git add <arquivos>
git commit -m "fix(<escopo>): <título do achado> (A<N>)"
```

Adicionar linha na seção Corrigidos do relatório: `A<N> — <título> — <hash>`.

---

### Task 6: Triagem (zona vermelha + incertos) → TASKs no vault

**Files:**
- Create: `vault/Tasks/TASK-00<NN>-<slug>.md` (um por achado triado, numeração
  contínua a partir de TASK-0020)
- Modify: `docs/superpowers/audits/2026-06-10-zerar-erros/relatorio.md` (seção Triados)

Para cada achado `CONFIRMADO + zona vermelha` e cada `INCERTO`:

- [ ] **Step 1: Criar TASK no vault** (formato dos TASKs existentes):

```markdown
---
id: TASK-00<NN>
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: <P1 se critico, P2 se medio, P3 se menor>
area: <web | worker | ai | wa | db | shared>
created: 2026-06-10
updated: 2026-06-10
related: []
tags: [task, area/<area>, audit-2026-06-10]
---
# <título do achado>

## Objetivo
<bug + cenário que dispara, copiado do achado. Se INCERTO: o que falta provar.>

## Plano
- <fix proposto pelo auditor>
- <se zona vermelha: o que precisa de OK explícito (migração? dinheiro? prod?)>

## Critério de pronto
- [ ] <comportamento correto verificável>
- [ ] gate verde
```

- [ ] **Step 2: Listar na seção Triados do relatório**

`TASK-00<NN> — <título> — <zona vermelha | incerto> — <1 linha do porquê não corrigi>`

- [ ] **Step 3: Commit único da triagem**

```bash
git add vault/Tasks/ docs/superpowers/audits/
git commit -m "docs(audit): triagem zona vermelha + incertos em TASKs (aguardam OK)"
```

---

### Task 7: Gate final + relatório + PLAN.md

**Files:**
- Modify: `docs/superpowers/audits/2026-06-10-zerar-erros/relatorio.md`
- Modify: `PLAN.md` (seção "Estado atual")

- [ ] **Step 1: Gate completo de novo**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: tudo verde (mesma ressalva de env do build da Task 1). Registrar na seção
"Gate final" do relatório.

- [ ] **Step 2: Fechar o relatório**

Conferir que as 5 seções estão preenchidas (Corrigidos com hashes, Triados com TASK
ids, Descartados com motivos, Anotações UX, Gate final). Sem placeholder.

- [ ] **Step 3: Atualizar PLAN.md**

Na seção "Estado atual", adicionar bullet no topo:

```markdown
- **Sub-projeto 1/4 "Zerar erros" CONCLUÍDO (2026-06-10).** Gate verde
  (typecheck/lint/test/build). <N> bugs corrigidos (commits locais, sem push),
  <M> triados em TASK-0020..00<NN> (aguardam OK), <K> falsos positivos descartados.
  Relatório: docs/superpowers/audits/2026-06-10-zerar-erros/relatorio.md.
  Próximo: sub-projeto 2 (UX do cliente) — brainstorm de spec.
```

- [ ] **Step 4: Commit final**

```bash
git add docs/superpowers/audits/ PLAN.md
git commit -m "docs(audit): relatorio final zerar-erros + PLAN atualizado"
```

- [ ] **Step 5: Apresentar ao usuário**

Resumo com: contagens (corrigidos/triados/descartados), lista dos triados que esperam
OK, lembrete de que commits estão locais e push dispara deploy Vercel (precisa de OK).

---
tipo: feature
projeto: "[[index|Trato]]"
tags: [trato, forge, builder, ia]
atualizado: 2026-05-26
codigo: "packages/ai/src/forge/"
---

# Forge — Builder conversacional

> A IA que constrói a IA que atende. Diferencial central do Trato.

Em vez de fluxograma + canvas + dropdowns, o cliente conversa em pt-BR (ou áudio) com o Forge, que faz perguntas pertinentes pra pessoa leiga e monta o agente automaticamente.

## State machine

10 fases. Estado em `ForgeSession.currentPhase` (DB).

```
DISCOVERY
  ↓
VERTICAL_DETECTION ─── apply_template ───┐
  ↓                                       ↓
GOALS                                  REVIEW
  ↓                                       ↓
TONE                                   PUBLISH
  ↓                                       ↓
KNOWLEDGE                              (REFINEMENT loop)
  ↓
TOOLS
  ↓
HANDOFF
  ↓
REVIEW → PUBLISH → REFINEMENT
```

### Cada fase tem

- **System prompt próprio** em `packages/ai/src/forge/prompts/phases.ts`
- **Filtro de tools** disponíveis em `PHASE_TOOLS` (`tools.ts`)
- **Linguagem para leigo** — evita jargão ("agente", "vertical", "tools" — usa "robô", "tipo de negócio", "capacidades")
- **Uma pergunta por turno** — não cansa o usuário

## Tools do Forge

| Tool | Quando |
|---|---|
| `set_business_info` | DISCOVERY — persiste descrição + nome |
| `classify_business_vertical` | VERTICAL_DETECTION — classifica em ECOMMERCE/CLINIC/etc |
| `list_templates_for_vertical` | VERTICAL_DETECTION — oferece templates prontos |
| `apply_template` | VERTICAL_DETECTION — atalho que preenche tudo de uma vez (4-5 turnos economizados) |
| `set_goals` | GOALS — array de 2-4 objetivos |
| `set_tone` | TONE — tom + emoji + neverSay |
| `scrape_url` | KNOWLEDGE — fetch URL com SSRF guard, retorna `{ok, title, excerpt}` ou `{ok:false, reason}` |
| `add_knowledge_item` | KNOWLEDGE — registra fonte (url/text/upload) |
| `suggest_tools_for_vertical` | TOOLS — lista canônica pro vertical |
| `set_tools` | TOOLS — array de toolNames ativas |
| `set_handoff_rules` | HANDOFF — keywords + conditions + businessHoursOnly |
| `generate_system_prompt` | REVIEW — chama meta-prompt LLM (caro) |
| `refine_system_prompt` | REVIEW + REFINEMENT — diff-style, aplica instrução em natural language |
| `publish_agent_version` | PUBLISH — cria AgentVersion no DB |
| `advance_phase` | qualquer — muda de fase |

## Engine

`runForgeStep()` em `engine.ts`. Closure-based — callbacks (`setAnswer`, `setNextPhase`, etc.) mutam ref viva de answers entre tool calls. Max 6 iterações de tool calling por turn.

## Meta-prompt

`META_PROMPT_SYSTEM` em `prompts/meta-prompt.ts`. Recebe `ForgeAnswers` tipado, devolve system prompt de produção em pt-BR com seções obrigatórias: Identidade, Tom, Comportamento, Conhecimento, Tools, Handoff, Restrições, Estilo, Few-shot.

**Caminho rápido:** quando usuário aceita template, **não chama meta-prompt** — usa `renderTemplatePrompt()` que substitui `{{brandName}}` no skeleton já escrito em texto. Zero token gasto.

## Templates por vertical → [[Habilidades]]

## Provider

`packages/ai/src/provider.ts` — auto-detect via env:
- `ANTHROPIC_API_KEY` presente → Anthropic Sonnet 4.5
- `OPENAI_API_KEY` presente → GPT-4o
- `MOCK_AI=true` → mock determinístico (sem custo)
- `AI_PROVIDER=anthropic|openai` força

## Prompt caching

CLAUDE.md obriga >1024 tokens. Helper `systemMessage()` em `packages/ai/src/caching.ts` injeta `providerOptions.anthropic.cacheControl: { type: 'ephemeral' }`. Aplicado em todos `generateText` do Forge engine + agent runner.

Economia: até 90% no cache hit Anthropic.

## Áudio

Botão de mic na composer. MediaRecorder → POST `/api/forge/transcribe` → Whisper. Texto transcrito concatena com draft existente.

→ ver [[Habilidades#Áudio no Forge]]

## Refinamento contínuo

Quando agente já foi PUBLISHED, sessão entra em REFINEMENT loop. Cada msg do user vira `refine_system_prompt(instruction)` que gera diff-style sobre a versão atual. Cria nova AgentVersion versionada (rollback disponível).

## Arquivos-âncora

| Arquivo | O que tem |
|---|---|
| `packages/ai/src/forge/engine.ts` | `runForgeStep` — orquestra LLM call + tool calls + state |
| `packages/ai/src/forge/tools.ts` | 15 tools com schemas Zod + PHASE_TOOLS filter |
| `packages/ai/src/forge/prompts/phases.ts` | System prompt de cada fase |
| `packages/ai/src/forge/prompts/meta-prompt.ts` | META_PROMPT_SYSTEM |
| `packages/ai/src/forge/prompts/base.ts` | Identidade base herdada |
| `packages/ai/src/forge/types.ts` | Zod schemas + types (ForgeAnswers, FORGE_PHASE_IDS, etc) |
| `packages/ai/src/playbooks/templates.ts` | [[Habilidades\|6 templates prontos]] |
| `apps/web/src/app/(app)/forge/page.tsx` | Página server |
| `apps/web/src/app/(app)/forge/forge-workspace.tsx` | UI client (chat + preview) |
| `apps/web/src/app/(app)/forge/audio-recorder.tsx` | Mic + Whisper |
| `apps/web/src/app/(app)/forge/actions.ts` | Server actions |
| `apps/web/src/lib/forge/io.ts` | IO layer (scrape, publish) |

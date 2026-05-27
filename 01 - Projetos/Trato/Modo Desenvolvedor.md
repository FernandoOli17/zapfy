---
tipo: feature
projeto: "[[index|Trato]]"
tags: [trato, developer, flow-editor, custom-tools, power-user]
atualizado: 2026-05-26
codigo: "apps/web/src/app/(app)/developer/"
---

# Modo Desenvolvedor

> Pro usuário que entende código e quer mexer em tudo. Opt-in por workspace (OWNER liga em /settings).

Roda **lado a lado** com o [[Forge]]: liga o flag, edita o que quiser, e ao re-publicar pelo Forge as customizações são **preservadas** (não destruídas).

## 3 frentes

### 1. Flow editor visual

`/developer` → tab "Flow". ReactFlow drag/drop.

- **Tipos de node:** TRIGGER, CLASSIFY, RAG_SEARCH, TOOL_CALL, AGENT_RESPONSE, BRANCH (if), HANDOFF, END
- **Edges com condição:** `true`, `false`, `any`. Branches usam `true`/`false`
- **Per-node config:** topK do RAG, maxSteps do agente, expressão do branch, motivo do handoff
- **Inspector lateral:** edita config sem sair do canvas
- **Validação Zod no save:** exige 1 TRIGGER único, IDs únicos, edges com source/target válidos

**Persistência:** `AgentVersion.flowGraph` (Json?). Cada save cria nova `AgentVersion` versionada com `changeNotes`. Rollback disponível via /agent.

### 2. Custom tools

Tab "Tools custom". CRUD de ferramentas HTTPS que o agente pode invocar.

- **Form:** nome (`^[a-z][a-z0-9_]{1,40}$`), descrição (LLM lê pra decidir), JSON Schema dos args (rejeita `$ref` circular + depth > 30), endpoint HTTPS (SSRF guard `assertSafeUrl()`), timeout (1-60s)
- **Secret HMAC SHA-256:** gerado server-side, mostrado uma vez. Hash + prefix (`cs_xxxxx`) persistidos.
- **Assinatura:** `x-trato-signature: sha256=<hex>` com **HMAC real** (createHmac), não plain SHA. Ver [[Segurança#HMAC custom tools]]

### 3. Raw prompt editor

Tab "Prompt raw". Textarea monospace + estimativa de tokens. `Ctrl+S` salva como nova `AgentVersion`. Bypassa o Forge meta-prompt.

## Expression parser (BRANCH nodes)

Parser recursive-descent **sem `eval`** em `packages/ai/src/flow/expression.ts`.

Sintaxe:
```
$classification.needs_handoff === true
$rag.length > 0
$inboundText contains "preço"
($classification.intent === "complaint" || $classification.sentiment === "negative") && $rag.length === 0
```

Operadores: `===`, `!==`, `==`, `!=`, `>`, `>=`, `<`, `<=`, `contains`, `&&`, `||`, `!`, `()`.
Paths: `$inboundText`, `$classification.*`, `$rag` (array), `$rag.length`, `$agentResult.*`.
Tipos: string (com escapes `\n \t \r \\ \" \'`), number (1 ponto decimal), boolean, null.

Hard limit: 32 níveis de profundidade.

## Executor

`packages/ai/src/flow/executor.ts` — walk do grafo a partir do TRIGGER.

- **Per-execution scope:** `branchOutcomes` Map vive dentro do scope (isolado de execuções concorrentes — bug histórico já corrigido).
- **Anti-loop:** MAX_NODES_VISITED=30, cycle detection via Set.
- **Fallback gracioso:** se executor lançar (graph inválido, expressão quebrada), worker cai pra `runAgent()` default — agente nunca fica mudo.
- **Texto vazio:** se flow termina sem AGENT_RESPONSE, retorna fallback "Recebi sua mensagem, vou verificar e já te respondo" em vez de string vazia.

## Integração com Forge

Quando dev mode ON e usuário tem agent publicado:

1. **`/forge` e `/agent` mostram CTA** "Editor avançado" no header (badge âmbar)
2. Re-publicar pelo Forge **preserva** `flowGraph` + `customToolNames` (não destrói)
3. `changeNotes` deixa explícito: "Refinamento via Forge (flowGraph customizado preservado)"
4. Pra resetar pro default, usuário vai no /developer → "Resetar pro default"

## Schema novo (Prisma)

```prisma
model Workspace {
  developerModeEnabled Boolean @default(false)
  customTools CustomTool[]
}

model AgentVersion {
  flowGraph Json?
  customToolNames String[]
}

model CustomTool {
  id, workspaceId, name (unique per workspace)
  description, inputSchema (Json), endpoint
  secretHash, secretPrefix, signatureHeader
  timeoutMs, active
}
```

→ pendente `pnpm db:push` no Neon

## Arquivos-âncora

| Arquivo | O que tem |
|---|---|
| `packages/ai/src/flow/types.ts` | Zod schemas FlowGraph + FlowNode + FlowEdge |
| `packages/ai/src/flow/executor.ts` | `executeFlow()` walk + per-execution scope |
| `packages/ai/src/flow/expression.ts` | Parser recursive-descent (sem eval) |
| `apps/web/src/app/(app)/developer/page.tsx` | Server page com gates RBAC + devMode |
| `apps/web/src/app/(app)/developer/developer-workspace.tsx` | Client tabs |
| `apps/web/src/app/(app)/developer/flow-editor.tsx` | ReactFlow canvas + inspector |
| `apps/web/src/app/(app)/developer/custom-tools-manager.tsx` | CRUD HMAC tools |
| `apps/web/src/app/(app)/developer/raw-prompt-editor.tsx` | Monaco-lite |
| `apps/web/src/app/(app)/developer/actions.ts` | Server actions |
| `apps/web/src/lib/custom-tool-hmac.ts` | HMAC SHA-256 sign/verify |
| `apps/web/src/app/(app)/settings/dev-mode-toggle.tsx` | Toggle Settings |

## Pendências (Bug O do code-review)

Atualmente `TOOL_CALL` node no executor é placeholder (`return 'skipped'`). A invocação real precisa:

1. Carregar `CustomTool` por nome do workspace
2. Re-rodar `assertSafeUrl(endpoint)` (defense vs DNS rebinding)
3. POST com `x-trato-signature` (createHmac), respeitar `timeoutMs`
4. Retornar `response.json()` como result da tool pro agente

→ rastreado em [[Roadmap#Bug O]]

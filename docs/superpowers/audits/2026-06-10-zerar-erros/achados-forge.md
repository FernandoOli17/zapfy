# Achados brutos — Forge (agente 2)

## Achados

### A1: send_checkout_link envia link de checkout falso (checkout.example.com) pro cliente final
- **Arquivo:** packages/ai/src/tools/ecommerce.ts:223-232
- **Severidade:** critico
- **Bug:** Quando o produto não tem `checkoutUrl` configurado, a tool monta `https://checkout.example.com/cart?items=...` e retorna `ok: true` com a URL. O agente em produção cola esse link na conversa do WhatsApp — o cliente que quer fechar compra recebe um link morto, apresentado como checkout real. É exatamente a degradação desonesta de `TODO(credentials)`: não há mensagem honesta tipo "checkout online indisponível, vou chamar alguém do time".
- **Evidência:** `const baseUrl = first?.checkoutUrl ? first.checkoutUrl : 'https://checkout.example.com/cart?items=...'` seguido de `return { ok: true as const, url, ... }` — nenhum caminho `ok: false` quando falta a integração.
- **Fix proposto:** Se nenhum produto tiver `checkoutUrl`, retornar `ok: false` com mensagem instruindo o agente a oferecer alternativa (handoff/pagamento combinado), nunca URL sintética.
- **Zona:** vermelha

### A2: book_service compartilha Professional `__default_team__` entre workspaces (cross-tenant)
- **Arquivo:** packages/ai/src/tools/service.ts:133-152
- **Severidade:** critico
- **Bug:** O `upsert` usa `where: { id: '__default_team__' }` com id hardcoded global. `Professional.id` é `@id` global (schema.prisma:850). O primeiro workspace que rodar `book_service` cria o registro com seu `workspaceId`; todo workspace seguinte cai no branch `update: {}` e recebe o Professional de OUTRO tenant — o `.catch()` de fallback nunca dispara porque o upsert não falha. Appointments do workspace B ficam ligados a um profissional do workspace A.
- **Evidência:** Comentário admite confusão: "não existe — força create no first run" / "upsert por id falha pq id não é único naquele padrão" — mas upsert por `@id` global *encontra* o registro de qualquer workspace e retorna sem erro.
- **Fix proposto:** Trocar por `findFirst({ where: { workspaceId, name: 'Equipe' } })` + `create` (o que o catch já faz), removendo o upsert com id global.
- **Zona:** segura

### A3: REFINEMENT é inalcançável e o prompt manda o Forge mentir "Versão N publicada"
- **Arquivo:** apps/web/src/app/(app)/forge/actions.ts:76-95,128-130,162-176 · packages/ai/src/forge/tools.ts:306-307 · packages/ai/src/forge/prompts/phases.ts:194-206
- **Severidade:** critico
- **Bug:** Após publicar, a sessão vira `PUBLISHED`; `sendForgeMessage` rejeita ("Sessão já encerrada") e `loadCurrentForgeSession` só busca `IN_PROGRESS` — cria sessão nova em DISCOVERY (wizard do zero). Nenhum código transiciona pra REFINEMENT (PHASE_TOOLS.PUBLISH não tem `advance_phase`). E mesmo se chegasse lá: `PHASE_TOOLS.REFINEMENT = ['refine_system_prompt']` só edita o draft da sessão — não cria AgentVersion — enquanto o prompt da fase instrui confirmar "Ajustado. Versão N publicada." O dono acha que o agente em produção mudou; nada mudou. O placeholder da UI ("Agente publicado. Use /forge novamente pra refinar", forge-workspace.tsx:235) reforça a promessa falsa.
- **Evidência:** Spec (`01 - Projetos/Trato/Forge.md:98`): "Quando agente já foi PUBLISHED, sessão entra em REFINEMENT loop... Cria nova AgentVersion" — nenhum dos três passos existe no código.
- **Fix proposto:** Ao detectar agente publicado no workspace, `loadCurrentForgeSession` deve reabrir/criar sessão em `REFINEMENT` com os answers da última versão; incluir `publish_agent_version` em PHASE_TOOLS.REFINEMENT (ou publicar automaticamente após cada refine) e aceitar mensagens em sessão PUBLISHED nessa fase.
- **Zona:** segura

### A4: genPublicNumber sem retry — pedido/orçamento falha com P2002 (comentário promete retry inexistente)
- **Arquivo:** packages/ai/src/tools/restaurant.ts:267-273 · packages/ai/src/tools/service.ts:190-193
- **Severidade:** medio
- **Bug:** Numeração por `count + 1` com `@@unique([workspaceId, publicNumber])` (schema.prisma:787,936). Dois pedidos simultâneos no mesmo workspace → mesmo número → `prisma.order.create` lança P2002 e o `submit_order` inteiro falha (carrinho fica, cliente recebe erro). Pior: se um Order for deletado, `count+1` colide com número existente *deterministicamente* — todo pedido novo falha até o count alcançar. O comentário afirma "se houver race... e chamar de novo com +1", mas não existe nenhum retry no código.
- **Evidência:** `const count = await prisma.order.count(...); return \`${prefix}-${(count + 1)...}\`` — caller `submit_order` não tem try/catch nem loop.
- **Fix proposto:** Buscar `max(publicNumber)` existente em vez de count, e envolver o create em retry (2-3 tentativas) capturando P2002, como o comentário já promete.
- **Zona:** vermelha

### A5: sendForgeMessage sem lock — double-submit/duas abas perdem mensagens e podem publicar agente duplicado
- **Arquivo:** apps/web/src/app/(app)/forge/actions.ts:113-191
- **Severidade:** medio
- **Bug:** Read-modify-write do transcript JSON sem controle de concorrência: duas chamadas simultâneas (duas abas, retry de rede) hidratam o mesmo estado, ambas rodam o LLM e o segundo `update` sobrescreve o primeiro — turno inteiro (mensagem do user + resposta + answers) some. Na fase PUBLISH, ambas passam o check `status !== IN_PROGRESS` antes do update e podem chamar `publish_agent_version` duas vezes; como `Agent` não tem unique em `[workspaceId, name]` (schema.prisma:544-559), dá pra criar dois Agents idênticos.
- **Evidência:** `findFirst` → `runForgeStep` (10-30s de janela) → `update` incondicional, sem `updatedAt` check nem versão.
- **Fix proposto:** Optimistic lock (incluir `updatedAt` do row lido no `where` do update e retornar erro "mensagem cruzada" se count=0) ou flag `processing` na sessão; adicionar `@@unique([workspaceId, name])` em Agent.
- **Zona:** segura

### A6: saveForgeBasics não-idempotente e sem guarda de fase — wizard pode rebobinar sessão em andamento
- **Arquivo:** apps/web/src/app/(app)/forge/actions.ts:216-283
- **Severidade:** medio
- **Bug:** A action só checa `status IN_PROGRESS`, não checa `currentPhase === DISCOVERY`/transcript vazio. Double-click em "Concluir e montar" (janela antes do `isPending` re-render) ou uma aba velha com o wizard aberto: aplica o patch de novo, duplica a mensagem de abertura no transcript e força `currentPhase` de volta pra KNOWLEDGE numa sessão que já estava em REVIEW — fase regride e o digest pro LLM fica inconsistente.
- **Evidência:** `const newTranscript = [...state.transcript, assistantMsg]` + `currentPhase: DbForgePhase.KNOWLEDGE` incondicionais.
- **Fix proposto:** Rejeitar (ou retornar estado atual sem mutar) quando `sessionRow.currentPhase !== 'DISCOVERY'` ou o transcript já tiver mensagens.
- **Zona:** segura

### A7: hydrateState engole falha de parse silenciosamente — answers coletados podem virar `{}` sem log
- **Arquivo:** apps/web/src/app/(app)/forge/actions.ts:289-313
- **Severidade:** medio
- **Bug:** Se `collectedAnswers` no DB não passar no `forgeAnswersSchema.safeParse` (dado legado, mudança de schema), o fallback é `forgeAnswersSchema.parse({})` — a sessão perde tudo que foi coletado e o Forge re-pergunta do zero, sem nenhum log. Mensagens de transcript inválidas também são dropadas em silêncio. Viola a regra "proibido catch/swallow — sempre logue ou propague" do CLAUDE.md.
- **Evidência:** `const answers = answersResult.success ? answersResult.data : forgeAnswersSchema.parse({});` — branch de falha sem `log.warn`.
- **Fix proposto:** Logar `log.error({ sessionId, issues })` em ambas as falhas de parse; considerar marcar a sessão como corrompida em vez de degradar pra vazio.
- **Zona:** segura

### A8: toolsEnabled escolhido no Forge nunca é aplicado no runtime — "desligar tool" não desliga nada
- **Arquivo:** packages/ai/src/agent/runner.ts:106-108 (contrato criado em apps/web/src/lib/forge/io.ts:149)
- **Severidade:** medio
- **Bug:** A fase TOOLS do Forge promete ao dono "Quer ligar ou desligar alguma dessas?" e persiste `set_tools` em `AgentVersion.toolsEnabled`. Mas `runAgent` monta `{...buildGlobalTools, ...buildVerticalTools(vertical)}` com TODAS as tools do vertical, sem filtrar por `toolsEnabled` (nenhum call site passa esse campo — grep confirma que só UI e seed leem `toolsEnabled`). Cliente desliga `apply_coupon`; o agente em produção continua aplicando cupom.
- **Evidência:** `RunAgentInput` não tem campo de tools habilitadas; `const tools = { ...globalTools, ...verticalToolsMap }` incondicional.
- **Fix proposto:** Passar `agentVersion.toolsEnabled` pro `runAgent` e filtrar o record de tools por esses nomes (mantendo globais obrigatórias como `transfer_to_human`).
- **Zona:** segura

### A9: Catálogo oferece 5 tools que não existem no runtime — system prompt gerado promete capacidade fantasma
- **Arquivo:** packages/ai/src/forge/index.ts:44,51,57,64-65
- **Severidade:** medio
- **Bug:** `VERTICAL_TOOL_CATALOG` lista `send_intake_form`, `apply_loyalty_discount`, `apply_discount`, `follow_up`, `request_payment_pix` — nenhuma é implementada em `build*Tools`. O Forge apresenta essas opções ao dono na fase TOOLS; se entrarem em `answers.tools`, o meta-prompt as escreve na seção "# Tools disponíveis" do system prompt final. O agente de produção então tenta "gerar Pix de sinal com QR Code" sem a tool existir → alucina ou promete e não cumpre.
- **Evidência:** Comparação direta do catálogo com os exports de packages/ai/src/tools/{clinic,restaurant,infoproduct,service}.ts — os 5 nomes não aparecem em nenhum builder.
- **Fix proposto:** Remover do catálogo (ou marcar `available: false` e filtrar antes de oferecer) até existirem; adicionar teste que valida catálogo ⊆ tools reais.
- **Zona:** segura

### A10: send_proposal devolve link `/q/{numero}` mas a rota não existe — cliente recebe 404
- **Arquivo:** packages/ai/src/tools/service.ts:98-110
- **Severidade:** medio
- **Bug:** O PDF é `TODO(credentials)`, e o fallback monta `previewUrl = ${baseUrl}/q/${publicNumber}` com instrução explícita pro agente mandar o link ("Link: ${previewUrl}"). Não existe nenhuma rota `q/` em apps/web (glob `apps/web/src/app/**/q/**` vazio). O cliente final recebe proposta com valor + um link 404 — promessa falsa igual ao padrão do A1.
- **Evidência:** `const previewUrl = \`${baseUrl}/q/${quote.publicNumber}\`` vs. ausência total de `app/q/[...]/page.tsx`.
- **Fix proposto:** Até existir a rota/PDF, retornar a proposta só como texto (itens + total + validade) e omitir URL do payload da tool.
- **Zona:** vermelha

### A11: book_appointment detecta conflito só na janela ±duração — consultas longas geram double-booking
- **Arquivo:** packages/ai/src/tools/clinic.ts:109-123
- **Severidade:** medio
- **Bug:** O check de overlap busca appointments com `startsAt` em `[novo - duração, novo + duração)`. Uma consulta existente de 120min começando 60min antes do horário pedido (30min) não entra na janela — o slot é dado como livre e duas consultas se sobrepõem.
- **Evidência:** `startsAt: { gte: new Date(startsAt.getTime() - durationMinutes*60_000), lt: ... }` usa a duração do NOVO agendamento como proxy da duração dos existentes; já o `slotConflicts` de `list_available_slots` faz a interseção correta (`slot < bEnd && slotEnd > b.startsAt`).
- **Fix proposto:** Buscar appointments ativos do profissional num range amplo do dia e aplicar o mesmo teste de interseção real (`existing.startsAt + existing.durationMinutes`) em código.
- **Zona:** segura

### A12: Slots da clínica gerados no fuso do servidor — em prod (UTC) horários saem 3h errados
- **Arquivo:** packages/ai/src/tools/clinic.ts:57,78-82,240-249
- **Severidade:** medio
- **Bug:** `start` é parseado em BRT (`T00:00:00.000-03:00`), mas `generateSlots` usa `slot.setHours(9...)` — hora LOCAL do servidor — e os labels usam `toLocaleTimeString('pt-BR')` sem `timeZone`. Em servidor UTC (Vercel/Railway), o slot "09:00" gravado em `startsAt` é 09:00 UTC = 06:00 em Brasília; o cliente marca "9h", a clínica vê 6h no dashboard (renderizado em BRT).
- **Evidência:** Mistura de offset fixo no parse com `setHours`/format dependentes de TZ do processo, sem `timeZone: 'America/Sao_Paulo'` em nenhum formatter.
- **Fix proposto:** Gerar slots com offset explícito (construir o ISO com `-03:00`) e formatar labels com `timeZone: 'America/Sao_Paulo'`.
- **Zona:** segura

### A13: dispatchOutgoingEvent disparado DENTRO da transação de publish — webhook pode sair antes do commit/rollback
- **Arquivo:** apps/web/src/lib/forge/io.ts:172-180
- **Severidade:** medio
- **Bug:** O `void dispatchOutgoingEvent(workspaceId, 'agent.published', ...)` roda dentro do callback de `prisma.$transaction`. Se a transação falhar/der rollback depois (ex.: `tx.agent.update` do `currentVersionId`), o webhook `agent.published` já foi enfileirado para sistemas externos com `agentId`/`versionNumber` que não existem. O comentário diz "Dispatch outside the tx callback... via setImmediate", mas não há setImmediate nem defer — é chamada direta no meio da tx.
- **Evidência:** Posição do call entre `tx.agent.update` e o `return` do callback da transação; `dispatchOutgoingEvent` consulta o DB e enfileira BullMQ imediatamente.
- **Fix proposto:** Mover o dispatch para depois do `await prisma.$transaction(...)` resolver, usando o retorno da tx.
- **Zona:** segura

### A14: runForgeStep e generateSystemPrompt sem timeout — viola regra "loop de tools com max iterations E timeout"
- **Arquivo:** packages/ai/src/forge/engine.ts:135-140 · packages/ai/src/forge/generate.ts:19-28 · engine.ts:86-95
- **Severidade:** menor
- **Bug:** O CLAUDE.md exige max iterations + timeout no loop de tool calls. O engine tem `stopWhen: stepCountIs(maxSteps)` mas nenhum `abortSignal`; `generateSystemPrompt` e `refineSystemPrompt` também não. Uma chamada pendurada na API trava a server action até o timeout da plataforma (o `runAgent` do worker faz certo: AbortController de 30s, runner.ts:134-144).
- **Evidência:** Nenhum dos três `generateText` do Forge recebe `abortSignal`, em contraste direto com runner.ts.
- **Fix proposto:** Adicionar `abortSignal: AbortSignal.timeout(60_000)` (Forge tem turnos longos) aos três call sites.
- **Zona:** segura

### A15: advance_phase aceita qualquer fase — state machine sem validação de transição
- **Arquivo:** packages/ai/src/forge/tools.ts:222-232 · packages/ai/src/forge/engine.ts:168
- **Severidade:** menor
- **Bug:** `advance_phase(to)` aceita qualquer um dos 10 IDs e o engine aplica sem validar. O LLM pode pular de DISCOVERY direto pra PUBLISH (ou voltar fases), e no turno seguinte `publish_agent_version` publica um agente com answers praticamente vazios. `nextPhaseDefault` existe em forge/index.ts mas não é usado pra validar nada.
- **Evidência:** `setNextPhase: (phase) => { pendingNextPhase = phase; }` + `const finalPhase = pendingNextPhase ?? state.currentPhase` — zero checagem de transição legal ou de pré-requisitos (ex.: PUBLISH exige `systemPromptDraft`/REVIEW feito).
- **Fix proposto:** Validar no engine que a transição é adjacente-ou-permitida (whitelist por fase, incluindo o atalho VERTICAL_DETECTION→REVIEW do template) e que PUBLISH só é alcançável com answers mínimos.
- **Zona:** segura

### A16: send_sales_page/schedule_call confiam no LLM pra "saber" a URL do workspace — link alucinado vai pro cliente
- **Arquivo:** packages/ai/src/tools/infoproduct.ts:84-127
- **Severidade:** medio
- **Bug:** O input `salesPageUrl`/`calendlyUrl` vem do próprio modelo, com describe dizendo "URL base configurada no workspace... senão pede pro admin". Não existe leitura de config — se a URL não estiver no prompt/RAG, o modelo pode inventar um domínio plausível e a tool devolve `ok: true` com instrução de colar na conversa ("Manda esse link..."). Lead recebe link errado/morto num fluxo de venda de ticket alto.
- **Evidência:** `execute` usa a URL recebida sem validação contra nenhuma fonte do workspace; só exige `z.string().url()`.
- **Fix proposto:** Buscar a URL de `WorkspaceSettings`/customField no execute (via deps) e retornar `ok: false, error: 'URL de vendas não configurada — avise o dono'` quando ausente, ignorando o valor vindo do modelo.
- **Zona:** segura

### A17: resetForgeSession sem Zod e erro do sendForgeMessage sempre culpa a API key
- **Arquivo:** apps/web/src/app/(app)/forge/actions.ts:194-201,146-156
- **Severidade:** menor
- **Bug:** (a) `resetForgeSession(currentSessionId: string)` é server action sem validação Zod — viola a regra "Zod em toda boundary". (b) O catch do `sendForgeMessage` expõe `err.message` cru ao cliente e SEMPRE anexa "Verifique sua chave de API (OPENAI_API_KEY ou ANTHROPIC_API_KEY) no .env" — mesmo quando o erro foi outro (DB, publish, scrape), instruindo o usuário final de SaaS a mexer em `.env` que ele não tem.
- **Evidência:** `const msg = err instanceof Error ? err.message : ...; return { error: \`${msg}. Verifique sua chave de API...\` }`.
- **Fix proposto:** Validar o id com `z.string().cuid()`; mapear o erro pra `AppError.userMessage` genérico ("Tive um problema ao processar, tenta de novo") e manter o detalhe só no log.
- **Zona:** segura

## Anotações UX
- `EmptyState` do chat (forge-workspace.tsx:333) ficou praticamente morto após o wizard — só aparece em sessão não-DISCOVERY com transcript vazio, estado que o fluxo atual nunca produz.
- Input do passo 1 do wizard não limita 80 chars no client — usuário só descobre o limite via erro Zod depois do passo 4.
- Preview "Agente publicado... Em breve conecte o WhatsApp" (forge-workspace.tsx:577) não linka pra /whatsapp, enquanto o prompt do PUBLISH manda o texto citar a rota.

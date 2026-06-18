# Achados brutos — App web geral (agente 5)

## Achados

### A1: Orçamento marcado "enviado" nunca chega ao cliente (promessa falsa na UI)
- **Arquivo:** apps/web/src/app/(app)/quotes/[id]/actions.ts:172 (e quote-editor.tsx:108,134,136)
- **Severidade:** medio
- **Bug:** O botão "Salvar + Enviar" confirma com o usuário "Enviar orçamento ao cliente?" e, em sucesso, mostra toast "Orçamento enviado" e trava a edição de itens (DRAFT→SENT é irreversível). Mas `changeQuoteStatus({status:'SENT'})` só muda o status no DB — o `TODO(notify)` confirma que o envio de WhatsApp pro contato não foi implementado. O cliente (que tem `contactId` e `conversationId` no Quote) nunca recebe nada, e o lojista acredita que recebeu e não consegue mais editar pra corrigir.
- **Evidência:** linha 172-173: `// TODO(notify): quando status=SENT, enfileirar envio de WhatsApp pro contato`. Nenhum `enqueue`/`sendTemplate`/`dispatchOutgoingEvent` é chamado no caminho SENT. UI (quote-editor.tsx:136) afirma "Orçamento enviado".
- **Fix proposto:** Enfileirar de fato o envio (template HSM ou texto dentro da janela de 24h) ao transicionar pra SENT antes de retornar ok; enquanto não houver envio, trocar o texto da UI para "Orçamento marcado como enviado" e não prometer entrega ao cliente.
- **Zona:** segura

### A2: RAG degradado (FTS-only) sem refletir na UI de knowledge
- **Arquivo:** packages/ai/src/knowledge/process.ts:104-108 + apps/web/src/app/(app)/knowledge/page.tsx:30,38 + schema KnowledgeDocument
- **Severidade:** medio
- **Bug:** Quando `VOYAGE_API_KEY` está ausente ou o Voyage falha, `embedBatch` retorna `null`, `embedded=false`, mas o documento é marcado `READY` mesmo assim (chunks sem `embedding`). O schema `KnowledgeDocument` não tem nenhum campo que registre se há embeddings, e a UI mostra status "READY" + contador de chunks + um badge estático "Indexação RAG ativa" / "vetor + busca textual" independentemente do estado real. O dono do workspace acha que o RAG vetorial está funcionando quando, na prática, `searchKnowledge` cai em FTS-only (rag.ts:67) — busca semântica desligada sem nenhum sinal.
- **Evidência:** process.ts:106-108 loga 'embeddings ausentes — FTS-only' mas persiste `status: READY`. embeddings.ts:20 retorna `null` silenciosamente sem VOYAGE_API_KEY. knowledge/page.tsx:30-32 renderiza "Indexação RAG ativa" hardcoded.
- **Fix proposto:** Persistir um flag/contagem de chunks embedados no KnowledgeDocument (ou status READY_FTS_ONLY) e refletir na DocumentRow/badge; alertar o dono quando embeddings não foram gerados.
- **Zona:** segura

### A3: `scopedDb` é código morto — convenção multi-tenant mandatória não é aplicada em lugar nenhum
- **Arquivo:** packages/db/src/scoped.ts:96 (definido) — zero usos no monorepo
- **Severidade:** medio
- **Bug:** O CLAUDE.md declara `scopedDb(workspaceId)` como obrigatório em TODA query de entidade de workspace (a rede de segurança contra vazamento multi-tenant). Na prática `scopedDb` não é importado por nenhum arquivo, e nem sequer é re-exportado de `@zapfy/db` (o index.ts só exporta `prisma` e `@prisma/client`). Todo o app web usa scoping manual `where: { workspaceId }`. Não encontrei vazamento ativo (o scoping manual está consistente em todas as ~168 queries que auditei), mas a proteção sistêmica simplesmente não existe: cada query nova depende do dev lembrar de adicionar `workspaceId` à mão — exatamente o risco que o helper deveria eliminar.
- **Evidência:** grep scopedDb no repo inteiro retorna só scoped.ts. packages/db/src/index.ts não tem export de './scoped'. Páginas/actions usam `prisma.X.findFirst({ where: { id, workspaceId } })` manualmente.
- **Fix proposto:** Ou adotar scopedDb de fato (exportar do index e migrar as queries), ou remover o helper e atualizar o CLAUDE.md pra documentar que o padrão real é scoping manual — além de adicionar um lint/teste que falhe se uma query de entidade tenant não filtrar por workspaceId.
- **Zona:** segura

### A4: Catches silenciosos em ações de suporte (viola "proibido catch swallow")
- **Arquivo:** apps/web/src/app/(app)/support/new/actions.ts:52, support/[id]/actions.ts:46, admin/support/[id]/actions.ts:49,73
- **Severidade:** menor
- **Bug:** Quatro server actions de suporte fazem `catch { return { ok: false, error: '...' } }` sem logar nem reportar ao Sentry. Se `openTicket`/`replyTicket`/`setTicketStatus` lançarem (erro de DB, falha de transação), o usuário vê uma mensagem genérica e o erro some — sem rastreabilidade, contrariando a regra do CLAUDE.md "Sempre logue ou propague".
- **Evidência:** support/new/actions.ts:52 `} catch { return { ok: false, error: 'Falha ao abrir ticket. Tente novamente.' }; }` — nenhum log/captureException. Mesmo padrão nos outros três.
- **Fix proposto:** Capturar `err` e `log.error(...)` / `captureException(err, ...)` antes de retornar a mensagem amigável.
- **Zona:** segura

### A5: Página /whatsapp pode mostrar contas de outro workspace pra usuário multi-workspace
- **Arquivo:** apps/web/src/app/(app)/whatsapp/page.tsx:29-32
- **Severidade:** menor
- **Bug:** A página resolve o workspace com `workspaceMember.findFirst({ where: { userId } })` SEM `orderBy: { createdAt: 'asc' }`, enquanto a action correspondente (whatsapp/actions.ts:25-29) usa `orderBy: { createdAt: 'asc' }`. Para um usuário membro de mais de um workspace (possível via convites), a página lista contas de um workspace em ordem indefinida, mas as ações de conectar/desconectar/testar operam sobre o workspace "primeiro por createdAt" — possivelmente outro. Estado inconsistente entre o que se vê e o que se modifica. (Não há vazamento: cada lado scopa por workspaceId; só divergem em qual workspace.)
- **Evidência:** page.tsx:29 não tem orderBy; actions.ts:28 tem `orderBy: { createdAt: 'asc' }`. Outras páginas (layout.tsx:141, dashboard, team) usam consistentemente createdAt asc.
- **Fix proposto:** Adicionar `orderBy: { createdAt: 'asc' }` no findFirst da página pra alinhar com as actions (idealmente centralizar via requireWorkspace).
- **Zona:** segura

### A6: Mensagem de teste inbound "enviada" sem worker resulta em conversa que a IA nunca responde
- **Arquivo:** apps/web/src/app/(app)/whatsapp/actions.ts:366-390
- **Severidade:** menor
- **Bug:** `sendTestInboundMessage` cria contato + conversa + Message INBOUND e chama `enqueue('process-message', ...)`. Se o Redis estiver indisponível, `enqueue` retorna `{ ok: false }` silenciosamente (queues.ts:75-77), mas a action ignora o retorno, retorna `{ status: 'ok' }` e revalida o inbox. O usuário vê a conversa aparecer e espera a IA responder — que nunca vem. Diferente de knowledge/actions.ts:55-61, que tem fallback inline quando a fila cai, aqui não há fallback nem aviso.
- **Evidência:** whatsapp/actions.ts:366 `await enqueue('process-message', {...})` sem checar `.ok`; em seguida `return { status: 'ok', conversationId }`.
- **Fix proposto:** Verificar o retorno de enqueue e, em falha, avisar o usuário (ou fazer fallback de processamento inline como em knowledge).
- **Zona:** segura

### A7: Knowledge perde conteúdo silenciosamente em doc grande (truncamento sem aviso na UI)
- **Arquivo:** packages/ai/src/knowledge/process.ts:92-98
- **Severidade:** menor
- **Bug:** Documentos com mais de 200.000 caracteres são cortados (`rawText.slice(0, MAX_CHARS_PER_DOC)`) e o resultado do chunking é limitado a 400 chunks (`.slice(0, MAX_CHUNKS_PER_DOC)`). Ambos só geram log.warn; a UI de knowledge marca o doc READY mostrando os 400 chunks como se tudo tivesse sido indexado. O dono não sabe que parte da base ficou de fora do RAG.
- **Evidência:** process.ts:93 `log.warn(..., 'truncando doc grande')`; process.ts:98 `chunkText(rawText).slice(0, MAX_CHUNKS_PER_DOC)`. Nada disso é persistido/exibido — document-row.tsx só mostra chunksCount e status.
- **Fix proposto:** Registrar `truncated: true` no documento e exibir um aviso na DocumentRow ("documento grande — parte não indexada") quando houver corte.
- **Zona:** segura

## Anotações UX
- dashboard/page.tsx:62 — o card "Base de conhecimento" tem `ready: false` (renderiza "em breve"), mas a feature está implementada e ativa no sidebar; corrigir para `ready: true`.
- quotes/[id]/actions.ts:147-149 — transição para EXPIRED não tem guarda de estado (dá pra ir de DRAFT/ACCEPTED direto pra EXPIRED manualmente); as demais transições são validadas. Considerar restringir.
- analytics/page.tsx:376 — o rodapé promete "Em breve: filtro por intervalo, exportação CSV…" enquanto o header diz "Atualizado em tempo real"; alinhar expectativas.

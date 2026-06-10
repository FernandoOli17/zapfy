# Achados brutos — WhatsApp/Worker (agente 3)

## Achados

### A1: Retry do BullMQ reenvia resposta da IA ao contato (job não-idempotente)
- **Arquivo:** apps/worker/src/jobs/process-message.ts:342-396 (com apps/web/src/app/api/webhooks/whatsapp/[phoneNumberId]/route.ts:319 e apps/web/src/lib/queues.ts:83-84)
- **Severidade:** critico
- **Bug:** O job roda com `attempts: 3` + backoff exponencial de 5s. O envio via WA (passo 11) captura erros e não lança, mas `prisma.message.create` (passo 13) ou `usageRecord.create` (passo 14) podem lançar após o envio bem-sucedido. O retry re-executa o pipeline inteiro: re-classifica, re-roda o agente (com side effects de tools: `sendTemplate`, `setContactField`, handoff) e **reenvia a resposta pro contato** — mensagem duplicada no WhatsApp. Pior: como o backoff (5s) > cooldown (2s), o cooldown não protege; e se o retry fosse <2s, o cooldown faria o job retornar "sucesso" sem persistir nada (mensagens enviadas somem do inbox).
- **Evidência:** Loop de envio em 342-350 só loga erro (`break`); qualquer throw depois (361-396) marca o job como failed e o BullMQ retenta do zero. Não há checagem "já respondi esse messageId" no início do job.
- **Fix proposto:** Tornar idempotente: antes de rodar o agente, checar se já existe `Message` OUTBOUND com `fromAi: true` respondendo a esse `messageId` (ou gravar um marker no início); persistir cada chunk imediatamente após o envio (não em loop separado).
- **Zona:** segura

### A2: Cooldown de 2s descarta silenciosamente a 2ª mensagem legítima do contato
- **Arquivo:** apps/worker/src/jobs/process-message.ts:39-51
- **Severidade:** critico
- **Bug:** Se o contato manda duas mensagens distintas em <2s (padrão comuníssimo no WhatsApp: "oi" + "quero agendar"), o webhook cria dois jobs com jobIds distintos; o segundo cai no cooldown, loga "ignorando duplicata" e retorna com sucesso — a segunda mensagem **nunca é processada nem respondida**, e o BullMQ não retenta (job completou). A dedup de re-entrega da Meta já é feita pelo `jobId: msg-${messageId}` no producer, então o cooldown só descarta tráfego legítimo. Bônus: o `Map` é por processo (não funciona com >1 instância do worker) e nunca é limpo (leak).
- **Evidência:** `if (Date.now() - lastTs < COOLDOWN_MS) { log.info(...); return; }` — return sem throw = job completed; a mensagem inbound fica sem resposta pra sempre.
- **Fix proposto:** Remover o cooldown (a dedup por jobId já cobre re-entrega da Meta) ou trocá-lo por debounce que agrega as mensagens pendentes da conversa num único turn do agente.
- **Zona:** segura

### A3: Chunks não enviados são persistidos como SENT (status de Message dessincronizado)
- **Arquivo:** apps/worker/src/jobs/process-message.ts:342-350 e 362-381
- **Severidade:** medio
- **Bug:** Se o envio de um chunk falha, o loop dá `break` — mas o loop de persistência (passo 13) itera sobre **todos** os `chunks` e cria cada um com `status: MessageStatus.SENT`, mesmo os que nunca foram enviados (sem `whatsappMessageId`). O inbox mostra a resposta completa como enviada, o contato recebeu só metade, e não há registro FAILED nem captura no Sentry. Viola a regra inviolável de status sincronizado. (Contraste: o envio manual em inbox/actions.ts:125-137 cria Message FAILED corretamente.)
- **Evidência:** `catch (err) { log.error(...); break; }` seguido de `for (let i = 0; i < chunks.length; i++) { ... status: MessageStatus.SENT ... }` — `outboundMsgIds[i]` fica undefined mas o status é SENT igual.
- **Fix proposto:** Persistir cada chunk junto do envio; em falha, criar o Message com `status: FAILED` + `errorMessage` e não persistir os chunks restantes como SENT.
- **Zona:** segura

### A4: Agente retorna texto vazio → contato fica sem resposta nenhuma
- **Arquivo:** apps/worker/src/jobs/process-message.ts:333-336
- **Severidade:** medio
- **Bug:** Quando `result.text` é vazio (modelo devolveu só tool calls, timeout do loop, etc.), o job loga warn e retorna. O contato fica no vácuo, a conversa permanece `AI_HANDLING` (a IA vai continuar "atendendo"), o dono do workspace nunca fica sabendo, e nada vai pro Sentry (o worker inteiro não tem `captureException`).
- **Evidência:** `if (!result.text.trim()) { log.warn(...); return; }` — nenhum fallback, handoff ou notificação.
- **Fix proposto:** Enviar mensagem de fallback ("não consegui processar, um atendente vai te ajudar") + acionar `handleHandoff` (ou pelo menos marcar a conversa pra revisão humana) + capturar no Sentry.
- **Zona:** segura

### A5: Webhook Meta processa tudo síncrono antes do 200 (viola "enfileira e devolve <1s")
- **Arquivo:** apps/web/src/app/api/webhooks/whatsapp/[phoneNumberId]/route.ts:146-198 e 322
- **Severidade:** medio
- **Bug:** O handler faz, **sequencialmente e antes de responder**: lookup da conta, decrypt, HMAC, e por mensagem uma `$transaction` (upsert contact + findFirst conversation + dup check + create message + update conversation) **mais um `await publishInboxEvent` (HTTP pro Pusher) por mensagem**. Payload da Meta com várias mensagens + cold start da Vercel + Postgres remoto estoura fácil 1s; Meta degrada/desativa webhooks lentos. O comentário na linha 146 ("sem await all pra retornar rápido") contradiz o código, que aguarda tudo.
- **Evidência:** `await persistInboundMessage(...)` em loop for sequencial; dentro dele `await publishInboxEvent(...)` (linha 322) — chamada de rede externa no caminho crítico do ack.
- **Fix proposto:** Persistir só o mínimo (ou mover a persistência inteira pro job) e enfileirar; Pusher e outgoing webhooks saem do caminho do ack (mover pro worker).
- **Zona:** vermelha

### A6: Status fora de ordem regride READ→DELIVERED/SENT
- **Arquivo:** apps/web/src/app/api/webhooks/whatsapp/[phoneNumberId]/route.ts:398-409
- **Severidade:** medio
- **Bug:** `applyOutboundStatus` aplica o status recebido incondicionalmente. A Meta entrega `sent`/`delivered`/`read` em POSTs separados que podem chegar fora de ordem (retries + invocações serverless concorrentes). Um `delivered` atrasado processado depois do `read` regride o Message de READ pra DELIVERED — dessincroniza a regra sent→delivered→read. `failed` atrasado também sobrescreveria READ.
- **Evidência:** `prisma.message.updateMany({ where: {...}, data: { status: newStatus } })` sem comparação com o status atual.
- **Fix proposto:** Aplicar guarda de monotonicidade: só atualizar se o novo status tiver rank maior (SENT=1 < DELIVERED=2 < READ=3; FAILED tratado à parte), ex. via `updateMany` com `where: { status: { in: [ranks inferiores] } }`.
- **Zona:** vermelha

### A7: Falha ao enfileirar process-message é ignorada — mensagem nunca processada
- **Arquivo:** apps/web/src/app/api/webhooks/whatsapp/[phoneNumberId]/route.ts:312-320
- **Severidade:** medio
- **Bug:** `void enqueue(...)` descarta o resultado. `enqueue` não lança — retorna `{ok:false}` em falha de Redis (queues.ts:89-92) com um log.warn. Se o Redis/Upstash estiver indisponível, a mensagem inbound é persistida, a Meta recebe 200 (sem retry dela), e o agente **nunca processa** — contato sem resposta, sem retry, sem Sentry.
- **Evidência:** `void enqueue(QUEUE_NAMES.processMessage, {...})` — único consumidor do `{ok:false}` é o vácuo.
- **Fix proposto:** `await` o enqueue; em `!ok`, capturar no Sentry e marcar a Message/Conversation pra reprocessamento por um sweep (ou responder 500 nesse caso específico pra forçar retry da Meta).
- **Zona:** vermelha

### B1: Retry de send-broadcast reenvia template ao contato (sem guard de idempotência)
- **Arquivo:** apps/worker/src/jobs/send-broadcast.ts:21-133
- **Severidade:** critico
- **Bug:** Se `sendTemplate` sucede mas qualquer passo seguinte lança (criar conversation/message em 111-131, `markRecipient`, completion check), o job falha e o BullMQ retenta (attempts: 3 no producer). O início do job checa broadcast CANCELED e optedOut, mas **nunca checa o status do BroadcastRecipient** — o retry reenvia o template pro mesmo contato. Em broadcast de marketing isso é mensagem paga duplicada em massa no pior momento (instabilidade de DB afeta vários jobs de uma vez).
- **Evidência:** Nenhum `if (recipient.status === SENT) return` no topo; o recipient nem é carregado — só broadcast e contact (linhas 24-35).
- **Fix proposto:** Carregar o BroadcastRecipient no início e retornar cedo se status ≠ PENDING; idealmente marcar `SENDING` antes do envio pra detectar retries pós-envio.
- **Zona:** segura

### B2: Créditos de marketing debitados upfront, sem refund em falha e sem atomicidade
- **Arquivo:** apps/web/src/app/(app)/automations/broadcasts/actions.ts:167-205
- **Severidade:** medio
- **Bug:** `launchBroadcast` debita `needed` créditos de uma vez e só depois enfileira. (1) Recipients que terminam FAILED/SKIPPED (conta WA desconectada, template reprovado entre launch e job, contato optou out) **consomem crédito sem refund** — não existe lógica de estorno em lugar nenhum. (2) Se o Redis estiver fora, `enqueued = 0`, créditos já foram debitados e o broadcast fica RUNNING pra sempre. (3) Check `creditsSufficient` + `decrement` não são atômicos — dois launches concorrentes passam ambos no check e o saldo fica negativo.
- **Evidência:** `update({ data: { marketingCredits: { decrement: needed } } })` na linha 179-182, após check separado na 173; loop de enqueue ignora `res.ok` falso exceto pro contador; nenhum `increment` de crédito existe no codebase.
- **Fix proposto:** Debitar atomicamente com `updateMany({ where: { marketingCredits: { gte: needed } }, data: { decrement } })` checando `count`; estornar créditos de recipients FAILED/SKIPPED no fechamento do broadcast (ou debitar por envio confirmado).
- **Zona:** vermelha

### B3: Broadcast nunca vira COMPLETED se o último recipient falha
- **Arquivo:** apps/worker/src/jobs/send-broadcast.ts:104-108 e 137-147
- **Severidade:** menor
- **Bug:** O completion check (`remaining === 0 → COMPLETED`) só roda no caminho de sucesso. Em falha de envio o job lança (linha 107) antes do check; se o recipient que falhou (esgotando os 3 attempts) for o último a terminar, ninguém mais roda o check e o broadcast fica RUNNING/SENDING pra sempre na UI do dono.
- **Evidência:** `throw err; // BullMQ vai fazer retry` ocorre após `markRecipient(FAILED)` e antes das linhas 137-147.
- **Fix proposto:** Rodar o completion check também no caminho de falha (antes do throw, quando for o último attempt) ou num sweep periódico que fecha broadcasts sem PENDING.
- **Zona:** segura

### C1: Template preso em SUBMITTED pra sempre, com skip totalmente silencioso
- **Arquivo:** apps/worker/src/jobs/poll-template-status.ts:37 e 41-44
- **Severidade:** medio
- **Bug:** Dois caminhos deixam o template eternamente SUBMITTED sem o dono saber: (1) workspace sem conta WA CONNECTED → `continue` na linha 37 **sem nenhum log**; (2) decrypt do token falha (erro tipicamente permanente — chave trocada/registro corrompido) → log.warn e `continue`, a cada 15min, pra sempre. A Meta já aprovou/rejeitou, mas o status local nunca atualiza, broadcasts com esse template ficam bloqueados (`status !== 'APPROVED'` em send-broadcast.ts:59) e ninguém é notificado — sem Sentry no worker.
- **Evidência:** `if (!wa || !tpl.metaTemplateId) continue;` (zero log); decrypt catch só `log.warn(...) — pulo'`.
- **Fix proposto:** Marcar o template com um erro visível (campo `lastPollError`/status `POLL_ERROR`) após N falhas consecutivas + capturar decrypt failure no Sentry; logar o caso "sem conta conectada".
- **Zona:** segura

### D1: Falha do Resend só vira warn — e o contador reporta como enviado (ERR-0001)
- **Arquivo:** apps/worker/src/jobs/email-sequences.ts:100-102, 112-114 e 156/187/216
- **Severidade:** medio
- **Bug:** `res.error` do Resend gera `log.warn` e return; exception gera `log.error` — nenhum vai pro Sentry (worker não tem). O caller incrementa `sent += 1` **antes/independente** do resultado, então a métrica do sweep reporta sucesso mesmo com 100% de falha. Pior: o `day3_forge_nudge` consulta uma janela móvel de ±12h sobre `createdAt` — se o Resend ficar quebrado por >24h (API key inválida, domínio), os usuários saem da janela e o e-mail **nunca mais é tentado**, silenciosamente.
- **Evidência:** `if (res.error) { log.warn(...); return; }` + `await sendIfNotSent({...}); sent += 1;` (incremento incondicional).
- **Fix proposto:** `sendIfNotSent` retornar boolean e só incrementar em sucesso; falha repetida do Resend vira `captureException`/alerta. Considerar gravar tentativa falhada pra reprocesso fora da janela.
- **Zona:** segura

### E1: HMAC de custom tool assinado com o hash do secret (forjável por quem lê o DB; cliente não consegue validar)
- **Arquivo:** apps/worker/src/custom-tool-dispatcher.ts:60 (com apps/web/src/app/(app)/developer/actions.ts:294-296)
- **Severidade:** medio
- **Bug:** A assinatura usa `tool.secretHash` (sha256 hex do secret, persistido em texto plano no DB) como chave HMAC. Consequências reais: (1) qualquer vazamento/leitura do DB permite forjar requests "autênticos" contra o endpoint do cliente — anula o propósito do HMAC; (2) o cliente recebeu o **secret cru** na criação e vai validar com ele → toda assinatura falha, a menos que descubra (não documentado no código) que deve usar `sha256(secret)` como chave. Avaliação do re-check SSRF da linha 51: **falha fechado** corretamente (`assertSafeUrl` lança → `ok:false`), e `redirect: 'manual'` bloqueia redirect; resta só a janela teórica de DNS rebinding entre lookup e fetch, já confessa em ssrf.ts:17-21.
- **Evidência:** `createHmac('sha256', tool.secretHash)` — chave de assinatura = valor armazenado no banco.
- **Fix proposto:** Cifrar o secret cru com AES-256-GCM (mesmo helper dos tokens Meta, `ENCRYPTION_KEY`) em vez de só hashear, e assinar com o secret cru — resolve a validação do cliente e tira a chave de assinatura do DB em claro.
- **Zona:** segura

### E2: Outgoing webhooks sem nenhum guard SSRF (inconsistente com custom tools)
- **Arquivo:** apps/worker/src/jobs/outgoing-webhook.ts:20-31; apps/web/src/app/(app)/integrations/webhooks/actions.ts:33-36; apps/web/src/lib/webhooks-outgoing.ts:101-114
- **Severidade:** medio
- **Bug:** A URL do outgoing webhook é validada só com `z.string().url()` na criação e fetchada direto no worker e no fallback inline do web server — sem `assertSafeUrl` em nenhum ponto. Um admin de workspace pode registrar `http://10.x.x.x`, `http://169.254.169.254/...` ou serviços internos do Railway/Vercel e fazer o worker disparar POSTs internos (blind SSRF + port probing via status nos logs). Custom tools têm o guard nos dois momentos (create + invoke); webhooks não têm em nenhum.
- **Evidência:** `createInput = z.object({ url: z.string().url(), ... })` e `fetch(data.url, ...)` sem validação.
- **Fix proposto:** Chamar `assertSafeUrl` na criação do webhook e re-checar antes de cada fetch (worker e deliverInline), igual ao custom-tool-dispatcher.
- **Zona:** segura

### G1: Hard delete LGPD grava o telefone em texto plano no AuditLog
- **Arquivo:** apps/worker/src/jobs/lgpd-hard-delete.ts:51
- **Severidade:** medio
- **Bug:** O job que existe pra **apagar permanentemente** os dados do contato grava `phoneE164` em claro no metadata do AuditLog, que nunca é apagado. A PII sobrevive ao hard delete indefinidamente — derrota o propósito do fluxo LGPD e contraria a convenção do projeto de telefone hasheado (sha256+salt) fora das tabelas de negócio.
- **Evidência:** `metadata: { phoneE164: contact.phoneE164, ... }` dentro da transação de delete.
- **Fix proposto:** Gravar `hashPii(contact.phoneE164, salt)` (helper já existe em @zapfy/shared e é usado no webhook) em vez do telefone cru.
- **Zona:** segura

### F1: splitText pode gerar chunk de maxLen+1 chars (off-by-one no separador ". ")
- **Arquivo:** packages/wa/src/utils.ts:20-23 e 33-39
- **Severidade:** menor
- **Bug:** `findCut` retorna `idx + sep.length` com `idx ≤ max`. Pro separador `'. '` com `idx === max`, `cut = max + 2` → chunk de `max+2` chars terminando em `'. '`; o `trim()` remove só o espaço, deixando **max+1** chars (ex.: 1025 com maxLen 1024). Não estoura o limite duro da Meta (4096), mas viola a regra do projeto de chunks ≤1024. Não corta palavra e não perde pedaço — esses casos estão corretos.
- **Evidência:** `const idx = text.lastIndexOf(sep, max); if (idx > max * 0.4) return idx + sep.length;` — sem clamp pra `cut ≤ max`.
- **Fix proposto:** Buscar o separador com `lastIndexOf(sep, max - sep.length)` (ou clampar `cut` em `max`) pra garantir chunk ≤ max após trim.
- **Zona:** segura

### F2: Zod do webhook rejeita o payload inteiro se vier qualquer change de outro field
- **Arquivo:** packages/wa/src/types.ts:161 (com route.ts:136 e 199-203)
- **Severidade:** menor
- **Bug:** `field: z.literal('messages')` faz `parseWebhookPayload` lançar se o WABA estiver inscrito em qualquer outro webhook field (ex.: `message_template_status_update`, `account_update`) e a Meta incluir essa change. O throw cai no catch geral → ack 200 → **as mensagens válidas do mesmo POST são descartadas sem retry**.
- **Evidência:** `changes: z.array(z.object({ field: z.literal('messages'), ... }))` — schema estrito sobre array heterogêneo, e o handler não tem caminho parcial.
- **Fix proposto:** Tornar o schema tolerante (union com passthrough pra fields desconhecidos) e filtrar só as changes `field === 'messages'` no flatten.
- **Zona:** vermelha

### H1: Janela de 24h fecha com clock skew (elapsed negativo = "fora da janela")
- **Arquivo:** packages/wa/src/utils.ts:45-49
- **Severidade:** menor
- **Bug:** `isWithin24hWindow` exige `elapsed >= 0`. `lastIncomingMessageAt` vem do timestamp da Meta (route.ts:297); se o relógio do servidor estiver atrás do da Meta mais que o delay da fila, `elapsed` fica negativo e a função diz "fora da janela" — o agente silenciosamente não responde (process-message.ts:137-141 só loga) logo após uma mensagem recém-chegada. O caso `null` está correto (`false`).
- **Evidência:** `return elapsed >= 0 && elapsed < WA_WINDOW_MS;` — um timestamp "no futuro" significa mensagem recém-recebida, o caso mais dentro-da-janela possível.
- **Fix proposto:** Tratar `elapsed < 0` como dentro da janela: `return elapsed < WA_WINDOW_MS;`.
- **Zona:** segura

### H2: Falha do RAG engolida com catch silencioso
- **Arquivo:** apps/worker/src/jobs/process-message.ts:200
- **Severidade:** menor
- **Bug:** `searchKnowledge(...).catch(() => [])` — se o pgvector/Voyage falhar, o agente responde sem nenhum contexto da base de conhecimento, dando respostas erradas/genéricas, e ninguém fica sabendo (sem log, sem Sentry). Viola a regra do projeto "Proibido catch {} silencioso".
- **Evidência:** `const ragChunks = await searchKnowledge(workspaceId, inboundText, 4).catch(() => []);`
- **Fix proposto:** `.catch((err) => { log.warn({ err: String(err) }, 'RAG falhou — respondendo sem contexto'); return []; })` + métrica/Sentry se recorrente.
- **Zona:** segura

## Anotações UX
- process-message não atualiza `conversation.lastMessageAt` após a resposta da IA → ordenação e preview do inbox ficam defasados (só o webhook e o envio manual atualizam).
- Respostas de botões/listas interativas chegam como content sem `text` e o agente as ignora sem responder nada (process-message.ts:117-130 só trata AUDIO).
- E-mail day6 ("continue atendendo no WhatsApp") contradiz o gate de assinatura, que nunca deixa workspace TRIALING atender (process-message.ts:91) — copy ou gate, um dos dois está errado.

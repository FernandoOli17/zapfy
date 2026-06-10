import {
  prisma,
  ConversationStatus,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '@zapfy/db';
import { createLogger, decrypt } from '@zapfy/shared';
import { createWaClient, splitText, isWithin24hWindow, type WaTemplateComponent } from '@zapfy/wa';
import {
  classifyMessage,
  executeFlow,
  searchKnowledge,
  runAgent,
  routeModel,
  isRoutingEnabled,
  getAiModels,
  getModelIds,
  estimateCostCents,
  type AgentToolDeps,
  type VerticalToolDeps,
} from '@zapfy/ai';

/** Handle de modelo do SDK — derivado de getAiModels pra não depender de 'ai'. */
type AgentModel = ReturnType<typeof getAiModels>['chat'];
import { env } from '../env';
import { invokeCustomTool } from '../custom-tool-dispatcher';

const log = createLogger('worker:process-message');

export interface ProcessMessageJob {
  workspaceId: string;
  messageId: string;
  conversationId: string;
  contactId: string;
}

export async function processMessage(
  data: ProcessMessageJob,
  opts: { isRetry?: boolean } = {},
): Promise<void> {
  const { workspaceId, messageId, conversationId, contactId } = data;

  // Dedup de re-entrega da Meta é por jobId determinístico (`msg-${messageId}`)
  // no producer. Não usar cooldown por contato aqui: duas mensagens legítimas
  // em <2s são jobs distintos e a segunda era descartada sem resposta.

  // ─── 1. Carregar contexto ─────────────────────────────────────────────────
  const [message, conversation, contact, workspaceRaw] = await Promise.all([
    prisma.message.findUnique({ where: { id: messageId } }),
    prisma.conversation.findUnique({ where: { id: conversationId } }),
    prisma.contact.findUnique({ where: { id: contactId } }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        subscription: true,
        whatsappAccounts: { where: { status: 'CONNECTED' }, take: 1 },
        agents: {
          where: {},
          take: 1,
          include: { currentVersion: true },
        },
      },
    }),
  ]);

  if (!message || !conversation || !contact || !workspaceRaw) {
    log.warn({ messageId }, 'contexto incompleto — abortando');
    return;
  }

  // ─── 1b. Idempotência de retry ───────────────────────────────────────────
  // O job roda com attempts>1 no BullMQ. Se um retry chegar aqui depois de a
  // resposta já ter sido ENVIADA (falha pós-envio: persistência, usage record),
  // re-rodar o agente reenviaria a resposta ao contato. Só em retry (nunca no
  // primeiro attempt, pra não engolir rajada legítima de mensagens): se já
  // existe outbound da IA depois desta inbound, o turno já foi atendido.
  if (opts.isRetry) {
    const alreadyReplied = await prisma.message.findFirst({
      where: {
        conversationId,
        direction: MessageDirection.OUTBOUND,
        fromAi: true,
        createdAt: { gt: message.createdAt },
      },
      select: { id: true },
    });
    if (alreadyReplied) {
      log.info({ messageId, conversationId }, 'retry de job já respondido — ignorando');
      return;
    }
  }

  // ─── 2. Guards ───────────────────────────────────────────────────────────
  if (conversation.status === ConversationStatus.HUMAN_HANDLING) {
    log.info({ conversationId }, 'human handling — IA não responde');
    return;
  }
  if (conversation.status === ConversationStatus.CLOSED) {
    log.info({ conversationId }, 'conversa fechada — ignorando');
    return;
  }

  // Gate de assinatura: o agente só atende com assinatura paga viva. Sem trial —
  // o Forge monta/demonstra de graça no app, mas no WhatsApp só com ACTIVE.
  // PAST_DUE tem graça (Stripe ainda re-tenta cobrar); o resto não atende.
  const subStatus = workspaceRaw.subscription?.status;
  if (subStatus !== 'ACTIVE' && subStatus !== 'PAST_DUE') {
    log.info(
      { workspaceId, subStatus: subStatus ?? 'none' },
      'workspace sem assinatura ativa — agente não atende',
    );
    return;
  }

  const waAccount = workspaceRaw.whatsappAccounts[0];
  if (!waAccount) {
    log.warn({ workspaceId }, 'sem conta WA conectada');
    return;
  }

  const agent = workspaceRaw.agents[0];
  const agentVersion = agent?.currentVersion;
  if (!agent || !agentVersion) {
    log.warn({ workspaceId }, 'workspace sem agente publicado — usando resposta padrão');
    await sendFallbackMessage(waAccount, contact, workspaceId, conversationId);
    return;
  }

  // ─── 3. Texto da mensagem inbound ────────────────────────────────────────
  const content = message.content as Record<string, unknown>;
  const inboundText = typeof content['text'] === 'string' ? content['text'] : '';

  if (!inboundText) {
    log.info({ messageId, type: message.type }, 'mensagem sem texto — ignorando (áudio/mídia)');
    // Responde avisando sobre áudio (regra da spec)
    if (message.type === MessageType.AUDIO) {
      await sendText(
        waAccount,
        contact.phoneE164,
        workspaceId,
        conversationId,
        'Ainda não consigo escutar áudios. Pode escrever sua mensagem? 😊',
      );
    }
    return;
  }

  // ─── 4. Janela de 24h ────────────────────────────────────────────────────
  // Bug-fix: usar `lastIncomingMessageAt` direto, NÃO substituir por `new Date()`
  // que sempre disparava "dentro da janela" mesmo quando não havia nenhuma msg
  // inbound. `isWithin24hWindow(null) === false`, comportamento desejado.
  const within24h = isWithin24hWindow(conversation.lastIncomingMessageAt);
  if (!within24h) {
    log.info({ conversationId }, 'fora da janela 24h — exige template HSM');
    // Sem template configurado: apenas loga. Em produção, envia HSM.
    return;
  }

  // ─── 5. Classificar intenção ─────────────────────────────────────────────
  const classification = await classifyMessage(inboundText);
  log.info({ classification }, 'mensagem classificada');

  if (classification.needs_handoff) {
    await handleHandoff(
      waAccount,
      contact,
      conversationId,
      workspaceId,
      'Classificação automática: cliente sinalizou necessidade de atendente.',
    );
    return;
  }

  // ─── 6. Histórico recente (últimas 10 mensagens) ─────────────────────────
  const recentMessages = await prisma.message.findMany({
    where: { conversationId, id: { not: messageId } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { direction: true, content: true },
  });

  const messageHistory = recentMessages
    .reverse()
    .map((m) => ({
      role: m.direction === MessageDirection.INBOUND ? ('user' as const) : ('assistant' as const),
      text:
        typeof (m.content as Record<string, unknown>)['text'] === 'string'
          ? String((m.content as Record<string, unknown>)['text'])
          : '[mídia]',
    }))
    .filter((m) => m.text !== '[mídia]');

  // ─── 6b. Roteamento de modelo (Haiku→Sonnet) ────────────────────────────
  // DESLIGADO por default (AI_ROUTING != 'true'). Quando ligado, casos triviais
  // vão pro Haiku (mais barato); o resto fica no Sonnet. Decisão de produto via
  // eval comparativo — ver ADR de roteamento.
  const modelIds = getModelIds();
  let chosenModelId = modelIds.chat;
  let chosenModel: AgentModel | undefined;
  if (isRoutingEnabled()) {
    const route = routeModel({
      intent: classification.intent,
      sentiment: classification.sentiment,
      needsHandoff: classification.needs_handoff,
      messageLength: inboundText.length,
      historyLength: messageHistory.length,
    });
    if (route.target === 'fast') {
      chosenModel = getAiModels().fast;
      chosenModelId = modelIds.fast;
    }
    log.info({ route, model: chosenModelId }, 'roteamento de modelo aplicado');
  }

  // ─── 7. RAG ──────────────────────────────────────────────────────────────
  // Falha do RAG não derruba o turno (agente responde sem contexto), mas NUNCA
  // em silêncio — lei do CLAUDE.md: proibido catch swallow.
  const ragChunks = await searchKnowledge(workspaceId, inboundText, 4).catch((err: unknown) => {
    log.warn({ workspaceId, err: String(err) }, 'RAG falhou — respondendo sem contexto');
    return [];
  });

  // ─── 8. Decifrar token para envio ────────────────────────────────────────
  let accessToken: string;
  try {
    accessToken = decrypt(waAccount.accessTokenEncrypted, env.ENCRYPTION_KEY);
  } catch (err) {
    log.error({ err: String(err) }, 'falha ao decifrar access token');
    return;
  }

  const waClient = createWaClient({
    phoneNumberId: waAccount.phoneNumberId,
    accessToken,
  });

  // ─── 9. Montar deps das tools ────────────────────────────────────────────
  const globalDeps: AgentToolDeps = {
    workspaceId,
    contactId,
    conversationId,
    searchKnowledge: (q) => searchKnowledge(workspaceId, q, 4),
    setContactField: async (field, value) => {
      const data: Record<string, unknown> = {};
      if (field === 'name') data['name'] = value;
      else if (field === 'email') data['email'] = value;
      else if (field === 'note') data['note'] = value;
      if (Object.keys(data).length > 0) {
        await prisma.contact.update({ where: { id: contactId }, data });
      }
    },
    transferToHuman: async (reason) => {
      await handleHandoff(waAccount, contact, conversationId, workspaceId, reason);
    },
    sendTemplate: async (templateName, languageCode, components) => {
      if (components && components.length > 0) {
        await waClient.sendTemplate(contact.phoneE164, {
          name: templateName,
          language: languageCode,
          components: components as WaTemplateComponent[],
        });
      } else {
        await waClient.sendTemplate(contact.phoneE164, { name: templateName, language: languageCode });
      }
    },
  };

  const verticalDeps: VerticalToolDeps = {
    workspaceId,
    contactId,
    conversationId,
    // Fase 7: tools de vertical (em packages/ai/src/tools/) acessam DB
    // direto via prisma — não precisam mais de callbacks aqui.
  };

  // ─── 10. Rodar agente ────────────────────────────────────────────────────
  // Blacklist de tópicos vem de handoffRules.keywords do agente — palavras que
  // disparam transferência automática pra humano. É a melhor camada por hora,
  // até termos workspace.settings dedicado pra moderação.
  const handoffRules = (agentVersion.handoffRules as Record<string, unknown>) ?? {};
  const topicBlacklist = Array.isArray(handoffRules['keywords'])
    ? (handoffRules['keywords'] as string[]).filter((s): s is string => typeof s === 'string')
    : [];

  // Se a versão atual tem flowGraph customizado (modo desenvolvedor), executa
  // o pipeline custom. Caso contrário cai no runAgent default.
  // Fallback gracioso: se executor lançar (graph inválido, ciclo, etc.),
  // logamos e voltamos pra runAgent default — agente nunca fica mudo.
  let result;
  if (agentVersion.flowGraph) {
    try {
      result = await executeFlow({
        systemPrompt: agentVersion.systemPrompt,
        vertical: agent.vertical,
        messageHistory,
        inboundText,
        ragChunks,
        globalDeps,
        verticalDeps,
        maxSteps: 5,
        timeoutMs: 30_000,
        topicBlacklist,
        flowGraph: agentVersion.flowGraph,
        messageType: 'text',
        invokeCustomTool,
      });
      log.info(
        { conversationId, nodesExecuted: result.trace.length, customFlow: true },
        'flow customizado executado',
      );
    } catch (err) {
      log.warn(
        { conversationId, err: String(err) },
        'executor de flow falhou — fallback pra runAgent default',
      );
      result = await runAgent({
        systemPrompt: agentVersion.systemPrompt,
        vertical: agent.vertical,
        messageHistory,
        inboundText,
        ragChunks,
        globalDeps,
        verticalDeps,
        maxSteps: 5,
        timeoutMs: 30_000,
        topicBlacklist,
        ...(chosenModel ? { model: chosenModel } : {}),
      });
    }
  } else {
    result = await runAgent({
      systemPrompt: agentVersion.systemPrompt,
      vertical: agent.vertical,
      messageHistory,
      inboundText,
      ragChunks,
      globalDeps,
      verticalDeps,
      maxSteps: 5,
      timeoutMs: 30_000,
      topicBlacklist,
      ...(chosenModel ? { model: chosenModel } : {}),
    });
  }

  if (result.handedOff) {
    log.info(
      { conversationId, guardTriggered: result.guardTriggered, reasons: result.guardReasons },
      'agente transferiu para humano',
    );
    return;
  }

  if (!result.text.trim()) {
    // Contato não pode ficar no vácuo: transfere pra humano (marca a conversa
    // HUMAN_HANDLING e envia mensagem-ponte), e loga como erro — texto vazio é
    // falha do agente (só tool calls / timeout), não comportamento esperado.
    log.error({ conversationId, toolsUsed: result.toolsUsed }, 'agente retornou texto vazio — handoff');
    await handleHandoff(
      waAccount,
      contact,
      conversationId,
      workspaceId,
      'Agente retornou resposta vazia — revisão humana necessária.',
    );
    return;
  }

  // ─── 11. Custo estimado do turn ──────────────────────────────────────────
  // `cachedTokensIn` só existe no runAgent path; flow executor não expõe → 0.
  const cachedTokensIn = 'cachedTokensIn' in result ? (result.cachedTokensIn ?? 0) : 0;
  const costCents = estimateCostCents(chosenModelId, {
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    cachedTokensIn,
  });

  // ─── 12. Enviar resposta (chunks de 1024 chars) e persistir cada chunk ────
  // Envio e persistência andam JUNTOS por chunk: chunk que falhou vira Message
  // FAILED (com errorMessage) e os restantes não são enviados nem gravados como
  // SENT — o inbox reflete exatamente o que o contato recebeu.
  const chunks = splitText(result.text, { maxLen: 1024 });
  let sentChunks = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i] ?? '';
    const baseData = {
      workspaceId,
      conversationId,
      contactId,
      direction: MessageDirection.OUTBOUND,
      type: MessageType.TEXT,
      content: { text: chunkText },
      fromAi: true,
      toolsUsed: i === 0 ? result.toolsUsed : [],
      tokensIn: i === 0 ? result.tokensIn : 0,
      tokensOut: i === 0 ? result.tokensOut : 0,
      ...(i === 0 && costCents > 0 ? { costCents } : {}),
    };
    try {
      const sent = await waClient.sendText(contact.phoneE164, chunkText);
      const waId = sent.messages[0]?.id;
      sentChunks += 1;
      await prisma.message.create({
        data: {
          ...baseData,
          status: MessageStatus.SENT,
          ...(waId ? { whatsappMessageId: waId } : {}),
        },
      });
    } catch (err) {
      log.error({ conversationId, chunk: i, err: String(err) }, 'falha ao enviar chunk via WA');
      await prisma.message.create({
        data: {
          ...baseData,
          status: MessageStatus.FAILED,
          errorMessage: String(err).slice(0, 500),
        },
      });
      break;
    }
  }

  // ─── 14. Registro de uso ─────────────────────────────────────────────────
  if (result.tokensIn > 0 || result.tokensOut > 0) {
    await prisma.usageRecord.create({
      data: {
        workspaceId,
        kind: 'ai_message',
        quantity: 1,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        ...(costCents > 0 ? { costCents } : {}),
        metadata: { model: chosenModelId, cachedTokensIn },
      },
    });
  }

  log.info(
    {
      conversationId,
      chunks: chunks.length,
      sentChunks,
      toolsUsed: result.toolsUsed,
      model: chosenModelId,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      cachedTokensIn,
      costCents,
    },
    'agente respondeu com sucesso',
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function handleHandoff(
  waAccount: { phoneNumberId: string; accessTokenEncrypted: string },
  contact: { id: string; phoneE164: string },
  conversationId: string,
  workspaceId: string,
  reason: string,
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: ConversationStatus.HUMAN_HANDLING },
  });

  log.info({ conversationId, reason }, 'conversa transferida para humano');

  try {
    const accessToken = decrypt(waAccount.accessTokenEncrypted, env.ENCRYPTION_KEY);
    const waClient = createWaClient({ phoneNumberId: waAccount.phoneNumberId, accessToken });
    await waClient.sendText(
      contact.phoneE164,
      'Vou transferir você para um de nossos atendentes. Em instantes alguém irá te ajudar! 🙌',
    );
  } catch (err) {
    // Não-crítico: a transferência já ocorreu no DB. Mas loga pra debug.
    log.warn(
      { conversationId, workspaceId, err: String(err) },
      'mensagem-ponte de handoff falhou — handoff em DB já registrado',
    );
  }
}

async function sendFallbackMessage(
  waAccount: { phoneNumberId: string; accessTokenEncrypted: string },
  contact: { id: string; phoneE164: string },
  workspaceId: string,
  conversationId: string,
): Promise<void> {
  try {
    const accessToken = decrypt(waAccount.accessTokenEncrypted, env.ENCRYPTION_KEY);
    const waClient = createWaClient({ phoneNumberId: waAccount.phoneNumberId, accessToken });
    const fallbackText = 'Olá! Recebemos sua mensagem e em breve um atendente irá te responder. 😊';
    const msg = await waClient.sendText(contact.phoneE164, fallbackText);
    const waId = msg.messages[0]?.id;
    await prisma.message.create({
      data: {
        workspaceId,
        conversationId,
        contactId: contact.id,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        content: { text: fallbackText },
        status: MessageStatus.SENT,
        fromAi: false,
        ...(waId ? { whatsappMessageId: waId } : {}),
      },
    });
  } catch (err) {
    log.error({ workspaceId, conversationId, err: String(err) }, 'fallback message falhou');
  }
}

async function sendText(
  waAccount: { phoneNumberId: string; accessTokenEncrypted: string },
  phoneE164: string,
  workspaceId: string,
  conversationId: string,
  text: string,
): Promise<void> {
  try {
    const accessToken = decrypt(waAccount.accessTokenEncrypted, env.ENCRYPTION_KEY);
    const waClient = createWaClient({ phoneNumberId: waAccount.phoneNumberId, accessToken });
    const msg = await waClient.sendText(phoneE164, text);
    const contact = await prisma.contact.findFirst({ where: { phoneE164, workspaceId } });
    if (contact) {
      const waId = msg.messages[0]?.id;
      await prisma.message.create({
        data: {
          workspaceId,
          conversationId,
          contactId: contact.id,
          direction: MessageDirection.OUTBOUND,
          type: MessageType.TEXT,
          content: { text },
          status: MessageStatus.SENT,
          fromAi: true,
          ...(waId ? { whatsappMessageId: waId } : {}),
        },
      });
    }
  } catch (err) {
    log.error({ err: String(err) }, 'sendText falhou');
  }
}

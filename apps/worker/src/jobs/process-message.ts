import {
  prisma,
  ConversationStatus,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '@zapai/db';
import { createLogger, decrypt } from '@zapai/shared';
import { createWaClient, splitText, isWithin24hWindow, type WaTemplateComponent } from '@zapai/wa';
import {
  classifyMessage,
  searchKnowledge,
  runAgent,
  type AgentToolDeps,
  type VerticalToolDeps,
} from '@zapai/ai';
import { env } from '../env';

const log = createLogger('worker:process-message');

export interface ProcessMessageJob {
  workspaceId: string;
  messageId: string;
  conversationId: string;
  contactId: string;
}

/** Rate limit simples em memória — evita spam de IA por contato. */
const contactCooldown = new Map<string, number>();
const COOLDOWN_MS = 2_000;

export async function processMessage(data: ProcessMessageJob): Promise<void> {
  const { workspaceId, messageId, conversationId, contactId } = data;

  // Cooldown por contato (evita race se Meta re-entregar)
  const lastTs = contactCooldown.get(contactId) ?? 0;
  if (Date.now() - lastTs < COOLDOWN_MS) {
    log.info({ contactId }, 'cooldown ativo — ignorando duplicata');
    return;
  }
  contactCooldown.set(contactId, Date.now());

  // ─── 1. Carregar contexto ─────────────────────────────────────────────────
  const [message, conversation, contact, workspaceRaw] = await Promise.all([
    prisma.message.findUnique({ where: { id: messageId } }),
    prisma.conversation.findUnique({ where: { id: conversationId } }),
    prisma.contact.findUnique({ where: { id: contactId } }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
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

  // ─── 2. Guards ───────────────────────────────────────────────────────────
  if (conversation.status === ConversationStatus.HUMAN_HANDLING) {
    log.info({ conversationId }, 'human handling — IA não responde');
    return;
  }
  if (conversation.status === ConversationStatus.CLOSED) {
    log.info({ conversationId }, 'conversa fechada — ignorando');
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
    await sendFallbackMessage(waAccount, contact.phoneE164, workspaceId, conversationId);
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
  const lastIncoming = conversation.lastIncomingMessageAt ?? new Date();
  const within24h = isWithin24hWindow(lastIncoming);
  if (!within24h) {
    log.info({ conversationId }, 'fora da janela 24h — enviando template de reengajamento');
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

  // ─── 7. RAG ──────────────────────────────────────────────────────────────
  const ragChunks = await searchKnowledge(workspaceId, inboundText, 4).catch(() => []);

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
    // Tools de vertical são opcionais — workspace precisa configurar cada uma.
    // Em fase futura: cada vertical tool buscará dados do DB do workspace.
  };

  // ─── 10. Rodar agente ────────────────────────────────────────────────────
  const result = await runAgent({
    systemPrompt: agentVersion.systemPrompt,
    vertical: agent.vertical,
    messageHistory,
    inboundText,
    ragChunks,
    globalDeps,
    verticalDeps,
    maxSteps: 5,
  });

  if (result.handedOff) {
    log.info({ conversationId }, 'agente transferiu para humano');
    return;
  }

  if (!result.text.trim()) {
    log.warn({ conversationId }, 'agente retornou texto vazio');
    return;
  }

  // ─── 11. Enviar resposta (chunks de 1024 chars) ──────────────────────────
  const chunks = splitText(result.text, { maxLen: 1024 });
  const outboundMsgIds: string[] = [];

  for (const chunk of chunks) {
    try {
      const sent = await waClient.sendText(contact.phoneE164, chunk);
      outboundMsgIds.push(sent.messages[0]?.id ?? '');
    } catch (err) {
      log.error({ err: String(err) }, 'falha ao enviar chunk via WA');
      break;
    }
  }

  // ─── 12. Persistir mensagens outbound ────────────────────────────────────
  for (let i = 0; i < chunks.length; i++) {
    const waId = outboundMsgIds[i] || undefined;
    await prisma.message.create({
      data: {
        workspaceId,
        conversationId,
        contactId,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        content: { text: chunks[i] ?? '' },
        status: MessageStatus.SENT,
        fromAi: true,
        toolsUsed: i === 0 ? result.toolsUsed : [],
        tokensIn: i === 0 ? result.tokensIn : 0,
        tokensOut: i === 0 ? result.tokensOut : 0,
        ...(waId ? { whatsappMessageId: waId } : {}),
      },
    });
  }

  // ─── 13. Registro de uso ─────────────────────────────────────────────────
  if (result.tokensIn > 0 || result.tokensOut > 0) {
    await prisma.usageRecord.create({
      data: {
        workspaceId,
        kind: 'ai_message',
        quantity: 1,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      },
    });
  }

  log.info(
    {
      conversationId,
      chunks: chunks.length,
      toolsUsed: result.toolsUsed,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
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
    await waClient.sendText(contact.phoneE164, 'Vou transferir você para um de nossos atendentes. Em instantes alguém irá te ajudar! 🙌');
  } catch {
    // Não-crítico: a transferência já ocorreu no DB
  }
}

async function sendFallbackMessage(
  waAccount: { phoneNumberId: string; accessTokenEncrypted: string },
  phoneE164: string,
  workspaceId: string,
  conversationId: string,
): Promise<void> {
  try {
    const accessToken = decrypt(waAccount.accessTokenEncrypted, env.ENCRYPTION_KEY);
    const waClient = createWaClient({ phoneNumberId: waAccount.phoneNumberId, accessToken });
    const fallbackText = 'Olá! Recebemos sua mensagem e em breve um atendente irá te responder. 😊';
    const msg = await waClient.sendText(phoneE164, fallbackText);
    const cId = (await prisma.contact.findFirst({ where: { phoneE164, workspaceId } }))?.id ?? '';
    const waId = msg.messages[0]?.id;
    await prisma.message.create({
      data: {
        workspaceId,
        conversationId,
        contactId: cId,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        content: { text: fallbackText },
        status: MessageStatus.SENT,
        fromAi: false,
        ...(waId ? { whatsappMessageId: waId } : {}),
      },
    });
  } catch (err) {
    log.error({ err: String(err) }, 'fallback message falhou');
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

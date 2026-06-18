'use server';

import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  ForgeStatus,
  ForgePhase as DbForgePhase,
  prisma,
  type Prisma,
} from '@zapfy/db';
import {
  forgeAnswersSchema,
  forgeMessageSchema,
  runForgeStep,
  buildForgeBasics,
  VERTICAL_IDS,
  type ForgePhaseId,
  type ForgeState,
  type ForgeAnswers,
  type ForgeMessage,
} from '@zapfy/ai';
import { createLogger } from '@zapfy/shared';

import { auth } from '@/lib/auth';
import { enforceDeviceVerified } from '@/lib/device-verification';
import {
  publishAgentVersionIo,
  scrapeUrlForForge,
  suggestToolsForVerticalIo,
} from '@/lib/forge/io';
import { z } from 'zod';

const log = createLogger('forge-actions');

async function requireSessionAndWorkspace() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  await enforceDeviceVerified({ userId: session.user.id, sessionToken: session.session.token });
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  return { user: session.user, workspace: member.workspace };
}

/** Cria nova ForgeSession no DB e retorna sessionId. */
export async function startForgeSession(): Promise<{ sessionId: string }> {
  const { user, workspace } = await requireSessionAndWorkspace();

  const session = await prisma.forgeSession.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      status: ForgeStatus.IN_PROGRESS,
      currentPhase: DbForgePhase.DISCOVERY,
      transcript: [],
      collectedAnswers: {},
    },
  });

  log.info(
    { sessionId: session.id, workspaceId: workspace.id, userId: user.id },
    'forge session created',
  );

  revalidatePath('/forge');
  return { sessionId: session.id };
}

/** Carrega state da última ForgeSession do workspace (ou cria nova se não houver). */
export async function loadCurrentForgeSession(): Promise<ForgeState> {
  const { workspace } = await requireSessionAndWorkspace();

  let session = await prisma.forgeSession.findFirst({
    where: { workspaceId: workspace.id, status: ForgeStatus.IN_PROGRESS },
    orderBy: { updatedAt: 'desc' },
  });

  if (!session) {
    const sessionData = await prisma.forgeSession.create({
      data: {
        workspaceId: workspace.id,
        status: ForgeStatus.IN_PROGRESS,
        currentPhase: DbForgePhase.DISCOVERY,
        transcript: [],
        collectedAnswers: {},
      },
    });
    session = sessionData;
  }

  return hydrateState(session);
}

const sendMessageInput = z.object({
  sessionId: z.string(),
  userMessage: z.string().trim().min(1).max(4000),
});

export type SendMessageResult =
  | {
      status: 'ok';
      state: ForgeState;
      assistantMessage: string;
      toolCallsExecuted: Array<{ name: string; argsPreview: string }>;
      phaseChanged: boolean;
    }
  | { status: 'error'; error: string };

/** Envia uma mensagem do user e roda runForgeStep. Persiste estado novo. */
export async function sendForgeMessage(
  raw: z.infer<typeof sendMessageInput>,
): Promise<SendMessageResult> {
  const parsed = sendMessageInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Entrada inválida' };
  }
  const { user, workspace } = await requireSessionAndWorkspace();

  const sessionRow = await prisma.forgeSession.findFirst({
    where: { id: parsed.data.sessionId, workspaceId: workspace.id },
  });
  if (!sessionRow) {
    return { status: 'error', error: 'Sessão não encontrada nesse workspace.' };
  }
  if (sessionRow.status !== ForgeStatus.IN_PROGRESS) {
    return { status: 'error', error: 'Sessão já encerrada.' };
  }

  const state = hydrateState(sessionRow);

  let result: Awaited<ReturnType<typeof runForgeStep>>;
  try {
    result = await runForgeStep({
      state,
      userMessage: parsed.data.userMessage,
      io: {
        scrapeUrl: scrapeUrlForForge,
        suggestToolsForVertical: suggestToolsForVerticalIo,
        publishAgentVersion: (input) =>
          publishAgentVersionIo(workspace.id, sessionRow.id, user.id, input),
      },
    });
  } catch (err) {
    // Detalhe fica no log; usuário final de SaaS recebe mensagem genérica
    // (instruir cliente a "verificar .env" era vazamento de erro interno).
    log.error(
      { sessionId: sessionRow.id, err: String(err) },
      'runForgeStep failed',
    );
    return {
      status: 'error',
      error: 'Tive um problema ao processar sua mensagem. Tenta de novo em instantes.',
    };
  }

  // Persiste estado novo
  const transcriptJson = result.newState.transcript as unknown as Prisma.InputJsonValue;
  const answersJson = result.newState.answers as unknown as Prisma.InputJsonValue;

  // Marca sessão como PUBLISHED se chegou em PUBLISH e gerou agente
  const finalStatus =
    result.newState.currentPhase === 'PUBLISH' && result.toolCallsExecuted.some((t) => t.name === 'publish_agent_version')
      ? ForgeStatus.PUBLISHED
      : ForgeStatus.IN_PROGRESS;

  // Lock otimista: o update só aplica se a sessão não mudou desde a leitura
  // (duas abas/double-submit rodavam o LLM em paralelo e o segundo update
  // sobrescrevia o turno inteiro do primeiro — e podia publicar 2x).
  const updated = await prisma.forgeSession.updateMany({
    where: { id: sessionRow.id, updatedAt: sessionRow.updatedAt },
    data: {
      transcript: transcriptJson,
      collectedAnswers: answersJson,
      currentPhase: result.newState.currentPhase as DbForgePhase,
      status: finalStatus,
    },
  });
  if (updated.count === 0) {
    log.warn({ sessionId: sessionRow.id }, 'update concorrente na sessão — turno descartado');
    return {
      status: 'error',
      error: 'Outra mensagem foi processada ao mesmo tempo. Recarrega a página e tenta de novo.',
    };
  }

  // NÃO revalidar '/forge': o cliente já aplica result.state direto, e a página
  // é force-dynamic (rehidrata sozinha no próximo load). Revalidar aqui só
  // forçava um re-render do servidor no meio da transição = lag à toa.
  // '/dashboard' fica, pra refletir agente publicado quando o usuário navegar.
  revalidatePath('/dashboard');

  return {
    status: 'ok',
    state: result.newState,
    assistantMessage: result.assistantMessage,
    toolCallsExecuted: result.toolCallsExecuted,
    phaseChanged: result.phaseChanged,
  };
}

const resetInput = z.string().trim().min(1).max(64);

/** Marca a sessão atual como abandonada e cria nova (reset). */
export async function resetForgeSession(currentSessionId: string): Promise<{ sessionId: string }> {
  const parsedId = resetInput.safeParse(currentSessionId);
  if (!parsedId.success) {
    // Sem id válido não há o que abandonar — só abre sessão nova.
    return startForgeSession();
  }
  const { workspace } = await requireSessionAndWorkspace();
  await prisma.forgeSession.updateMany({
    where: { id: parsedId.data, workspaceId: workspace.id },
    data: { status: ForgeStatus.ABANDONED },
  });
  return startForgeSession();
}

const saveBasicsInput = z.object({
  sessionId: z.string(),
  brandName: z.string().trim().min(1).max(80),
  vertical: z.enum(VERTICAL_IDS),
  personaStyle: z.enum(['human', 'assistant']),
  goals: z.array(z.string().trim().min(1)).min(1).max(8),
});

/**
 * Grava os 4 passos guiados (wizard) SEM chamar IA: monta o patch de answers,
 * semeia a 1ª mensagem do assistente e move a sessão pra KNOWLEDGE (onde o chat
 * conversacional assume).
 */
export async function saveForgeBasics(
  raw: z.infer<typeof saveBasicsInput>,
): Promise<SendMessageResult> {
  const parsed = saveBasicsInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { workspace } = await requireSessionAndWorkspace();

  const sessionRow = await prisma.forgeSession.findFirst({
    where: { id: parsed.data.sessionId, workspaceId: workspace.id },
  });
  if (!sessionRow) {
    return { status: 'error', error: 'Sessão não encontrada nesse workspace.' };
  }
  if (sessionRow.status !== ForgeStatus.IN_PROGRESS) {
    return { status: 'error', error: 'Sessão já encerrada.' };
  }

  // Guard de fase: o wizard só grava em sessão recém-criada (DISCOVERY, sem
  // transcript). Aba velha/double-submit re-aplicava o patch e REBOBINAVA uma
  // sessão que já estava em REVIEW de volta pra KNOWLEDGE.
  const priorTranscript = Array.isArray(sessionRow.transcript) ? sessionRow.transcript : [];
  if (sessionRow.currentPhase !== DbForgePhase.DISCOVERY || priorTranscript.length > 0) {
    return {
      status: 'error',
      error: 'Essa sessão já passou dos passos iniciais. Recarrega a página pra continuar no chat.',
    };
  }

  const state = hydrateState(sessionRow);
  const { answers: patch, openingMessage } = buildForgeBasics({
    brandName: parsed.data.brandName,
    vertical: parsed.data.vertical,
    personaStyle: parsed.data.personaStyle,
    goals: parsed.data.goals,
  });

  const mergedAnswers: ForgeAnswers = {
    ...state.answers,
    ...patch,
    business: { ...state.answers.business, ...patch.business },
  };

  const assistantMsg: ForgeMessage = {
    id: randomUUID(),
    role: 'assistant',
    content: openingMessage,
    createdAt: new Date().toISOString(),
  };
  const newTranscript = [...state.transcript, assistantMsg];

  await prisma.forgeSession.update({
    where: { id: sessionRow.id },
    data: {
      collectedAnswers: mergedAnswers as unknown as Prisma.InputJsonValue,
      transcript: newTranscript as unknown as Prisma.InputJsonValue,
      currentPhase: DbForgePhase.KNOWLEDGE,
    },
  });

  revalidatePath('/dashboard');

  const newState: ForgeState = {
    sessionId: state.sessionId,
    workspaceId: state.workspaceId,
    currentPhase: 'KNOWLEDGE',
    answers: mergedAnswers,
    transcript: newTranscript,
  };

  return {
    status: 'ok',
    state: newState,
    assistantMessage: openingMessage,
    toolCallsExecuted: [],
    phaseChanged: true,
  };
}

// =========================================
// helpers
// =========================================

function hydrateState(session: {
  id: string;
  workspaceId: string;
  currentPhase: DbForgePhase;
  transcript: Prisma.JsonValue;
  collectedAnswers: Prisma.JsonValue;
}): ForgeState {
  const rawTranscript = Array.isArray(session.transcript) ? session.transcript : [];
  const transcript: ForgeMessage[] = [];
  for (const m of rawTranscript) {
    const parsed = forgeMessageSchema.safeParse(m);
    if (parsed.success) {
      transcript.push(parsed.data);
    } else {
      log.error(
        { sessionId: session.id, issues: parsed.error.issues.slice(0, 3) },
        'mensagem inválida no transcript — dropada (dado legado/schema mudou?)',
      );
    }
  }

  const answersResult = forgeAnswersSchema.safeParse(session.collectedAnswers ?? {});
  if (!answersResult.success) {
    // Degradar pra {} re-pergunta tudo do zero — não pode ser silencioso.
    log.error(
      { sessionId: session.id, issues: answersResult.error.issues.slice(0, 3) },
      'collectedAnswers inválido — sessão degradada pra answers vazios',
    );
  }
  const answers: ForgeAnswers = answersResult.success ? answersResult.data : forgeAnswersSchema.parse({});

  return {
    sessionId: session.id,
    workspaceId: session.workspaceId,
    currentPhase: session.currentPhase as ForgePhaseId,
    transcript,
    answers,
  };
}

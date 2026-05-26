'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  ForgeStatus,
  ForgePhase as DbForgePhase,
  prisma,
  type Prisma,
} from '@zapai/db';
import {
  forgeAnswersSchema,
  forgeMessageSchema,
  runForgeStep,
  type ForgePhaseId,
  type ForgeState,
  type ForgeAnswers,
  type ForgeMessage,
} from '@zapai/ai';
import { createLogger } from '@zapai/shared';

import { auth } from '@/lib/auth';
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
    log.error(
      { sessionId: sessionRow.id, err: String(err) },
      'runForgeStep failed',
    );
    const msg = err instanceof Error ? err.message : 'Erro inesperado no Forge';
    return {
      status: 'error',
      error: `${msg}. Verifique sua chave de API (OPENAI_API_KEY ou ANTHROPIC_API_KEY) no .env.`,
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

  await prisma.forgeSession.update({
    where: { id: sessionRow.id },
    data: {
      transcript: transcriptJson,
      collectedAnswers: answersJson,
      currentPhase: result.newState.currentPhase as DbForgePhase,
      status: finalStatus,
    },
  });

  revalidatePath('/forge');
  revalidatePath('/dashboard');

  return {
    status: 'ok',
    state: result.newState,
    assistantMessage: result.assistantMessage,
    toolCallsExecuted: result.toolCallsExecuted,
    phaseChanged: result.phaseChanged,
  };
}

/** Marca a sessão atual como abandonada e cria nova (reset). */
export async function resetForgeSession(currentSessionId: string): Promise<{ sessionId: string }> {
  const { workspace } = await requireSessionAndWorkspace();
  await prisma.forgeSession.updateMany({
    where: { id: currentSessionId, workspaceId: workspace.id },
    data: { status: ForgeStatus.ABANDONED },
  });
  return startForgeSession();
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
    if (parsed.success) transcript.push(parsed.data);
  }

  const answersResult = forgeAnswersSchema.safeParse(session.collectedAnswers ?? {});
  const answers: ForgeAnswers = answersResult.success ? answersResult.data : forgeAnswersSchema.parse({});

  return {
    sessionId: session.id,
    workspaceId: session.workspaceId,
    currentPhase: session.currentPhase as ForgePhaseId,
    transcript,
    answers,
  };
}

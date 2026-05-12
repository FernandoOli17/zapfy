import 'server-only';

import { prisma, Prisma, Vertical } from '@zapai/db';
import {
  GLOBAL_AGENT_TOOLS,
  VERTICAL_TOOL_CATALOG,
  type ForgeAnswers,
  type VerticalId,
} from '@zapai/ai';
import { createLogger } from '@zapai/shared';

const log = createLogger('forge-io');

/** Fetch leve de uma URL pública, extrai title + texto-corpo resumido. */
export async function scrapeUrlForForge(url: string): Promise<{ title: string; excerpt: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': 'ZapAI-Forge/1.0 (+https://zapai.dev)',
        accept: 'text/html,application/xhtml+xml',
      },
      // Limita tempo de espera. Cloud API timeout < 30s; aqui usamos AbortController curto.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { title: url, excerpt: `(falha ao buscar ${url}: HTTP ${res.status})` };
    }
    const html = await res.text();
    const title =
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? new URL(url).hostname;

    // Tira script/style, depois pega texto entre tags
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const excerpt = cleaned.slice(0, 1500) + (cleaned.length > 1500 ? '…' : '');

    return { title: title.slice(0, 200), excerpt };
  } catch (err) {
    log.warn({ url, err: String(err) }, 'scrape_url failed');
    return { title: url, excerpt: `(não foi possível extrair ${url})` };
  }
}

/** Catálogo de tools sugeridas por vertical + globais. */
export async function suggestToolsForVerticalIo(
  vertical: string,
): Promise<Array<{ name: string; description: string; recommendedActive: boolean }>> {
  const verticalSpecific = VERTICAL_TOOL_CATALOG[vertical] ?? VERTICAL_TOOL_CATALOG['OTHER'] ?? [];
  const globals = GLOBAL_AGENT_TOOLS.map((t) => ({ ...t, recommendedActive: true }));
  return [...globals, ...verticalSpecific];
}

const VERTICAL_TO_PRISMA: Record<VerticalId, Vertical> = {
  ECOMMERCE: Vertical.ECOMMERCE,
  CLINIC: Vertical.CLINIC,
  RESTAURANT: Vertical.RESTAURANT,
  INFOPRODUCT: Vertical.INFOPRODUCT,
  SERVICE: Vertical.SERVICE,
  OTHER: Vertical.OTHER,
};

/** Persiste o Agent + AgentVersion no DB. Cria Agent se não existir. */
export async function publishAgentVersionIo(
  workspaceId: string,
  forgeSessionId: string,
  userId: string | null,
  input: { agentName: string; answers: ForgeAnswers; systemPrompt: string },
): Promise<{ agentId: string; versionNumber: number }> {
  const { agentName, answers, systemPrompt } = input;
  const vertical: Vertical =
    VERTICAL_TO_PRISMA[answers.vertical ?? 'OTHER'] ?? Vertical.OTHER;

  return prisma.$transaction(async (tx) => {
    // Procura agent existente no workspace com mesmo nome (1 agente por workspace no MVP)
    let agent = await tx.agent.findFirst({
      where: { workspaceId, name: agentName },
    });
    if (!agent) {
      agent = await tx.agent.create({
        data: {
          workspaceId,
          name: agentName,
          vertical,
        },
      });
    } else if (agent.vertical !== vertical) {
      agent = await tx.agent.update({
        where: { id: agent.id },
        data: { vertical },
      });
    }

    const last = await tx.agentVersion.findFirst({
      where: { agentId: agent.id },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;

    const version = await tx.agentVersion.create({
      data: {
        agentId: agent.id,
        versionNumber,
        systemPrompt,
        personality: (answers.tone ?? {}) as Prisma.InputJsonValue,
        toolsEnabled: answers.tools ?? [],
        handoffRules: (answers.handoff ?? {}) as Prisma.InputJsonValue,
        businessHours: Prisma.JsonNull,
        changeNotes:
          versionNumber === 1 ? 'Versão inicial publicada via Forge' : 'Refinamento via Forge',
        ...(userId ? { createdByUserId: userId } : {}),
        forgeSessionId,
      },
    });

    await tx.agent.update({
      where: { id: agent.id },
      data: { currentVersionId: version.id },
    });

    return { agentId: agent.id, versionNumber };
  });
}

import 'server-only';

import { prisma, Prisma, Vertical } from '@zapfy/db';
import {
  GLOBAL_AGENT_TOOLS,
  VERTICAL_TOOL_CATALOG,
  type ForgeAnswers,
  type VerticalId,
} from '@zapfy/ai';
import { createLogger, assertSafeUrl, SsrfError } from '@zapfy/shared';

import { dispatchOutgoingEvent } from '@/lib/webhooks-outgoing';

const log = createLogger('forge-io');

export type ScrapeResult =
  | { ok: true; title: string; excerpt: string }
  | { ok: false; reason: 'ssrf' | 'redirect' | 'http' | 'fetch' | 'empty'; message: string };

/**
 * Fetch leve de uma URL pública, extrai title + texto-corpo resumido.
 *
 * Retorna `Result` tipado em vez de string-com-erro — assim o caller não
 * acaba indexando "(URL bloqueada por segurança: ...)" como se fosse
 * conteúdo legítimo de knowledge base.
 */
export async function scrapeUrlForForge(url: string): Promise<ScrapeResult> {
  // SSRF guard antes de qualquer fetch externo.
  let safe: URL;
  try {
    safe = await assertSafeUrl(url);
  } catch (err) {
    const msg = err instanceof SsrfError ? err.message : String(err);
    log.warn({ url, err: msg }, 'scrape_url bloqueado por SSRF guard');
    return { ok: false, reason: 'ssrf', message: msg };
  }

  try {
    const res = await fetch(safe.href, {
      headers: {
        'user-agent': 'Trato-Forge/1.0 (+https://trato.dev)',
        accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'manual',
    });
    if (res.status >= 300 && res.status < 400) {
      return { ok: false, reason: 'redirect', message: `Redirect HTTP ${res.status} bloqueado` };
    }
    if (!res.ok) {
      return { ok: false, reason: 'http', message: `HTTP ${res.status}` };
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

    if (cleaned.length === 0) {
      return { ok: false, reason: 'empty', message: 'Conteúdo extraído vazio' };
    }

    const excerpt = cleaned.slice(0, 1500) + (cleaned.length > 1500 ? '…' : '');

    return { ok: true, title: title.slice(0, 200), excerpt };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ url, err: msg }, 'scrape_url failed');
    return { ok: false, reason: 'fetch', message: msg };
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
      include: { currentVersion: true },
    });
    if (!agent) {
      agent = await tx.agent.create({
        data: {
          workspaceId,
          name: agentName,
          vertical,
        },
        include: { currentVersion: true },
      });
    } else if (agent.vertical !== vertical) {
      agent = await tx.agent.update({
        where: { id: agent.id },
        data: { vertical },
        include: { currentVersion: true },
      });
    }

    const last = await tx.agentVersion.findFirst({
      where: { agentId: agent.id },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;

    // Preserva customizações do dev mode (flowGraph, customToolNames) que
    // já existem na versão atual — Forge não deve destruí-las ao re-publicar.
    // Usuário pode reset pelo /developer se quiser voltar ao default.
    const preservedFlowGraph = agent.currentVersion?.flowGraph ?? null;
    const preservedCustomTools = agent.currentVersion?.customToolNames ?? [];

    const version = await tx.agentVersion.create({
      data: {
        agentId: agent.id,
        versionNumber,
        systemPrompt,
        personality: (answers.tone ?? {}) as Prisma.InputJsonValue,
        toolsEnabled: answers.tools ?? [],
        handoffRules: (answers.handoff ?? {}) as Prisma.InputJsonValue,
        businessHours: Prisma.JsonNull,
        ...(preservedFlowGraph
          ? { flowGraph: preservedFlowGraph as Prisma.InputJsonValue }
          : {}),
        customToolNames: preservedCustomTools,
        changeNotes:
          versionNumber === 1
            ? 'Versão inicial publicada via Forge'
            : preservedFlowGraph
              ? 'Refinamento via Forge (flowGraph customizado preservado)'
              : 'Refinamento via Forge',
        ...(userId ? { createdByUserId: userId } : {}),
        forgeSessionId,
      },
    });

    await tx.agent.update({
      where: { id: agent.id },
      data: { currentVersionId: version.id },
    });

    // Dispatch outside the tx callback (best-effort) via setImmediate
    void dispatchOutgoingEvent(workspaceId, 'agent.published', {
      agentId: agent.id,
      agentName,
      versionNumber,
      vertical,
      forgeSessionId,
      ...(userId ? { publishedByUserId: userId } : {}),
    });

    return { agentId: agent.id, versionNumber };
  });
}

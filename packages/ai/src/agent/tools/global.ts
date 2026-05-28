import { tool, type Tool } from 'ai';
import { z } from 'zod';
import type { RagChunk } from '../rag';

/** Callbacks injetados pelo worker — mantém packages/ai sem dep em @zapfy/wa */
export interface AgentToolDeps {
  workspaceId: string;
  contactId: string;
  conversationId: string;
  searchKnowledge: (query: string) => Promise<RagChunk[]>;
  setContactField: (field: string, value: string) => Promise<void>;
  transferToHuman: (reason: string) => Promise<void>;
  sendTemplate: (templateName: string, languageCode: string, components: unknown[]) => Promise<void>;
}

export function buildGlobalTools(deps: AgentToolDeps): Record<string, Tool> {
  return {
    search_knowledge: tool({
      description:
        'Busca na base de conhecimento do workspace informações relevantes para responder o cliente. Use quando não tiver certeza de uma resposta.',
      inputSchema: z.object({
        query: z.string().describe('Termos de busca em linguagem natural.'),
      }),
      execute: async ({ query }) => {
        const chunks = await deps.searchKnowledge(query);
        if (chunks.length === 0) return { found: false, results: [] };
        return {
          found: true,
          results: chunks.map((c) => ({ title: c.title, content: c.content })),
        };
      },
    }),

    transfer_to_human: tool({
      description:
        'Transfere a conversa para um atendente humano. Use quando: o cliente pedir explicitamente, houver reclamação grave, dúvida fora do escopo, ou decisão de alto valor.',
      inputSchema: z.object({
        reason: z
          .string()
          .describe('Motivo da transferência em até 2 frases, para o atendente entender o contexto.'),
      }),
      execute: async ({ reason }) => {
        await deps.transferToHuman(reason);
        return { transferred: true };
      },
    }),

    set_contact_field: tool({
      description:
        'Salva uma informação do cliente no CRM (nome, e-mail, CPF, empresa, etc).',
      inputSchema: z.object({
        field: z
          .enum(['name', 'email', 'cpf', 'company', 'note'])
          .describe('Campo a salvar.'),
        value: z.string().describe('Valor do campo.'),
      }),
      execute: async ({ field, value }) => {
        await deps.setContactField(field, value);
        return { saved: true };
      },
    }),

    send_template: tool({
      description:
        'Envia uma mensagem de template HSM (template aprovado pela Meta). Use SOMENTE quando a janela de 24h estiver expirada ou para confirmações formais.',
      inputSchema: z.object({
        templateName: z.string().describe('Nome do template aprovado na Meta.'),
        languageCode: z.string().default('pt_BR').describe('Código de idioma (pt_BR, en_US...).'),
        bodyParams: z
          .array(z.string())
          .default([])
          .describe('Parâmetros do corpo do template em ordem.'),
      }),
      execute: async ({ templateName, languageCode, bodyParams }) => {
        const components =
          bodyParams.length > 0
            ? [
                {
                  type: 'body',
                  parameters: bodyParams.map((p) => ({ type: 'text', text: p })),
                },
              ]
            : [];
        await deps.sendTemplate(templateName, languageCode, components);
        return { sent: true };
      },
    }),
  };
}

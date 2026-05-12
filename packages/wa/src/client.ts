import { WA_API_VERSION, WA_BASE_URL } from './constants';
import { WaApiError } from './errors';
import type {
  WaInteractiveButton,
  WaInteractiveListSection,
  WaSendResult,
  WaTemplateComponent,
} from './types';

export interface WaClientConfig {
  phoneNumberId: string;
  accessToken: string;
  /** Versão da Cloud API. Default v21.0. */
  version?: string;
  /** Timeout em ms por request. Default 15s. */
  timeoutMs?: number;
  /** Hook opcional pra logar requests (sem PII). */
  onRequest?: (info: { method: string; url: string; took: number; status: number }) => void;
}

export type WaClient = ReturnType<typeof createWaClient>;

/**
 * Cria um cliente Meta Cloud API escopado a um phone_number_id + access_token.
 * Toda chamada faz POST `/v{version}/{phoneNumberId}/messages` exceto upload/download de mídia
 * que vão pra `/{mediaId}` ou `/v{version}/media`.
 */
export function createWaClient(config: WaClientConfig) {
  const { phoneNumberId, accessToken } = config;
  const version = config.version ?? WA_API_VERSION;
  const timeoutMs = config.timeoutMs ?? 15_000;
  const baseMessages = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
  const baseMedia = `https://graph.facebook.com/${version}/${phoneNumberId}/media`;

  async function request<T>(input: { url: string; method?: 'POST' | 'GET'; body?: unknown; isForm?: boolean }): Promise<T> {
    const t0 = Date.now();
    const method = input.method ?? 'POST';
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    let body: BodyInit | undefined;
    if (input.body !== undefined) {
      if (input.isForm) {
        body = input.body as FormData;
      } else {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(input.body);
      }
    }

    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    };
    if (body !== undefined) init.body = body;
    const res = await fetch(input.url, init);
    const took = Date.now() - t0;

    config.onRequest?.({ method, url: input.url, took, status: res.status });

    const text = await res.text();
    let json: unknown = undefined;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        /* não-JSON */
      }
    }

    if (!res.ok) {
      const errObj = (json as { error?: { message?: string; code?: number; error_subcode?: number; type?: string; fbtrace_id?: string } } | undefined)
        ?.error;
      throw new WaApiError(res.status, errObj?.message ?? `HTTP ${res.status}`, {
        ...(errObj?.code !== undefined ? { metaCode: errObj.code } : {}),
        ...(errObj?.error_subcode !== undefined ? { metaSubcode: errObj.error_subcode } : {}),
        ...(errObj?.type !== undefined ? { metaType: errObj.type } : {}),
        ...(errObj?.fbtrace_id !== undefined ? { metaTraceId: errObj.fbtrace_id } : {}),
      });
    }

    return json as T;
  }

  function makeSendBody(to: string, payload: Record<string, unknown>) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      ...payload,
    };
  }

  return {
    /** Identidade do cliente (útil pra logs). */
    phoneNumberId,
    version,

    /** Texto simples. previewUrl = true habilita preview de links. */
    async sendText(to: string, body: string, previewUrl = false): Promise<WaSendResult> {
      return request<WaSendResult>({
        url: baseMessages,
        body: makeSendBody(to, {
          type: 'text',
          text: { body, preview_url: previewUrl },
        }),
      });
    },

    /** Imagem via media_id (preferido) ou URL pública. */
    async sendImage(
      to: string,
      ref: { mediaId: string } | { link: string },
      caption?: string,
    ): Promise<WaSendResult> {
      const image: Record<string, unknown> =
        'mediaId' in ref ? { id: ref.mediaId } : { link: ref.link };
      if (caption) image['caption'] = caption;
      return request<WaSendResult>({
        url: baseMessages,
        body: makeSendBody(to, { type: 'image', image }),
      });
    },

    async sendAudio(
      to: string,
      ref: { mediaId: string } | { link: string },
    ): Promise<WaSendResult> {
      const audio: Record<string, unknown> =
        'mediaId' in ref ? { id: ref.mediaId } : { link: ref.link };
      return request<WaSendResult>({
        url: baseMessages,
        body: makeSendBody(to, { type: 'audio', audio }),
      });
    },

    async sendVideo(
      to: string,
      ref: { mediaId: string } | { link: string },
      caption?: string,
    ): Promise<WaSendResult> {
      const video: Record<string, unknown> =
        'mediaId' in ref ? { id: ref.mediaId } : { link: ref.link };
      if (caption) video['caption'] = caption;
      return request<WaSendResult>({
        url: baseMessages,
        body: makeSendBody(to, { type: 'video', video }),
      });
    },

    async sendDocument(
      to: string,
      ref: { mediaId: string } | { link: string },
      options?: { filename?: string; caption?: string },
    ): Promise<WaSendResult> {
      const doc: Record<string, unknown> =
        'mediaId' in ref ? { id: ref.mediaId } : { link: ref.link };
      if (options?.filename) doc['filename'] = options.filename;
      if (options?.caption) doc['caption'] = options.caption;
      return request<WaSendResult>({
        url: baseMessages,
        body: makeSendBody(to, { type: 'document', document: doc }),
      });
    },

    async sendSticker(
      to: string,
      ref: { mediaId: string } | { link: string },
    ): Promise<WaSendResult> {
      const sticker: Record<string, unknown> =
        'mediaId' in ref ? { id: ref.mediaId } : { link: ref.link };
      return request<WaSendResult>({
        url: baseMessages,
        body: makeSendBody(to, { type: 'sticker', sticker }),
      });
    },

    /** Template HSM aprovado pela Meta. components conforme cada template exige. */
    async sendTemplate(
      to: string,
      input: { name: string; language: string; components?: WaTemplateComponent[] },
    ): Promise<WaSendResult> {
      return request<WaSendResult>({
        url: baseMessages,
        body: makeSendBody(to, {
          type: 'template',
          template: {
            name: input.name,
            language: { code: input.language },
            ...(input.components ? { components: input.components } : {}),
          },
        }),
      });
    },

    /** Interactive — botões (até 3). */
    async sendInteractiveButtons(
      to: string,
      input: { body: string; buttons: WaInteractiveButton[]; header?: string; footer?: string },
    ): Promise<WaSendResult> {
      if (input.buttons.length === 0 || input.buttons.length > 3) {
        throw new WaApiError(400, 'Interactive buttons exige 1 a 3 botões');
      }
      const action = {
        buttons: input.buttons.map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      };
      return request<WaSendResult>({
        url: baseMessages,
        body: makeSendBody(to, {
          type: 'interactive',
          interactive: {
            type: 'button',
            ...(input.header ? { header: { type: 'text', text: input.header } } : {}),
            body: { text: input.body },
            ...(input.footer ? { footer: { text: input.footer } } : {}),
            action,
          },
        }),
      });
    },

    /** Interactive — lista de seções com até 10 rows. */
    async sendInteractiveList(
      to: string,
      input: {
        body: string;
        buttonText: string;
        sections: WaInteractiveListSection[];
        header?: string;
        footer?: string;
      },
    ): Promise<WaSendResult> {
      return request<WaSendResult>({
        url: baseMessages,
        body: makeSendBody(to, {
          type: 'interactive',
          interactive: {
            type: 'list',
            ...(input.header ? { header: { type: 'text', text: input.header } } : {}),
            body: { text: input.body },
            ...(input.footer ? { footer: { text: input.footer } } : {}),
            action: {
              button: input.buttonText,
              sections: input.sections,
            },
          },
        }),
      });
    },

    /** Marca mensagem como lida (dois ticks azuis). */
    async markAsRead(messageId: string): Promise<{ success: boolean }> {
      return request<{ success: boolean }>({
        url: baseMessages,
        body: {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
      });
    },

    /**
     * Sobe mídia pra Cloud API. Retorna media_id pra usar em sendImage etc.
     * file: ReadableStream | Buffer | Blob (mais a string mime e filename).
     */
    async uploadMedia(input: {
      file: Blob;
      filename: string;
      mimeType: string;
    }): Promise<{ id: string }> {
      const form = new FormData();
      form.set('messaging_product', 'whatsapp');
      form.set('type', input.mimeType);
      form.set('file', input.file, input.filename);
      return request<{ id: string }>({
        url: baseMedia,
        body: form,
        isForm: true,
      });
    },

    /** Resolve media_id pra URL temporária da CDN da Meta. */
    async getMediaUrl(mediaId: string): Promise<{ url: string; mime_type: string }> {
      return request<{ url: string; mime_type: string }>({
        url: `https://graph.facebook.com/${version}/${mediaId}`,
        method: 'GET',
      });
    },

    /** Baixa o conteúdo da mídia (faz GET na URL temporária). Cuidado: requer Authorization. */
    async downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
      const { url, mime_type } = await this.getMediaUrl(mediaId);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        throw new WaApiError(res.status, `Falha ao baixar mídia ${mediaId}`);
      }
      const ab = await res.arrayBuffer();
      return { buffer: Buffer.from(ab), mimeType: mime_type };
    },

    /** Healthcheck: tenta GET no phone_number_id. Útil pra testar credenciais. */
    async testConnection(): Promise<{ display_phone_number: string; verified_name?: string }> {
      return request<{ display_phone_number: string; verified_name?: string }>({
        url: `https://graph.facebook.com/${version}/${phoneNumberId}?fields=display_phone_number,verified_name`,
        method: 'GET',
      });
    },
  };
}

export { WA_API_VERSION, WA_BASE_URL };

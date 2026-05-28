import { AppError } from '@zapfy/shared';

/**
 * Erros lançados pelo cliente Cloud API. Mantém a hierarquia AppError do shared
 * pra captura nos route handlers / workers ficar consistente.
 */
export class WaApiError extends AppError {
  public readonly metaCode: number | undefined;
  public readonly metaSubcode: number | undefined;
  public readonly metaType: string | undefined;
  public readonly metaTraceId: string | undefined;

  constructor(
    httpStatus: number,
    userMessage: string,
    detail?: {
      metaCode?: number;
      metaSubcode?: number;
      metaType?: string;
      metaTraceId?: string;
    },
    options?: ErrorOptions,
  ) {
    super(`WHATSAPP_${detail?.metaCode ?? httpStatus}`, httpStatus, userMessage, options);
    this.metaCode = detail?.metaCode;
    this.metaSubcode = detail?.metaSubcode;
    this.metaType = detail?.metaType;
    this.metaTraceId = detail?.metaTraceId;
  }
}

export class WaWebhookSignatureError extends AppError {
  constructor(reason: string, options?: ErrorOptions) {
    super('WHATSAPP_WEBHOOK_SIGNATURE', 401, `Assinatura inválida: ${reason}`, options);
  }
}

export class WaWindowExpiredError extends AppError {
  constructor(hoursAgo: number, options?: ErrorOptions) {
    super(
      'WHATSAPP_24H_WINDOW',
      409,
      `Última mensagem do contato foi há ${hoursAgo}h. Use um template HSM aprovado pra reiniciar a conversa.`,
      options,
    );
  }
}

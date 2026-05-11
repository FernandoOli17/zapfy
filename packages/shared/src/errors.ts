/**
 * AppError — base de todos os erros de domínio.
 * Boundaries (rotas, tRPC, jobs) capturam e mapeiam pra HTTP/retry.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly userMessage: string;

  constructor(
    code: string,
    httpStatus: number,
    userMessage: string,
    options?: ErrorOptions,
  ) {
    super(`[${code}] ${userMessage}`, options);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.userMessage = userMessage;
  }
}

export class AuthError extends AppError {
  constructor(userMessage = 'Não autorizado', options?: ErrorOptions) {
    super('AUTH_ERROR', 401, userMessage, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(userMessage = 'Acesso negado', options?: ErrorOptions) {
    super('FORBIDDEN', 403, userMessage, options);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, options?: ErrorOptions) {
    super('NOT_FOUND', 404, `${resource} não encontrado`, options);
  }
}

export class ValidationError extends AppError {
  constructor(userMessage = 'Dados inválidos', options?: ErrorOptions) {
    super('VALIDATION_ERROR', 400, userMessage, options);
  }
}

export class ConflictError extends AppError {
  constructor(userMessage = 'Conflito de estado', options?: ErrorOptions) {
    super('CONFLICT', 409, userMessage, options);
  }
}

export class RateLimitError extends AppError {
  constructor(userMessage = 'Muitas requisições, tente novamente em instantes', options?: ErrorOptions) {
    super('RATE_LIMIT', 429, userMessage, options);
  }
}

export class WhatsAppError extends AppError {
  constructor(code: string, userMessage: string, options?: ErrorOptions) {
    super(`WHATSAPP_${code}`, 502, userMessage, options);
  }
}

export class PlanLimitError extends AppError {
  constructor(feature: string, options?: ErrorOptions) {
    super(
      'PLAN_LIMIT',
      402,
      `Recurso "${feature}" não disponível no seu plano. Faça upgrade pra continuar.`,
      options,
    );
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

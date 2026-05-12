export const WA_API_VERSION = 'v21.0';
export const WA_BASE_URL = `https://graph.facebook.com/${WA_API_VERSION}` as const;

/** Janela de sessão livre da Cloud API. Depois disso, só template HSM. */
export const WA_WINDOW_HOURS = 24;
export const WA_WINDOW_MS = WA_WINDOW_HOURS * 60 * 60 * 1000;

/** Limite oficial de chars por mensagem de texto. */
export const WA_TEXT_MAX_LEN = 4096;
/** Limite "seguro" usado pelo agente IA pra dividir respostas longas em chunks. */
export const WA_TEXT_SAFE_LEN = 1024;

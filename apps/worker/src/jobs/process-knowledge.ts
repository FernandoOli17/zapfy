import { createLogger } from '@zapai/shared';
import { processKnowledgeDocument } from '@zapai/ai';

const log = createLogger('worker:process-knowledge');

export interface ProcessKnowledgeJob {
  workspaceId: string;
  documentId: string;
}

/**
 * Job: chunka + embeda + persiste KnowledgeDocument.
 * Idempotente — pode rodar de novo num doc PROCESSING.
 *
 * Comportamento de retry:
 *   - sucesso → retorna OK, BullMQ marca completed
 *   - erro retriable (Voyage 5xx, timeout, rede) → THROW, BullMQ retenta com backoff
 *     (doc fica em PROCESSING até esgotar tentativas; sweep depois marca ERROR)
 *   - erro permanente (URL inválida, sem conteúdo) → doc já foi marcado ERROR
 *     pelo `processKnowledgeDocument`, retorna sem throw (não retenta)
 */
export async function processKnowledge(data: ProcessKnowledgeJob): Promise<void> {
  const result = await processKnowledgeDocument(data.documentId);

  if (result.status === 'error') {
    if (result.retriable) {
      log.warn(
        { documentId: data.documentId, err: result.errorMessage },
        'process-knowledge falhou (transiente) — vai retentar via BullMQ',
      );
      throw new Error(result.errorMessage ?? 'transient error');
    }
    log.warn(
      { documentId: data.documentId, err: result.errorMessage },
      'process-knowledge falhou (permanente) — doc marcado ERROR',
    );
    return;
  }

  log.info(
    { documentId: data.documentId, chunks: result.chunksCreated, embedded: result.embedded },
    'doc indexado com sucesso',
  );
}

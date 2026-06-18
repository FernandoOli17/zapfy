import { prisma, Prisma } from '@zapfy/db';

/**
 * Numeração pública (PED-0001, ORC-0001) resiliente a concorrência e a deleção.
 *
 * Por que NÃO `count + 1`:
 *  - dois creates simultâneos no mesmo workspace leem o mesmo count e geram o
 *    mesmo número → o segundo viola `@@unique([workspaceId, publicNumber])`;
 *  - pior, deletar QUALQUER registro faz o count cair, então `count + 1` passa
 *    a colidir DETERMINISTICAMENTE com um número que ainda existe — todo pedido
 *    novo falha até o count "alcançar" de novo.
 *
 * `max(publicNumber) + 1` sempre produz um número estritamente maior que todos
 * os existentes, imune à deleção. A corrida que sobra (dois creates pegando o
 * mesmo max ao mesmo tempo) é absorvida pelo retry: capturamos o P2002 e
 * recomputamos o próximo número.
 */

const MAX_ATTEMPTS = 3;

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/**
 * Maior sufixo numérico já usado para `prefix` no workspace, ou 0 se nenhum.
 *
 * NÃO ordena por `publicNumber` (string): a ordenação lexicográfica quebra quando
 * o padding muda de largura (PED-9999 → PED-10000), colocando "10000" ANTES de
 * "9999" e devolvendo um max defasado. Em vez disso lê todos os sufixos do
 * workspace e tira o máximo NUMÉRICO em JS — correto independente da largura.
 * Trade-off: O(n) linhas (só o campo `publicNumber`, indexado). Pro estágio do
 * produto (SMB) é barato; se um workspace passar de dezenas de milhares de
 * pedidos, trocar por `MAX(CAST(substring ...))` via $queryRaw.
 */
async function maxNumber(
  delegate: { findMany: (args: unknown) => Promise<Array<{ publicNumber: string }>> },
  workspaceId: string,
  prefix: string,
): Promise<number> {
  const rows = await delegate.findMany({
    where: { workspaceId, publicNumber: { startsWith: `${prefix}-` } },
    select: { publicNumber: true },
  });
  let max = 0;
  for (const r of rows) {
    const n = Number.parseInt(r.publicNumber.slice(prefix.length + 1), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

function format(prefix: string, n: number): string {
  return `${prefix}-${n.toString().padStart(4, '0')}`;
}

type CreateDelegate = {
  findMany: (args: unknown) => Promise<Array<{ publicNumber: string }>>;
};

/**
 * Gera `${prefix}-NNNN` com `max+1` e executa `create(publicNumber)` com retry
 * em P2002 (até 3 tentativas). Cada tentativa recomputa o número a partir do
 * estado atual do banco, então uma colisão por corrida é resolvida na próxima.
 *
 * `create` recebe o número já formatado e DEVE persistir o registro com esse
 * `publicNumber` — assim o retry tem efeito (número novo a cada tentativa).
 */
export async function createWithRetry<T>(
  prefix: string,
  workspaceId: string,
  create: (publicNumber: string) => Promise<T>,
  delegate: CreateDelegate,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const next = (await maxNumber(delegate, workspaceId, prefix)) + 1 + attempt;
    try {
      return await create(format(prefix, next));
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      lastErr = err;
    }
  }
  throw lastErr;
}

export const orderNumberDelegate = prisma.order as unknown as CreateDelegate;
export const quoteNumberDelegate = prisma.quote as unknown as CreateDelegate;

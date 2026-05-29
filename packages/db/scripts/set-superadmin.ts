/**
 * Promove um user a super-admin pelo email.
 *
 * Uso:
 *   pnpm --filter @zapfy/db exec tsx scripts/set-superadmin.ts <email>
 */
import { prisma } from '../src/index';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: tsx scripts/set-superadmin.ts <email>');
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    console.error('Faça signup primeiro em https://zapfy.store/signup');
    process.exit(2);
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isSuperAdmin: true },
    select: { id: true, email: true, name: true, isSuperAdmin: true },
  });
  console.log('✅ Super-admin ativado:', updated);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

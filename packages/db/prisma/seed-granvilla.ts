/**
 * Seed de demonstração — "Granvilla Pet Shop"
 *
 * Cria um workspace verossímel pra demo com cliente:
 *  - Owner: claudio@granvilla.pet (senha: Granvilla2026!)
 *  - Workspace: Granvilla Pet Shop (vertical=ECOMMERCE)
 *  - Agente IA configurado e publicado
 *  - 1 WhatsApp account (mock, status CONNECTED)
 *  - 50 contatos com tags realistas
 *  - 200 mensagens distribuídas em ~30 conversas
 *  - 12 produtos (ração, brinquedos, banho&tosa, vacinas)
 *  - 3 orders (1 DELIVERED, 1 PREPARING, 1 PENDING)
 *  - 5 appointments (banho/tosa/consulta — passados e futuros)
 *  - 2 cupons ativos
 *  - 8 tags + 3 templates HSM aprovados
 *
 * Idempotente — pode rodar várias vezes sem duplicar.
 *
 * Execução: `pnpm db:seed:granvilla` (script será adicionado em package.json)
 */
import {
  PrismaClient,
  WorkspaceRole,
  Vertical,
  PlanId,
  SubscriptionStatus,
  ConversationStatus,
  MessageDirection,
  MessageType,
  MessageStatus,
  WhatsAppStatus,
  OrderStatus,
  AppointmentStatus,
  CouponDiscountType,
  TemplateCategory,
  TemplateStatus,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { scryptAsync } from '@noble/hashes/scrypt.js';

const prisma = new PrismaClient();

const WORKSPACE_SLUG = 'granvilla-pet-shop';
const OWNER_EMAIL = 'claudio@granvilla.pet';
const OWNER_PASSWORD = 'Granvilla2026!';

/**
 * Better Auth password hashing — DEVE bater 100% com @better-auth/utils/password.
 * Params: N=16384, r=16, p=1, dkLen=64. Format: `${saltHex}:${keyHex}`.
 * NFKC normalization no password é crítica (acentos virariam hash diferente).
 */
async function hashPassword(password: string): Promise<string> {
  const saltBytes = randomBytes(16);
  const salt = Buffer.from(saltBytes).toString('hex'); // 32 chars hex
  const key = await scryptAsync(password.normalize('NFKC'), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  });
  const keyHex = Buffer.from(key).toString('hex');
  return `${salt}:${keyHex}`;
}

/** Determinístico — mesma seed = mesmos dados (mas com aleatoriedade controlada) */
const rng = mulberry32(424242);
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}
function intBetween(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function chance(p: number): boolean {
  return rng() < p;
}
function daysAgo(days: number, jitterMinutes = 30): Date {
  const ms = days * 86_400_000 + intBetween(-jitterMinutes, jitterMinutes) * 60_000;
  return new Date(Date.now() - ms);
}

const FIRST_NAMES = [
  'Mariana', 'João', 'Ana Paula', 'Pedro', 'Beatriz', 'Lucas', 'Camila', 'Rafael',
  'Juliana', 'Felipe', 'Larissa', 'Gustavo', 'Carolina', 'Bruno', 'Fernanda', 'Tiago',
  'Patrícia', 'Marcelo', 'Renata', 'Diego', 'Aline', 'Vinícius', 'Daniela', 'Rodrigo',
  'Tatiane', 'André', 'Vanessa', 'Eduardo', 'Sabrina', 'Henrique',
];
const LAST_NAMES = [
  'Silva', 'Oliveira', 'Souza', 'Santos', 'Pereira', 'Ferreira', 'Rodrigues', 'Almeida',
  'Costa', 'Gomes', 'Martins', 'Araújo', 'Ribeiro', 'Carvalho', 'Lopes', 'Lima',
];
const PET_NAMES = ['Thor', 'Luna', 'Mel', 'Bob', 'Bidu', 'Nina', 'Mia', 'Bento', 'Amora', 'Toby', 'Pipoca', 'Frida', 'Maya', 'Apolo', 'Estrela', 'Belinha'];
const PET_BREEDS = ['Golden', 'Shih Tzu', 'Labrador', 'Poodle', 'Yorkshire', 'Persa', 'SRD', 'Pug', 'Bulldog', 'Maltês'];

const TAGS = ['cliente_fiel', 'banho_quinzenal', 'vacina_atrasada', 'pet_idoso', 'racao_premium', 'desconto_aniversario', 'cachorro', 'gato'];

const PRODUCTS = [
  { name: 'Ração Premium Cachorro Adulto 15kg', sku: 'RPC15', price: 18900, category: 'racao', stock: 24 },
  { name: 'Ração Premium Gato Castrado 7,5kg', sku: 'RPG75', price: 14900, category: 'racao', stock: 18 },
  { name: 'Banho + Tosa (porte pequeno)', sku: 'BT-P', price: 8000, category: 'servico', stock: null },
  { name: 'Banho + Tosa (porte médio)', sku: 'BT-M', price: 11000, category: 'servico', stock: null },
  { name: 'Banho + Tosa (porte grande)', sku: 'BT-G', price: 14000, category: 'servico', stock: null },
  { name: 'Vacina V10 (cães)', sku: 'VAC-V10', price: 9500, category: 'saude', stock: null },
  { name: 'Vacina Antirrábica', sku: 'VAC-AR', price: 6500, category: 'saude', stock: null },
  { name: 'Coleira ajustável (cores variadas)', sku: 'COL-AJ', price: 3500, category: 'acessorio', stock: 40 },
  { name: 'Brinquedo Bola de Borracha', sku: 'BRQ-BB', price: 1900, category: 'brinquedo', stock: 60 },
  { name: 'Areia Higiênica 12kg', sku: 'AR-12', price: 4200, category: 'higiene', stock: 30 },
  { name: 'Petisco Bifinho 500g', sku: 'PET-BF', price: 2800, category: 'petisco', stock: 80 },
  { name: 'Cama Pet Tamanho M', sku: 'CMA-M', price: 12900, category: 'acessorio', stock: 12 },
] as const;

const SAMPLE_MESSAGES_IN = [
  'Oi, vocês tem ração premium pra cachorro idoso?',
  'Bom dia! Quanto tá o banho do shih tzu?',
  'Preciso agendar vacina V10 pro meu cachorro',
  'O Thor tá com sarna, vocês fazem consulta?',
  'Vocês entregam ração no Jardim Botânico?',
  'Tem desconto pra cliente fiel?',
  'A Luna precisa de tosa, qual horário tem amanhã?',
  'Ração da Royal Canin gato castrado, tem em estoque?',
  'Quanto custa banho de cachorro grande?',
  'Posso pagar parcelado?',
  'Vocês têm coleira antipulgas?',
  'Meu gato tá vomitando, é urgente!',
  'Aceita pix?',
  'Posso buscar o Bob daqui a 1 hora?',
  'Quanto fica banho + tosa + corte de unhas?',
];

const SAMPLE_MESSAGES_OUT = [
  'Oi! Temos sim, Pedigree e Premier sênior. Te mando os preços?',
  'Bom dia! Banho de shih tzu: R$ 80. Já incluso secagem e perfume 🐾',
  'Claro! V10 é R$ 95. Qual dia fica melhor pra você?',
  'Atendemos consulta sim. Dr. Marcos faz amanhã 10h ou 14h. Qual prefere?',
  'Sim, entregamos até 5km de raio. Frete grátis acima de R$ 100',
  'Tem sim! Cliente desde 2023 ganha 10% nos serviços. Já cadastrado aqui ✓',
  'Amanhã temos 09h, 11h ou 15h livres pra Luna. Confirma um?',
  'Sim, temos! 7,5kg sai por R$ 149. Posso separar?',
  'Banho cachorro porte grande R$ 140. Inclui secagem completa',
  'Aceitamos! Em até 3x sem juros no cartão ou pix com 5% desconto',
  'Sim! Bravecto ou Simparic. Bravecto sai R$ 145 e dura 12 semanas',
  'Vou já chamar a Dra. Carla. Pode passar agora? Atendemos urgência',
  'Pix, cartão, dinheiro 👍',
  'Tranquilo! O Bob tá pronto, já cobrei a banho-tosa R$ 110',
  'Combo banho+tosa+unhas porte médio: R$ 130. Quer agendar?',
];

async function main() {
  console.info('🌱 Seeding Granvilla Pet Shop demo data…');
  console.info(`   Owner: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);

  // ─── User + workspace ───────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: {
      email: OWNER_EMAIL,
      name: 'Cláudio Granvilla',
      emailVerified: true,
    },
  });

  // Better Auth: password ficaria na tabela Account. Workaround: cria account
  // password manualmente (sobrescreve se existir).
  const passwordHash = await hashPassword(OWNER_PASSWORD);
  await prisma.account.upsert({
    where: {
      providerId_accountId: { providerId: 'credential', accountId: user.id },
    },
    update: { password: passwordHash },
    create: {
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: passwordHash,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: WORKSPACE_SLUG },
    update: { name: 'Granvilla Pet Shop' },
    create: {
      slug: WORKSPACE_SLUG,
      name: 'Granvilla Pet Shop',
    },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: WorkspaceRole.OWNER },
    create: { workspaceId: workspace.id, userId: user.id, role: WorkspaceRole.OWNER },
  });

  // Subscription PRO ativa (demo precisa mostrar features unlocked)
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await prisma.subscription.upsert({
    where: { workspaceId: workspace.id },
    update: { plan: PlanId.PRO, status: SubscriptionStatus.ACTIVE },
    create: {
      workspaceId: workspace.id,
      plan: PlanId.PRO,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  // ─── Agent IA ────────────────────────────────────────────────────────────
  const agentId = `granvilla-agent-${workspace.id}`;
  const agent = await prisma.agent.upsert({
    where: { id: agentId },
    update: { vertical: Vertical.ECOMMERCE },
    create: {
      id: agentId,
      workspaceId: workspace.id,
      name: 'Atendente Granvilla',
      vertical: Vertical.ECOMMERCE,
    },
  });

  const existingVersion = await prisma.agentVersion.findFirst({
    where: { agentId: agent.id, versionNumber: 1 },
  });
  const version =
    existingVersion ??
    (await prisma.agentVersion.create({
      data: {
        agentId: agent.id,
        versionNumber: 1,
        systemPrompt: `Você é a atendente virtual da **Granvilla Pet Shop**, um pet shop carinhoso no Jardim Botânico (RJ).

Sua missão: atender clientes pelo WhatsApp com agilidade e simpatia. Ajude com:
- Agendar banho, tosa, consulta veterinária
- Tirar dúvidas sobre produtos (ração, brinquedos, acessórios)
- Confirmar pedidos e prazos de entrega
- Informar promoções e cuidar de clientes fiéis

Tom: amigável, próximo, com emojis moderados 🐾. Trate cada cliente pelo nome. Quando o pet for citado, lembre o nome dele.

Quando não souber responder ou for reclamação/urgência (gato vomitando, cachorro sangrando), transfira pra um humano IMEDIATAMENTE.

Horário de atendimento: seg-sex 8h-19h, sáb 9h-15h. Domingo fechado.`,
        personality: {
          tone: 'amigável',
          formality: 'informal',
          emoji: 'moderado',
          neverSay: ['vou verificar e te retorno', 'não posso responder isso'],
        },
        toolsEnabled: ['search_knowledge', 'transfer_to_human', 'set_contact_field', 'search_products', 'book_appointment'],
        handoffRules: {
          keywords: ['humano', 'atendente', 'pessoa', 'urgente', 'sangrando', 'engasgando'],
          conditions: ['reclamação', 'urgência médica', 'pedido fora do padrão'],
        },
        businessHours: {
          timezone: 'America/Sao_Paulo',
          mondayToFriday: { start: '08:00', end: '19:00' },
          saturday: { start: '09:00', end: '15:00' },
          sunday: null,
        },
      },
    }));

  await prisma.agent.update({
    where: { id: agent.id },
    data: { currentVersionId: version.id },
  });

  // ─── WhatsApp account (mock CONNECTED) ───────────────────────────────────
  await prisma.whatsAppAccount.upsert({
    where: { phoneNumberId: `granvilla-mock-${workspace.id}` },
    update: { status: WhatsAppStatus.CONNECTED },
    create: {
      workspaceId: workspace.id,
      phoneNumberId: `granvilla-mock-${workspace.id}`,
      businessAccountId: `granvilla-waba-${workspace.id}`,
      displayPhone: '+55 21 99876-5432',
      // Tokens cifrados fake — só pra preencher schema. Real prod requer Meta creds.
      accessTokenEncrypted: 'mock-not-real:0000:0000:00',
      appSecretEncrypted: 'mock-not-real:0000:0000:00',
      webhookVerifyToken: 'granvilla-mock-verify',
      status: WhatsAppStatus.CONNECTED,
      connectedAt: daysAgo(45),
    },
  });

  // ─── Tags ────────────────────────────────────────────────────────────────
  for (const t of TAGS) {
    await prisma.tag.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: t } },
      update: {},
      create: { workspaceId: workspace.id, name: t },
    });
  }

  // ─── Produtos ────────────────────────────────────────────────────────────
  const products: { id: string; name: string; priceCents: number }[] = [];
  for (const p of PRODUCTS) {
    const created = await prisma.product.upsert({
      where: { workspaceId_sku: { workspaceId: workspace.id, sku: p.sku } },
      update: { name: p.name, priceCents: p.price, category: p.category, stock: p.stock },
      create: {
        workspaceId: workspace.id,
        name: p.name,
        sku: p.sku,
        priceCents: p.price,
        category: p.category,
        stock: p.stock,
        active: true,
      },
    });
    products.push({ id: created.id, name: created.name, priceCents: created.priceCents ?? p.price });
  }

  // ─── Coupons ─────────────────────────────────────────────────────────────
  const couponData = [
    { code: 'PETLOVER10', discountType: CouponDiscountType.PERCENT, discountValue: 10, active: true },
    { code: 'PRIMEIRO20', discountType: CouponDiscountType.PERCENT, discountValue: 20, active: true, maxRedemptions: 1 },
  ];
  for (const c of couponData) {
    await prisma.coupon.upsert({
      where: { workspaceId_code: { workspaceId: workspace.id, code: c.code } },
      update: c,
      create: { ...c, workspaceId: workspace.id },
    });
  }

  // ─── Profissionais (banho/tosa/vet) ──────────────────────────────────────
  const proIds: string[] = [];
  for (const p of [
    { name: 'Dra. Carla Mendes', specialty: 'Veterinária — Clínica Geral' },
    { name: 'Bruno (Banho & Tosa)', specialty: 'Tosador Sênior' },
    { name: 'Patrícia (Banho)', specialty: 'Banhista' },
  ]) {
    const created = await prisma.professional.upsert({
      where: { id: `granvilla-pro-${p.name.split(' ')[0]!.toLowerCase()}-${workspace.id}` },
      update: {},
      create: {
        id: `granvilla-pro-${p.name.split(' ')[0]!.toLowerCase()}-${workspace.id}`,
        workspaceId: workspace.id,
        name: p.name,
        specialty: p.specialty,
        active: true,
      },
    });
    proIds.push(created.id);
  }

  // ─── Contatos (50) ───────────────────────────────────────────────────────
  const contacts: { id: string; name: string; phoneE164: string }[] = [];
  for (let i = 0; i < 50; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const last = LAST_NAMES[i % LAST_NAMES.length]!;
    const phoneSuffix = String(900_000_000 + i).slice(0, 9);
    const phone = `5521${phoneSuffix}`;
    const petName = PET_NAMES[i % PET_NAMES.length]!;
    const petBreed = PET_BREEDS[i % PET_BREEDS.length]!;

    // Tags com variabilidade
    const tagSet: string[] = [];
    if (chance(0.4)) tagSet.push('cliente_fiel');
    if (chance(0.3)) tagSet.push('banho_quinzenal');
    if (chance(0.15)) tagSet.push('vacina_atrasada');
    if (chance(0.6)) tagSet.push(chance(0.7) ? 'cachorro' : 'gato');
    if (chance(0.2)) tagSet.push('racao_premium');

    const contact = await prisma.contact.upsert({
      where: { workspaceId_phoneE164: { workspaceId: workspace.id, phoneE164: phone } },
      update: {},
      create: {
        workspaceId: workspace.id,
        phoneE164: phone,
        name: `${first} ${last}`,
        tags: tagSet,
        customFields: {
          pet_name: petName,
          pet_breed: petBreed,
          pet_age: `${intBetween(1, 12)} anos`,
        },
        lastSeenAt: daysAgo(intBetween(0, 60), 60),
        createdAt: daysAgo(intBetween(7, 90)),
      },
    });
    contacts.push({ id: contact.id, name: contact.name ?? phone, phoneE164: phone });
  }

  // ─── Conversas + mensagens (200 msgs / ~30 conversas) ────────────────────
  // 30 contatos têm conversa ativa. Cada uma 4-10 mensagens.
  const conversations: { id: string; contactId: string }[] = [];
  const activeContacts = contacts.slice(0, 30);
  for (const c of activeContacts) {
    const existing = await prisma.conversation.findFirst({
      where: { workspaceId: workspace.id, contactId: c.id },
    });
    const status = chance(0.7)
      ? ConversationStatus.AI_HANDLING
      : chance(0.5)
        ? ConversationStatus.HUMAN_HANDLING
        : ConversationStatus.CLOSED;

    const created =
      existing ??
      (await prisma.conversation.create({
        data: {
          workspaceId: workspace.id,
          contactId: c.id,
          status,
          createdAt: daysAgo(intBetween(0, 30)),
          lastMessageAt: daysAgo(intBetween(0, 7), 240),
          lastIncomingMessageAt: daysAgo(intBetween(0, 5), 240),
        },
      }));
    conversations.push({ id: created.id, contactId: c.id });
  }

  // Limpa msgs antigas pra idempotência (re-seed sem duplicar)
  await prisma.message.deleteMany({
    where: { workspaceId: workspace.id, conversationId: { in: conversations.map((c) => c.id) } },
  });

  let msgCount = 0;
  for (const conv of conversations) {
    const numMsgs = intBetween(4, 10);
    let lastTime = daysAgo(intBetween(0, 14));
    for (let i = 0; i < numMsgs; i++) {
      const isInbound = i % 2 === 0;
      const text = isInbound ? pick(SAMPLE_MESSAGES_IN) : pick(SAMPLE_MESSAGES_OUT);
      // Cada msg ~30s depois da anterior
      lastTime = new Date(lastTime.getTime() + intBetween(30_000, 5 * 60_000));

      await prisma.message.create({
        data: {
          workspaceId: workspace.id,
          conversationId: conv.id,
          contactId: conv.contactId,
          direction: isInbound ? MessageDirection.INBOUND : MessageDirection.OUTBOUND,
          type: MessageType.TEXT,
          content: { text },
          status: isInbound ? MessageStatus.DELIVERED : MessageStatus.READ,
          fromAi: !isInbound && chance(0.7),
          createdAt: lastTime,
        },
      });
      msgCount += 1;
      if (msgCount >= 200) break;
    }
    if (msgCount >= 200) break;
  }

  // ─── Orders (3) ──────────────────────────────────────────────────────────
  const orderStates: Array<{ status: OrderStatus; daysOld: number }> = [
    { status: OrderStatus.DELIVERED, daysOld: 5 },
    { status: OrderStatus.PREPARING, daysOld: 0 },
    { status: OrderStatus.PENDING, daysOld: 0 },
  ];
  for (let i = 0; i < orderStates.length; i++) {
    const state = orderStates[i]!;
    const c = contacts[i]!;
    const numItems = intBetween(1, 3);
    const items = Array.from({ length: numItems }, () => {
      const p = pick(products);
      const qty = intBetween(1, 2);
      return { product: p, quantity: qty };
    });
    const subtotal = items.reduce((acc, it) => acc + it.product.priceCents * it.quantity, 0);
    const shipping = chance(0.5) ? 0 : 1500;
    const total = subtotal + shipping;

    const publicNumber = `PED-${(2401 + i).toString()}`;

    // Delete + recreate por publicNumber pra idempotência
    await prisma.order.deleteMany({
      where: { workspaceId: workspace.id, publicNumber },
    });

    await prisma.order.create({
      data: {
        workspaceId: workspace.id,
        contactId: c.id,
        publicNumber,
        status: state.status,
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: total,
        paymentMethod: pick(['pix', 'card_online', 'card_on_delivery']),
        shippingAddress: {
          street: 'Rua Jardim Botânico',
          number: String(intBetween(100, 999)),
          neighborhood: 'Jardim Botânico',
          city: 'Rio de Janeiro',
          state: 'RJ',
          zip: '22461-000',
        },
        etaMinutes: state.status === OrderStatus.PREPARING ? 45 : undefined,
        createdAt: daysAgo(state.daysOld),
        items: {
          create: items.map((it) => ({
            productId: it.product.id,
            nameSnapshot: it.product.name,
            unitPriceCents: it.product.priceCents,
            quantity: it.quantity,
          })),
        },
      },
    });
  }

  // ─── Appointments (5) ─────────────────────────────────────────────────────
  // 2 passados (1 COMPLETED, 1 NO_SHOW), 3 futuros (CONFIRMED/SCHEDULED)
  const apptStates: Array<{
    status: AppointmentStatus;
    daysOffset: number;
    durationMinutes: number;
    type: string;
    proIdx: number;
  }> = [
    { status: AppointmentStatus.COMPLETED, daysOffset: -3, durationMinutes: 60, type: 'banho_tosa', proIdx: 1 },
    { status: AppointmentStatus.NO_SHOW, daysOffset: -1, durationMinutes: 30, type: 'consulta', proIdx: 0 },
    { status: AppointmentStatus.CONFIRMED, daysOffset: 1, durationMinutes: 90, type: 'banho_tosa', proIdx: 1 },
    { status: AppointmentStatus.CONFIRMED, daysOffset: 2, durationMinutes: 30, type: 'vacina', proIdx: 0 },
    { status: AppointmentStatus.SCHEDULED, daysOffset: 5, durationMinutes: 60, type: 'banho', proIdx: 2 },
  ];

  // Idempotente: deleta appts existentes pra granvilla
  await prisma.appointment.deleteMany({ where: { workspaceId: workspace.id } });

  for (let i = 0; i < apptStates.length; i++) {
    const state = apptStates[i]!;
    const c = contacts[10 + i]!;
    const startsAt = new Date(Date.now() + state.daysOffset * 86_400_000);
    // Snap pra 10h ou 14h
    startsAt.setHours(state.daysOffset >= 0 ? 14 : 10, 0, 0, 0);

    await prisma.appointment.create({
      data: {
        workspaceId: workspace.id,
        contactId: c.id,
        professionalId: proIds[state.proIdx]!,
        status: state.status,
        startsAt,
        durationMinutes: state.durationMinutes,
        type: state.type,
      },
    });
  }

  // ─── Templates HSM aprovados ─────────────────────────────────────────────
  const templates = [
    {
      name: 'lembrete_banho',
      category: TemplateCategory.UTILITY,
      bodyText: 'Oi {{1}}! 🐾 Lembrete: o {{2}} tem banho agendado amanhã {{3}}. Confirma pra gente?',
    },
    {
      name: 'promo_racao_mensal',
      category: TemplateCategory.MARKETING,
      bodyText: '{{1}}, sua promoção do mês chegou! 🎉 15% OFF em ração premium até domingo. Quer separar a do {{2}}?',
    },
    {
      name: 'vacina_atrasada',
      category: TemplateCategory.UTILITY,
      bodyText: 'Oi {{1}}, identificamos que a vacina do {{2}} está atrasada. Agendamos pra esta semana?',
    },
  ];

  for (const t of templates) {
    await prisma.messageTemplate.upsert({
      where: {
        workspaceId_name_language: {
          workspaceId: workspace.id,
          name: t.name,
          language: 'pt_BR',
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: t.name,
        language: 'pt_BR',
        category: t.category,
        components: [{ type: 'BODY', text: t.bodyText }],
        status: TemplateStatus.APPROVED,
        submittedAt: daysAgo(30),
        approvedAt: daysAgo(29),
        metaTemplateId: `mock-meta-${t.name}-${workspace.id.slice(0, 8)}`,
      },
    });
  }

  console.info('✅ Seed Granvilla completo!');
  console.info('');
  console.info(`   📧 Login: ${OWNER_EMAIL}`);
  console.info(`   🔑 Senha: ${OWNER_PASSWORD}`);
  console.info(`   🏪 Workspace: /${WORKSPACE_SLUG}`);
  console.info(`   👥 ${contacts.length} contatos`);
  console.info(`   💬 ${msgCount} mensagens em ${conversations.length} conversas`);
  console.info(`   📦 ${products.length} produtos`);
  console.info(`   🛒 3 pedidos`);
  console.info(`   📅 5 agendamentos`);
  console.info(`   🎟️  2 cupons`);
  console.info(`   📄 3 templates HSM aprovados`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err: unknown) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

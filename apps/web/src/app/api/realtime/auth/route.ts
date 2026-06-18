import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@zapfy/db';

import { auth } from '@/lib/auth';
import { authorizePrivateChannel } from '@/lib/realtime/pusher-server';
import { pendingVerificationForSession } from '@/lib/device-verification';

/**
 * Pusher chama esse endpoint pra autorizar inscrição em canal privado.
 * Validamos que o user tem sessão e pertence ao workspace do canal.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Fail-closed: sessão com device verification pendente não recebe realtime.
  const pending = await pendingVerificationForSession({
    userId: session.user.id,
    sessionToken: session.session.token,
  });
  if (pending) {
    return new NextResponse('DEVICE_VERIFICATION_PENDING', { status: 403 });
  }

  const form = await req.formData();
  const socketId = String(form.get('socket_id') ?? '');
  const channel = String(form.get('channel_name') ?? '');
  if (!socketId || !channel) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  // canal esperado: private-workspace-{id}
  const match = /^private-workspace-(.+)$/.exec(channel);
  if (!match) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  const workspaceId = match[1] as string;

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id },
    select: { id: true },
  });
  if (!member) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const result = authorizePrivateChannel({ socketId, channel, workspaceId });
  if (!result) {
    return new NextResponse('Pusher não configurado', { status: 503 });
  }
  return NextResponse.json(result);
}

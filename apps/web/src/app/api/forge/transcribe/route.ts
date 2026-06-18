import { NextResponse, type NextRequest } from 'next/server';
import { headers } from 'next/headers';

import { prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';

import { auth } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { pendingVerificationForSession } from '@/lib/device-verification';

const log = createLogger('forge:transcribe');

const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8MB ≈ 5min @ 192kbps webm-opus
const ALLOWED_MIMES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
]);

/** Rate limit dedicado pra transcrição (custo da API). */
const RL_TRANSCRIBE = { name: 'transcribe', limit: 20, windowSec: 60 } as const;

/**
 * POST /api/forge/transcribe
 * Body: multipart/form-data com campo "audio" (Blob).
 * Auth: sessão válida + membership de algum workspace.
 *
 * Resposta:
 *   200 { text: string }
 *   400 { error } — payload inválido
 *   401 — sem sessão
 *   413 — áudio grande demais
 *   429 — rate limit
 *   503 { error } — OPENAI_API_KEY ausente em prod / Whisper retornou erro
 *
 * MOCK_AI=true devolve transcrição fake ("[áudio mock]") — útil pra dev sem
 * gastar API.
 */
export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // Fail-closed: sessão com device verification pendente não chama API paga.
  const pendingVerification = await pendingVerificationForSession({
    userId: session.user.id,
    sessionToken: session.session.token,
  });
  if (pendingVerification) {
    return NextResponse.json(
      { error: 'DEVICE_VERIFICATION_PENDING' },
      { status: 403 },
    );
  }

  // Confirma que o user pertence a algum workspace (Forge é flow de workspace)
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json({ error: 'Sem workspace' }, { status: 403 });
  }

  // ── Rate limit por user ──────────────────────────────────────────────────
  const rl = await enforceRateLimit(`user:${session.user.id}`, RL_TRANSCRIBE);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Muitas transcrições em pouco tempo. Tenta de novo em 1 min.' },
      { status: 429 },
    );
  }

  // ── Lê multipart ─────────────────────────────────────────────────────────
  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    log.warn({ err: String(err) }, 'multipart parse falhou');
    return NextResponse.json({ error: 'Body precisa ser multipart/form-data' }, { status: 400 });
  }

  const audio = form.get('audio');
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: 'Campo "audio" ausente ou inválido' }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: 'Áudio vazio' }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: `Áudio maior que ${MAX_AUDIO_BYTES / 1024 / 1024}MB` }, { status: 413 });
  }
  if (audio.type && !ALLOWED_MIMES.has(audio.type)) {
    log.warn({ mime: audio.type }, 'mime não suportado');
    return NextResponse.json(
      { error: `Formato ${audio.type} não suportado. Use webm, ogg, mp3 ou wav.` },
      { status: 400 },
    );
  }

  // ── Mock mode ────────────────────────────────────────────────────────────
  if (process.env['MOCK_AI'] === 'true') {
    return NextResponse.json({
      text: '[áudio mock] Oi, sou dono de uma pizzaria delivery em São Paulo, atendo pelo WhatsApp.',
    });
  }

  // ── Whisper API call ─────────────────────────────────────────────────────
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    log.warn('OPENAI_API_KEY ausente — transcribe indisponível');
    return NextResponse.json(
      { error: 'Transcrição de áudio indisponível (sem OPENAI_API_KEY).' },
      { status: 503 },
    );
  }

  const upstream = new FormData();
  upstream.append('file', audio, 'audio.webm');
  upstream.append('model', process.env['WHISPER_MODEL'] ?? 'whisper-1');
  upstream.append('language', 'pt');
  upstream.append('response_format', 'json');

  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.error({ status: res.status, body: body.slice(0, 200) }, 'whisper falhou');
      return NextResponse.json(
        { error: `Transcrição falhou (HTTP ${res.status})` },
        { status: 503 },
      );
    }
    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? '').trim();
    if (!text) {
      return NextResponse.json({ error: 'Transcrição vazia — fala mais alto?' }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (err) {
    log.error({ err: String(err) }, 'whisper exception');
    return NextResponse.json({ error: 'Erro ao transcrever áudio' }, { status: 503 });
  }
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square, X } from 'lucide-react';
import { cn } from '@zapai/ui';

/**
 * Botão de gravação de áudio. Pede permissão de microfone, grava com
 * MediaRecorder em webm/opus, manda pra /api/forge/transcribe e devolve
 * o texto via `onTranscribed`.
 *
 * Estados:
 *   idle → recording → uploading → idle
 *   se erro em qualquer ponto, volta a idle com mensagem.
 *
 * UX:
 *   - Click 1: começa a gravar (mostra timer + visualização simples)
 *   - Click 2: para e envia
 *   - "X" enquanto grava: cancela sem enviar
 */
export function AudioRecorder({
  onTranscribed,
  disabled,
}: {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  async function start() {
    setError(null);
    cancelledRef.current = false;
    setElapsed(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer opus; fallback automático.
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      const mimeType =
        candidates.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? '';
      const rec = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const tracks = streamRef.current?.getTracks() ?? [];
        tracks.forEach((t) => t.stop());
        streamRef.current = null;

        if (cancelledRef.current) {
          setState('idle');
          setElapsed(0);
          chunksRef.current = [];
          return;
        }

        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        chunksRef.current = [];

        if (blob.size === 0) {
          setError('Áudio vazio — segurou o botão? Tenta de novo.');
          setState('idle');
          setElapsed(0);
          return;
        }

        setState('uploading');
        try {
          const form = new FormData();
          form.append('audio', blob, 'recording.webm');
          const res = await fetch('/api/forge/transcribe', {
            method: 'POST',
            body: form,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            setError(data.error ?? `Falha ${res.status}`);
            setState('idle');
            setElapsed(0);
            return;
          }
          const { text } = (await res.json()) as { text: string };
          if (text && text.trim()) {
            onTranscribed(text.trim());
          } else {
            setError('Não consegui ouvir nada. Fala mais alto?');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao enviar áudio');
        } finally {
          setState('idle');
          setElapsed(0);
        }
      };

      rec.start();
      setState('recording');
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e >= 120) {
            // hard cap em 2min — força parar
            stop();
            return 120;
          }
          return e + 1;
        });
      }, 1000);
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Permissão de microfone negada. Libera nas configurações do navegador.');
      } else if (name === 'NotFoundError') {
        setError('Sem microfone encontrado.');
      } else {
        setError(err instanceof Error ? err.message : 'Falha ao acessar microfone');
      }
      setState('idle');
    }
  }

  function stop() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        /* já parou */
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function cancel() {
    cancelledRef.current = true;
    stop();
  }

  const isBusy = state !== 'idle';

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span
          className="max-w-[260px] truncate rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] text-destructive"
          title={error}
        >
          {error}
        </span>
      )}

      {state === 'recording' && (
        <>
          <span className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
            {formatElapsed(elapsed)}
          </span>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"
            aria-label="Cancelar gravação"
            title="Cancelar (não envia)"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      )}

      <button
        type="button"
        onClick={state === 'recording' ? stop : start}
        disabled={disabled || state === 'uploading'}
        title={state === 'recording' ? 'Parar e enviar' : 'Gravar áudio (descrição em voz)'}
        aria-label={state === 'recording' ? 'Parar e enviar' : 'Gravar áudio'}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
          state === 'idle' && !disabled && 'border-border text-muted-foreground hover:border-primary hover:text-primary',
          state === 'recording' && 'border-destructive bg-destructive text-destructive-foreground',
          (disabled || state === 'uploading') && 'opacity-50 cursor-not-allowed',
        )}
      >
        {state === 'uploading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === 'recording' ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>

      {/* Status para screen readers */}
      <span className="sr-only" aria-live="polite">
        {state === 'recording'
          ? `Gravando, ${elapsed} segundos`
          : state === 'uploading'
          ? 'Transcrevendo áudio'
          : ''}
      </span>

      {isBusy && state === 'uploading' && (
        <span className="text-[11px] text-muted-foreground">Transcrevendo…</span>
      )}
    </div>
  );
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

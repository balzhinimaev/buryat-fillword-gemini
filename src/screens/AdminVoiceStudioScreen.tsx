// src/screens/AdminVoiceStudioScreen.tsx
// Студия озвучки (админ/модератор): слова без аудио идут очередью — запись в один тап,
// автосохранение и переход к следующему. Отдельный режим для примеров употребления.
// Микрофон запрашивается один раз и держится на всю сессию; фолбэк — загрузка файла
// (на случай запрета getUserMedia в webview VK/Telegram).
// Конвейер: авто-стоп по тишине + авто-старт записи на следующем слове — озвучка подряд без рук.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Square,
  SkipForward,
  ChevronLeft,
  Loader2,
  Upload,
  Check,
  X,
  PartyPopper,
  RefreshCw,
  Undo2,
  Zap,
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { WaveAudioButton } from '../components/WaveAudioButton';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';
import type { GameStore } from '../store/gameStore';
import { api, type ApiWord, type GetWordsParams } from '../services/api';

interface Props {
  store: GameStore;
}

type Target = 'word' | 'example';
type Scope = 'missing' | 'all';
type Phase = 'idle' | 'recording' | 'preview' | 'saving';
type StopReason = 'manual' | 'silence' | 'cancel';

const PAGE = 100;
/** RMS-порог «идёт речь» (0..1, byte time-domain) */
const SPEAK_TH = 0.04;
/** тишина после речи до авто-стопа, мс (конвейер) */
const SILENCE_MS = 1100;
/** нет речи с начала записи → авто-отмена, мс (конвейер) */
const NO_SPEECH_MS = 7000;
/** предохранитель максимальной длины записи, мс */
const MAX_REC_MS = 15000;
/** записи короче — случайный тап, отбрасываем, мс */
const MIN_REC_MS = 300;

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

function extOf(mime: string): string {
  return mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
}

const AdminVoiceStudioScreen: React.FC<Props> = ({ store }) => {
  const { goBack } = store;
  const { theme, isDark } = useTheme();
  const { state: authState } = useAuth();
  useBackButton(() => goBack());

  const role = authState.user?.role ?? 'user';
  const canEdit = role === 'admin' || role === 'moderator';

  const [target, setTarget] = useState<Target>('word');
  const [scope, setScope] = useState<Scope>('missing');
  const [queue, setQueue] = useState<ApiWord[]>([]);
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [sessionCount, setSessionCount] = useState(0);
  const [autoNext, setAutoNext] = useState(true);
  const [conveyor, setConveyor] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState<{ blob: Blob; url: string; mime: string } | null>(null);
  const [error, setError] = useState('');
  const [recSeconds, setRecSeconds] = useState(0);
  /** прогресс озвучки всего словаря по текущему target */
  const [voicedTotal, setVoicedTotal] = useState<number | null>(null);
  const [missingTotal, setMissingTotal] = useState<number | null>(null);
  /** последнее сохранённое — для контроля на слух при автопереходе */
  const [lastSaved, setLastSaved] = useState<{ bur: string; url: string; index: number } | null>(null);

  // Сколько слов текущего фильтра уже озвучено за сессию — при scope='missing'
  // они выпадают из серверной выборки, и offset следующей страницы сдвигается.
  const uploadedInFilterRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  // WebAudio: индикатор уровня + детект тишины
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const srcNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const meterRafRef = useRef(0);
  const rmsHistoryRef = useRef<number[]>([]);
  const vadRef = useRef({ spoke: false, lastLoud: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recStartRef = useRef(0);
  const stopReasonRef = useRef<StopReason>('manual');
  const conveyorChainRef = useRef(false);
  const pointerDownAtRef = useRef(0);
  const suppressUpRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const previewRef = useRef(preview);
  previewRef.current = preview;
  const queueRefLen = useRef(0);
  queueRefLen.current = queue.length;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const autoNextRef = useRef(autoNext);
  autoNextRef.current = autoNext;
  const conveyorRef = useRef(conveyor);
  conveyorRef.current = conveyor;
  const indexRef = useRef(index);
  indexRef.current = index;

  const filters = useMemo<GetWordsParams>(() => {
    const f: GetWordsParams = { status: 'verified', limit: PAGE };
    if (target === 'word') {
      if (scope === 'missing') f.hasAudio = false;
    } else {
      f.hasExample = true;
      if (scope === 'missing') f.hasExampleAudio = false;
    }
    return f;
  }, [target, scope]);

  const loadMore = useCallback(async (reset: boolean) => {
    if (loadingRef.current) return;
    if (!reset && !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError('');
    try {
      const offset = reset ? 0 : Math.max(0, queueRefLen.current - uploadedInFilterRef.current);
      const res = await api.adminGetWords({ ...filters, offset });
      hasMoreRef.current = res.words.length >= PAGE;
      setTotal(res.total);
      setQueue((q) => {
        const base = reset ? [] : q;
        const seen = new Set(base.map((w) => w._id));
        return [...base, ...res.words.filter((w) => !seen.has(w._id))];
      });
      if (reset) setIndex(0);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Не удалось загрузить слова');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [filters]);

  // Смена фильтра — новая очередь
  useEffect(() => {
    uploadedInFilterRef.current = 0;
    hasMoreRef.current = true;
    conveyorChainRef.current = false;
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p.url);
      return null;
    });
    setPhase('idle');
    setError('');
    setLastSaved(null);
    void loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Общий прогресс озвучки по target (не зависит от scope)
  useEffect(() => {
    let alive = true;
    setVoicedTotal(null);
    setMissingTotal(null);
    const base: GetWordsParams = target === 'word'
      ? { status: 'verified', limit: 1 }
      : { status: 'verified', hasExample: true, limit: 1 };
    const voicedQ: GetWordsParams = target === 'word' ? { hasAudio: true } : { hasExampleAudio: true };
    const missingQ: GetWordsParams = target === 'word' ? { hasAudio: false } : { hasExampleAudio: false };
    void Promise.all([
      api.adminGetWords({ ...base, ...voicedQ }),
      api.adminGetWords({ ...base, ...missingQ }),
    ]).then(([v, m]) => {
      if (!alive) return;
      setVoicedTotal(v.total);
      setMissingTotal(m.total);
    }).catch(() => {});
    return () => { alive = false; };
  }, [target]);

  // Догрузка следующей страницы при приближении к концу очереди
  useEffect(() => {
    if (queue.length > 0 && index >= queue.length - 5) void loadMore(false);
  }, [index, queue.length, loadMore]);

  // Не гасить экран во время сессии озвучки
  useEffect(() => {
    let lock: { release?: () => Promise<void> } | undefined;
    let released = false;
    const wakeLock = (navigator as Navigator & {
      wakeLock?: { request: (t: string) => Promise<{ release?: () => Promise<void> }> };
    }).wakeLock;
    const request = () => {
      wakeLock?.request('screen').then((l) => {
        if (released) void l.release?.(); else lock = l;
      }).catch(() => {});
    };
    request();
    const onVis = () => { if (document.visibilityState === 'visible') request(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      released = true;
      void lock?.release?.();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Отпустить микрофон, рекордер и WebAudio при выходе
  useEffect(() => () => {
    if (recRef.current?.state === 'recording') {
      stopReasonRef.current = 'cancel';
      recRef.current.stop();
    }
    cancelAnimationFrame(meterRafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    srcNodeRef.current?.disconnect();
    void audioCtxRef.current?.close().catch(() => {});
    if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
  }, []);

  const word = queue[index];
  const wordRef = useRef(word);
  wordRef.current = word;

  const clearPreview = useCallback(() => {
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p.url);
      return null;
    });
  }, []);

  const goTo = useCallback((next: number) => {
    conveyorChainRef.current = false;
    clearPreview();
    setError('');
    setPhase('idle');
    setIndex(Math.max(0, next));
  }, [clearPreview]);

  const save = useCallback(async (blob: Blob, mime: string, forWord: ApiWord) => {
    setPhase('saving');
    setError('');
    try {
      const updated = await api.uploadWordAudio(forWord._id, blob, target, `rec.${extOf(mime)}`);
      setQueue((q) => q.map((w) => (w._id === updated._id
        ? { ...w, audioUrl: updated.audioUrl, exampleAudioUrl: updated.exampleAudioUrl }
        : w)));
      if (scope === 'missing') uploadedInFilterRef.current += 1;
      const hadAudio = !!(target === 'word' ? forWord.audioUrl : forWord.exampleAudioUrl);
      if (!hadAudio) {
        setVoicedTotal((v) => (v == null ? v : v + 1));
        setMissingTotal((m) => (m == null ? m : Math.max(0, m - 1)));
      }
      const savedUrl = target === 'word' ? updated.audioUrl : updated.exampleAudioUrl;
      if (savedUrl) {
        setLastSaved({
          bur: target === 'word' ? forWord.bur : forWord.exampleBur ?? forWord.bur,
          url: savedUrl,
          index: indexRef.current,
        });
      }
      setSessionCount((c) => c + 1);
      clearPreview();
      conveyorChainRef.current = conveyorRef.current;
      setPhase('idle');
      setIndex((i) => i + 1);
    } catch (e) {
      // Запись не потеряна: показываем предпрослушку, можно повторить отправку
      const message = e instanceof Error ? e.message
        : (e as { message?: string })?.message ?? 'Не удалось сохранить';
      setError(message);
      setPreview((p) => p ?? { blob, url: URL.createObjectURL(blob), mime });
      conveyorChainRef.current = false;
      setPhase('preview');
    }
  }, [target, scope, clearPreview]);

  const stopRecording = useCallback((reason: StopReason = 'manual') => {
    if (recRef.current?.state === 'recording') {
      stopReasonRef.current = reason;
      recRef.current.stop();
    }
  }, []);

  /** цикл: рисуем уровень микрофона + детектим тишину для конвейера */
  const meterLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || phaseRef.current !== 'recording') return;
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const d = (buf[i] - 128) / 128;
      sum += d * d;
    }
    const rms = Math.sqrt(sum / buf.length);

    const hist = rmsHistoryRef.current;
    hist.push(rms);
    if (hist.length > 48) hist.shift();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bw = canvas.width / 48;
      const mid = canvas.height / 2;
      hist.forEach((v, i) => {
        const h = Math.max(2, Math.min(1, v * 6) * canvas.height);
        ctx.fillStyle = v > SPEAK_TH ? '#f59e0b' : isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
        ctx.fillRect(i * bw + 1, mid - h / 2, bw - 2, h);
      });
    }

    const now = performance.now();
    const vad = vadRef.current;
    if (rms > SPEAK_TH) {
      vad.spoke = true;
      vad.lastLoud = now;
    }
    if (now - recStartRef.current > MAX_REC_MS) {
      stopRecording('manual');
      return;
    }
    if (conveyorRef.current) {
      if (vad.spoke && now - vad.lastLoud > SILENCE_MS) {
        stopRecording('silence');
        return;
      }
      if (!vad.spoke && now - recStartRef.current > NO_SPEECH_MS) {
        stopRecording('cancel');
        return;
      }
    }
    meterRafRef.current = requestAnimationFrame(meterLoop);
  }, [isDark, stopRecording]);

  const startRecording = useCallback(async () => {
    const forWord = wordRef.current;
    if (!forWord || phaseRef.current !== 'idle') return;
    setError('');
    try {
      let stream = streamRef.current;
      if (!stream || !stream.getTracks().some((t) => t.readyState === 'live')) {
        stream?.getTracks().forEach((t) => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        srcNodeRef.current?.disconnect();
        srcNodeRef.current = null;
      }
      // Анализатор уровня (не в destination — без самопрослушки)
      if (!audioCtxRef.current) {
        const Ctor = window.AudioContext
          ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) audioCtxRef.current = new Ctor();
      }
      const actx = audioCtxRef.current;
      if (actx) {
        void actx.resume().catch(() => {});
        if (!srcNodeRef.current) {
          srcNodeRef.current = actx.createMediaStreamSource(stream);
          const analyser = actx.createAnalyser();
          analyser.fftSize = 512;
          srcNodeRef.current.connect(analyser);
          analyserRef.current = analyser;
        }
      }

      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        cancelAnimationFrame(meterRafRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        const type = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const durMs = performance.now() - recStartRef.current;
        const reason = stopReasonRef.current;
        stopReasonRef.current = 'manual';
        if (reason === 'cancel' || durMs < MIN_REC_MS || blob.size <= 200) {
          setPhase('idle');
          if (reason === 'cancel' && conveyorRef.current) {
            conveyorChainRef.current = false;
            setError('Речи не слышно — конвейер на паузе, тапните микрофон');
          }
          return;
        }
        if (autoNextRef.current) {
          void save(blob, type, forWord);
        } else {
          const url = URL.createObjectURL(blob);
          setPreview({ blob, url, mime: type });
          setPhase('preview');
          // сразу даём услышать, что записалось
          new Audio(url).play().catch(() => {});
        }
      };
      recRef.current = rec;
      recStartRef.current = performance.now();
      vadRef.current = { spoke: false, lastLoud: 0 };
      rmsHistoryRef.current = [];
      rec.start();
      setPhase('recording');
      setRecSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecSeconds(Math.floor((performance.now() - recStartRef.current) / 1000));
      }, 250);
      meterRafRef.current = requestAnimationFrame(meterLoop);
    } catch {
      setError('Нет доступа к микрофону — разрешите его в настройках или загрузите файл');
      setPhase('idle');
    }
  }, [save, meterLoop]);

  // Конвейер: после сохранения авто-старт записи следующего слова
  useEffect(() => {
    if (!conveyor || phase !== 'idle' || !word || !conveyorChainRef.current) return;
    conveyorChainRef.current = false;
    const t = setTimeout(() => void startRecording(), 650);
    return () => clearTimeout(t);
  }, [phase, word, conveyor, startRecording]);

  // Горячие клавиши (десктоп): пробел — запись/стоп, ←/→ — навигация, Enter — сохранить, Esc — отмена
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // игнорируем только текстовый ввод; чекбоксы не должны съедать хоткеи
      const t = e.target as HTMLElement | null;
      if (t?.tagName === 'TEXTAREA') return;
      if (t instanceof HTMLInputElement && !['checkbox', 'radio', 'button'].includes(t.type)) return;
      if (!wordRef.current) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (phaseRef.current === 'recording') stopRecording('manual');
        else if (phaseRef.current === 'idle') void startRecording();
      } else if (e.key === 'ArrowRight' && phaseRef.current === 'idle') {
        goTo(indexRef.current + 1);
      } else if (e.key === 'ArrowLeft' && phaseRef.current === 'idle') {
        goTo(indexRef.current - 1);
      } else if (e.key === 'Enter' && phaseRef.current === 'preview' && previewRef.current) {
        void save(previewRef.current.blob, previewRef.current.mime, wordRef.current);
      } else if (e.key === 'Escape') {
        if (phaseRef.current === 'recording') stopRecording('cancel');
        else if (phaseRef.current === 'preview') { clearPreview(); setPhase('idle'); setError(''); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startRecording, stopRecording, goTo, save, clearPreview]);

  const onFile = useCallback((f: File) => {
    if (!wordRef.current) return;
    void save(f, f.type || 'audio/webm', wordRef.current);
  }, [save]);

  // Тап = старт/стоп; удержание >400мс = запись пока держишь (как голосовые)
  const onMicPointerDown = useCallback(() => {
    if (phaseRef.current === 'recording') {
      suppressUpRef.current = true;
      stopRecording('manual');
      return;
    }
    if (phaseRef.current !== 'idle') return;
    suppressUpRef.current = false;
    pointerDownAtRef.current = performance.now();
    void startRecording();
  }, [startRecording, stopRecording]);

  const onMicPointerUp = useCallback(() => {
    if (suppressUpRef.current) {
      suppressUpRef.current = false;
      return;
    }
    if (phaseRef.current === 'recording'
      && performance.now() - pointerDownAtRef.current > 400) {
      stopRecording('manual');
    }
  }, [stopRecording]);

  const chipCls = (active: boolean) => cn(
    'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
    active
      ? 'bg-amber-500 border-amber-500 text-white'
      : isDark ? 'border-white/15 text-white/70' : 'border-stone-300 text-stone-600',
  );

  const busy = phase === 'saving';
  const existingUrl = word ? (target === 'word' ? word.audioUrl : word.exampleAudioUrl) : null;
  const queueDone = !loading && !word;
  const progressTotal = (voicedTotal ?? 0) + (missingTotal ?? 0);
  const progressPct = progressTotal > 0 ? Math.round(((voicedTotal ?? 0) / progressTotal) * 100) : 0;

  if (!canEdit) {
    return (
      <div className={cn('min-h-screen flex flex-col', theme.backgrounds.primary)}>
        <StickyHeader title="Студия озвучки" onBack={goBack} />
        <div className={cn('flex-1 flex items-center justify-center p-8 text-center text-sm', theme.text.dimmed)}>
          Раздел доступен только модераторам и администраторам.
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen flex flex-col', theme.backgrounds.primary)}>
      <StickyHeader title="Студия озвучки" onBack={goBack} />

      <div className="flex-1 w-full max-w-md mx-auto px-4 pb-8 pt-4 flex flex-col gap-4">
        {/* Фильтры */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1.5">
            <button className={chipCls(target === 'word')} disabled={busy || phase === 'recording'} onClick={() => setTarget('word')}>
              Слова
            </button>
            <button className={chipCls(target === 'example')} disabled={busy || phase === 'recording'} onClick={() => setTarget('example')}>
              Примеры
            </button>
          </div>
          <div className="flex gap-1.5">
            <button className={chipCls(scope === 'missing')} disabled={busy || phase === 'recording'} onClick={() => setScope('missing')}>
              Без озвучки
            </button>
            <button className={chipCls(scope === 'all')} disabled={busy || phase === 'recording'} onClick={() => setScope('all')}>
              Все
            </button>
          </div>
        </div>

        {/* Общий прогресс озвучки словаря */}
        {voicedTotal != null && missingTotal != null && (
          <div className="flex flex-col gap-1">
            <div className={cn('flex items-center justify-between text-[11px]', theme.text.dimmed)}>
              <span>Озвучено {voicedTotal} из {progressTotal} ({progressPct}%)</span>
              <span className="flex items-center gap-1">
                <Check size={12} className="text-emerald-500" /> за сессию: {sessionCount}
              </span>
            </div>
            <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/10' : 'bg-stone-200')}>
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Позиция в очереди */}
        <div className={cn('flex items-center justify-between text-xs', theme.text.dimmed)}>
          <span>
            {total > 0 ? `${Math.min(index + 1, total)} из ${total} в очереди` : loading ? 'Загрузка…' : 'Пусто'}
          </span>
          <span className="hidden sm:block">Пробел — запись · ←/→ — навигация</span>
        </div>

        {loadError && (
          <div className="flex items-center justify-between gap-2 text-xs text-red-500">
            <span>{loadError}</span>
            <button className="underline" onClick={() => void loadMore(queue.length === 0)}>
              Повторить
            </button>
          </div>
        )}

        {/* Карточка слова */}
        <div className="flex-1 flex flex-col justify-center min-h-[240px]">
          <AnimatePresence mode="wait">
            {word && (
              <motion.div
                key={word._id + target}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  'rounded-2xl border p-5 flex flex-col items-center gap-3 text-center',
                  isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-sm',
                )}
              >
                {target === 'word' ? (
                  <>
                    <div className={cn('text-4xl font-bold leading-tight break-words max-w-full', theme.text.primary)}>
                      {word.bur}
                    </div>
                    <div className={cn('text-base', theme.text.dimmed)}>
                      {word.ru}
                      {word.translations?.en ? ` · ${word.translations.en}` : ''}
                    </div>
                    {word.pronunciation && (
                      <div className={cn('text-sm italic', theme.text.dimmed)}>[{word.pronunciation}]</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className={cn('text-2xl font-bold leading-snug break-words max-w-full', theme.text.primary)}>
                      {word.exampleBur}
                    </div>
                    {word.exampleRu && (
                      <div className={cn('text-sm', theme.text.dimmed)}>{word.exampleRu}</div>
                    )}
                    <div className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-semibold',
                      isDark ? 'bg-white/10 text-white/70' : 'bg-stone-100 text-stone-600',
                    )}>
                      {word.bur} — {word.ru}
                    </div>
                  </>
                )}

                {existingUrl && !preview && phase !== 'recording' && (
                  <div className="flex items-center gap-2">
                    <WaveAudioButton src={existingUrl} />
                    <span className={cn('text-[11px]', theme.text.dimmed)}>текущая озвучка</span>
                  </div>
                )}

                {preview && (
                  <div className="flex items-center gap-2">
                    <WaveAudioButton src={preview.url} />
                    <span className={cn('text-[11px]', theme.text.dimmed)}>новая запись</span>
                  </div>
                )}

                {phase === 'recording' && (
                  <div className="flex items-center gap-2">
                    <canvas ref={canvasRef} width={192} height={32} className="rounded" />
                    <span className={cn('text-xs tabular-nums font-semibold', theme.text.dimmed)}>
                      {recSeconds}с
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {queueDone && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn('flex flex-col items-center gap-3 text-center p-6', theme.text.dimmed)}
              >
                <PartyPopper size={40} className="text-amber-500" />
                <div className={cn('text-lg font-bold', theme.text.primary)}>
                  {scope === 'missing' ? 'Всё озвучено!' : 'Очередь закончилась'}
                </div>
                <div className="text-sm">
                  {sessionCount > 0
                    ? `За эту сессию записано озвучек: ${sessionCount}`
                    : 'В этом фильтре слов не осталось'}
                </div>
                <button
                  className={cn('mt-1 px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2',
                    isDark ? 'border-white/15 text-white' : 'border-stone-300 text-stone-700')}
                  onClick={() => void loadMore(true)}
                >
                  <RefreshCw size={15} /> Обновить очередь
                </button>
              </motion.div>
            )}

            {!word && loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                <Loader2 size={28} className={cn('animate-spin', theme.text.dimmed)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && <div className="text-xs text-red-500 text-center">{error}</div>}

        {/* Последнее сохранённое — контроль на слух */}
        {lastSaved && phase !== 'recording' && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs',
            isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50',
          )}>
            <Check size={14} className="text-emerald-500 shrink-0" />
            <span className={cn('font-semibold truncate', theme.text.primary)}>{lastSaved.bur}</span>
            <WaveAudioButton src={lastSaved.url} />
            <button
              className={cn('ml-auto flex items-center gap-1 font-semibold shrink-0', theme.text.dimmed)}
              disabled={busy}
              onClick={() => goTo(lastSaved.index)}
            >
              <Undo2 size={13} /> Заново
            </button>
          </div>
        )}

        {/* Управление записью */}
        {word && (
          <div className="flex flex-col items-center gap-3">
            {phase === 'preview' && preview ? (
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void save(preview.blob, preview.mime, word)}
                >
                  <Check size={16} /> Сохранить
                </button>
                <button
                  className={cn('px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-2',
                    isDark ? 'border-white/15 text-white' : 'border-stone-300 text-stone-700')}
                  disabled={busy}
                  onClick={() => { clearPreview(); setPhase('idle'); void startRecording(); }}
                >
                  <Mic size={16} /> Заново
                </button>
                <button
                  className={cn('p-2.5 rounded-xl border',
                    isDark ? 'border-white/15 text-white' : 'border-stone-300 text-stone-700')}
                  disabled={busy}
                  onClick={() => { clearPreview(); setPhase('idle'); setError(''); }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                aria-label={phase === 'recording' ? 'Остановить запись' : 'Начать запись'}
                disabled={busy}
                onPointerDown={onMicPointerDown}
                onPointerUp={onMicPointerUp}
                onContextMenu={(e) => e.preventDefault()}
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-colors disabled:opacity-60 touch-none select-none',
                  phase === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-amber-500 active:bg-amber-600',
                )}
              >
                {busy ? <Loader2 size={30} className="animate-spin" />
                  : phase === 'recording' ? <Square size={28} />
                  : <Mic size={30} />}
              </button>
            )}

            <div className={cn('text-[11px] text-center', theme.text.dimmed)}>
              {phase === 'recording' ? (conveyor
                ? 'Говорите — запись остановится сама по тишине'
                : 'Идёт запись — тапните или отпустите, чтобы остановить')
                : busy ? 'Сохранение…'
                : conveyor ? 'Конвейер: тапните и просто говорите слова подряд'
                : autoNext ? 'Тап или удержание → запись → сохранится и перейдёт дальше'
                : 'Тап или удержание → запись → предпрослушка'}
            </div>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              <label className={cn('flex items-center gap-1.5 text-xs select-none', theme.text.dimmed, conveyor && 'opacity-50')}>
                <input
                  type="checkbox"
                  checked={autoNext}
                  disabled={conveyor}
                  onChange={(e) => { setAutoNext(e.target.checked); e.target.blur(); }}
                  className="accent-amber-500"
                />
                Автосохранение
              </label>
              <label className={cn('flex items-center gap-1.5 text-xs select-none font-semibold',
                conveyor ? 'text-amber-500' : theme.text.dimmed)}>
                <input
                  type="checkbox"
                  checked={conveyor}
                  onChange={(e) => {
                    setConveyor(e.target.checked);
                    if (e.target.checked) setAutoNext(true);
                    else conveyorChainRef.current = false;
                    e.target.blur();
                  }}
                  className="accent-amber-500"
                />
                <Zap size={13} /> Конвейер
              </label>
            </div>

            <div className="flex items-center gap-2 w-full">
              <button
                className={cn('flex-1 px-3 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40',
                  isDark ? 'border-white/15 text-white' : 'border-stone-300 text-stone-700')}
                disabled={busy || phase === 'recording' || index === 0}
                onClick={() => goTo(index - 1)}
              >
                <ChevronLeft size={16} /> Пред.
              </button>
              <button
                className={cn('px-3 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40',
                  isDark ? 'border-white/15 text-white' : 'border-stone-300 text-stone-700')}
                disabled={busy || phase === 'recording'}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={16} /> Файл
              </button>
              <button
                className={cn('flex-1 px-3 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40',
                  isDark ? 'border-white/15 text-white' : 'border-stone-300 text-stone-700')}
                disabled={busy || phase === 'recording'}
                onClick={() => goTo(index + 1)}
              >
                Пропустить <SkipForward size={16} />
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onFile(f);
          }}
        />
      </div>
    </div>
  );
};

export default AdminVoiceStudioScreen;

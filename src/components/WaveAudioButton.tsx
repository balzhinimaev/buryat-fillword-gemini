// Компактный аудио-плеер «как в SoundCloud»: play/pause + полоска тонких
// столбиков-волны. Во время воспроизведения столбики пульсируют в такт звуку
// (Web Audio AnalyserNode), пройденная часть подсвечена, тап по полоске — перемотка.
// Для md-размера: замедление 0.7x (🐢 — полезно ученикам) и таймер.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Pause, Play, Turtle } from 'lucide-react';
import { cn } from './ui';

interface Props {
  src: string;
  size?: 'sm' | 'md';
  className?: string;
}

// один активный плеер на всё приложение
let activeStop: (() => void) | null = null;
let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    sharedCtx = sharedCtx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    return sharedCtx;
  } catch {
    return null;
  }
}

/** детерминированный «рисунок волны» из строки src — вид как у настоящей дорожки */
function idleWave(src: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    const r = ((h >>> 0) % 1000) / 1000;
    // плавный «холмик» к середине + шум
    const env = 0.45 + 0.55 * Math.sin((Math.PI * (i + 0.5)) / n);
    out.push(0.25 + 0.75 * r * env);
  }
  return out;
}

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const WaveAudioButton: React.FC<Props> = ({ src, size = 'md', className }) => {
  const N = size === 'sm' ? 14 : 24;
  const H = size === 'sm' ? 16 : 22;
  const base = useMemo(() => idleWave(src, N), [src, N]);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState({ cur: 0, dur: 0 });
  const [levels, setLevels] = useState<number[] | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const slowRef = useRef(false);

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    audioRef.current?.pause();
    audioRef.current = null;
    analyserRef.current = null;
    setPlaying(false);
    setLoading(false);
    setLevels(null);
    setProgress(0);
    setTime((t) => ({ ...t, cur: 0 }));
  };

  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyRate = (audio: HTMLAudioElement, isSlow: boolean) => {
    audio.playbackRate = isSlow ? 0.7 : 1;
    // тянем гласные, не меняя высоту голоса
    try {
      (audio as any).preservesPitch = true;
      (audio as any).mozPreservesPitch = true;
    } catch { /* не везде поддерживается */ }
  };

  const tick = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration > 0) {
      setProgress(audio.currentTime / audio.duration);
      setTime({ cur: audio.currentTime, dur: audio.duration });
    }
    const an = analyserRef.current;
    if (an) {
      const data = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(data);
      // раскладываем спектр по столбикам (низкие слева), сглаживаем к базовой волне
      const step = Math.max(1, Math.floor((data.length * 0.7) / N));
      const next: number[] = [];
      for (let i = 0; i < N; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
        const energy = sum / (step * 255);
        next.push(Math.min(1, base[i] * 0.35 + energy * 1.15));
      }
      setLevels(next);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const play = () => {
    activeStop?.();
    activeStop = stop;
    setLoading(true);
    const audio = new Audio(src);
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    applyRate(audio, slowRef.current);
    audio.onended = stop;
    audio.onerror = stop;
    audio.onloadedmetadata = () => setTime({ cur: 0, dur: audio.duration || 0 });
    const ctx = getCtx();
    if (ctx) {
      try {
        void ctx.resume();
        const srcNode = ctx.createMediaElementSource(audio);
        const an = ctx.createAnalyser();
        an.fftSize = 64;
        an.smoothingTimeConstant = 0.6;
        srcNode.connect(an);
        an.connect(ctx.destination);
        analyserRef.current = an;
      } catch {
        analyserRef.current = null; // играем без анализатора
      }
    }
    void audio.play().then(() => {
      setLoading(false);
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }).catch(stop);
  };

  const toggleSlow = () => {
    const next = !slow;
    setSlow(next);
    slowRef.current = next;
    if (audioRef.current) applyRate(audioRef.current, next);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  };

  const bars = levels ?? base;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 align-middle select-none transition-shadow',
        playing
          ? 'border-amber-500/70 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
          : 'border-amber-500/30',
        className,
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          playing || loading ? stop() : play();
        }}
        aria-label={playing ? 'Пауза' : 'Прослушать'}
        className="text-amber-500 flex-shrink-0"
      >
        {loading ? (
          <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" />
        ) : playing ? (
          <Pause size={size === 'sm' ? 12 : 14} />
        ) : (
          <Play size={size === 'sm' ? 12 : 14} />
        )}
      </button>

      <div
        className="flex items-center gap-[2px] cursor-pointer"
        style={{ height: H }}
        onClick={(e) => {
          e.stopPropagation();
          if (playing) seek(e);
          else play();
        }}
      >
        {bars.map((v, i) => {
          const played = i / N <= progress && (playing || progress > 0);
          return (
            <span
              key={i}
              className={cn(
                'rounded-full transition-[height] duration-75',
                played ? 'bg-amber-500' : playing ? 'bg-amber-500/45' : 'bg-amber-500/35',
              )}
              style={{ width: size === 'sm' ? 2 : 2.5, height: Math.max(3, v * H) }}
            />
          );
        })}
      </div>

      {size === 'md' && (
        <>
          <span className="text-[10px] tabular-nums text-amber-600/80 min-w-[54px] text-center">
            {playing || progress > 0 ? `${fmt(time.cur)} / ${fmt(time.dur)}` : time.dur ? fmt(time.dur) : ''}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSlow();
            }}
            aria-label="Медленно (0.7x)"
            title="Медленно — 0.7x"
            className={cn(
              'flex-shrink-0 rounded-full p-1 transition-colors',
              slow ? 'bg-amber-500 text-white' : 'text-amber-500/60',
            )}
          >
            <Turtle size={13} />
          </button>
        </>
      )}
    </span>
  );
};

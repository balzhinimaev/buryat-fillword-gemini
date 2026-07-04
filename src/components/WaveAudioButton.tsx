// Компактный аудио-плеер «как в SoundCloud»: play/pause + полоска тонких
// столбиков-волны. Во время воспроизведения столбики пульсируют в такт звуку
// (Web Audio AnalyserNode), пройденная часть подсвечена, тап по полоске — перемотка.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
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

export const WaveAudioButton: React.FC<Props> = ({ src, size = 'md', className }) => {
  const N = size === 'sm' ? 14 : 24;
  const H = size === 'sm' ? 16 : 22;
  const base = useMemo(() => idleWave(src, N), [src, N]);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [levels, setLevels] = useState<number[] | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    audioRef.current?.pause();
    audioRef.current = null;
    analyserRef.current = null;
    setPlaying(false);
    setLevels(null);
    setProgress(0);
  };

  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tick = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration > 0) setProgress(audio.currentTime / audio.duration);
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
    const audio = new Audio(src);
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    audio.onended = stop;
    audio.onerror = stop;
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
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }).catch(stop);
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
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 align-middle select-none',
        playing ? 'border-amber-500/60 bg-amber-500/10' : 'border-amber-500/30',
        className,
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          playing ? stop() : play();
        }}
        aria-label={playing ? 'Пауза' : 'Прослушать'}
        className="text-amber-500 flex-shrink-0"
      >
        {playing ? <Pause size={size === 'sm' ? 12 : 14} /> : <Play size={size === 'sm' ? 12 : 14} />}
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
    </span>
  );
};

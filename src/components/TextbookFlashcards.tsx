// Флэш-карточки слов урока: настоящий 3D-переворот (perspective + rotateY),
// листание со сдвигом, прогресс-точки.
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Layers, X } from 'lucide-react';
import { cn } from './ui';
import { useTheme } from '../theme/ThemeContext';
import { hintOf, useGameLang } from '../services/gameLang';
import { burAudioUrl, hasBurAudio } from '../services/burAudio';
import { WaveAudioButton } from './WaveAudioButton';
import type { TextbookWord } from '../services/textbook';

interface Props {
  title: string;
  words: TextbookWord[];
  onClose(): void;
}

export const TextbookFlashcards: React.FC<Props> = ({ title, words, onClose }) => {
  const { theme, isDark } = useTheme();
  useGameLang();
  const deck = useMemo(() => words.filter((w) => w.bur), [words]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dir, setDir] = useState(1);

  const w = deck[i];
  const go = (d: -1 | 1) => {
    const next = i + d;
    if (next < 0 || next >= deck.length) return;
    setDir(d);
    setFlipped(false);
    setI(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[2px]" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className={cn('w-full max-w-md rounded-t-3xl p-5 pb-8', isDark ? 'bg-stone-900' : 'bg-white')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={cn('font-bold flex items-center gap-2', theme.text.primary)}>
            <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600')}>
              <Layers size={15} />
            </span>
            {title}
          </div>
          <button onClick={onClose} aria-label="Закрыть" className={cn('p-1.5 rounded-lg', theme.text.muted)}>
            <X size={18} />
          </button>
        </div>

        {!w ? (
          <p className={cn('text-sm py-6 text-center', theme.text.muted)}>Нет слов.</p>
        ) : (
          <>
            {/* сцена с перспективой */}
            <div style={{ perspective: 1000 }} className="relative h-48">
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <motion.button
                  key={w.bur}
                  custom={dir}
                  initial={{ x: dir * 70, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -dir * 70, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  onClick={() => setFlipped((f) => !f)}
                  className="absolute inset-0 w-full"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.45, ease: [0.3, 0.9, 0.4, 1] }}
                    style={{ transformStyle: 'preserve-3d' }}
                    className="relative w-full h-full"
                  >
                    {/* лицо: бурятское слово */}
                    <div
                      style={{ backfaceVisibility: 'hidden' }}
                      className={cn(
                        'absolute inset-0 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 px-6',
                        isDark ? 'border-white/15 bg-gradient-to-br from-stone-800 to-stone-900' : 'border-stone-200 bg-gradient-to-br from-white to-stone-50 shadow-md',
                      )}
                    >
                      <span className={cn('text-[10px] uppercase tracking-[0.2em]', theme.text.dimmed)}>по-бурятски</span>
                      <span className={cn('text-3xl font-extrabold text-center leading-tight', theme.text.primary)}>
                        {w.bur}
                      </span>
                      <span className={cn('text-[10px]', theme.text.dimmed)}>нажмите, чтобы перевернуть</span>
                    </div>
                    {/* оборот: перевод */}
                    <div
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                      className={cn(
                        'absolute inset-0 rounded-2xl border-2 border-amber-500/70 flex flex-col items-center justify-center gap-2 px-6',
                        'bg-gradient-to-br',
                        isDark ? 'from-amber-500/20 to-orange-500/10' : 'from-amber-50 to-orange-50 shadow-md',
                      )}
                    >
                      <span className="text-[10px] uppercase tracking-[0.2em] text-amber-500">перевод</span>
                      <span className={cn('text-2xl font-extrabold text-center leading-tight', theme.text.primary)}>
                        {hintOf({ ru: w.ru, translations: w.en ? { en: w.en } : undefined })}
                      </span>
                    </div>
                  </motion.div>
                </motion.button>
              </AnimatePresence>
            </div>

            {hasBurAudio(w.bur) && (
              <div className="flex justify-center mt-3">
                <WaveAudioButton src={burAudioUrl(w.bur)!} size="sm" />
              </div>
            )}

            {/* прогресс-точки */}
            <div className="flex justify-center gap-1 mt-4">
              {deck.map((_, n) => (
                <span
                  key={n}
                  className={cn(
                    'rounded-full transition-all duration-200',
                    n === i ? 'w-4 h-1.5 bg-amber-500' : cn('w-1.5 h-1.5', isDark ? 'bg-white/20' : 'bg-stone-300'),
                  )}
                />
              ))}
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => go(-1)}
                disabled={i === 0}
                aria-label="Предыдущая"
                className={cn('p-3 rounded-xl border disabled:opacity-30 active:scale-95 transition-transform', isDark ? 'border-white/15 text-white' : 'border-stone-200 text-stone-700')}
              >
                <ChevronLeft size={20} />
              </button>
              <span className={cn('text-sm font-bold tabular-nums', theme.text.secondary)}>
                {i + 1} / {deck.length}
              </span>
              <button
                onClick={() => go(1)}
                disabled={i === deck.length - 1}
                aria-label="Следующая"
                className={cn('p-3 rounded-xl border disabled:opacity-30 active:scale-95 transition-transform', isDark ? 'border-white/15 text-white' : 'border-stone-200 text-stone-700')}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

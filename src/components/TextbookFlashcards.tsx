// Флэш-карточки слов урока: тап — переворот (бурятское ↔ перевод), листание.
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, X } from 'lucide-react';
import { cn } from './ui';
import { useTheme } from '../theme/ThemeContext';
import { hintOf, useGameLang } from '../services/gameLang';
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

  const w = deck[i];
  const go = (d: -1 | 1) => {
    setFlipped(false);
    setI((prev) => Math.min(deck.length - 1, Math.max(0, prev + d)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className={cn('w-full max-w-md rounded-t-3xl p-5 pb-8', isDark ? 'bg-stone-900' : 'bg-white')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={cn('font-bold flex items-center gap-2', theme.text.primary)}>
            <Layers size={18} className="text-amber-500" />
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
            <button
              onClick={() => setFlipped((f) => !f)}
              className={cn(
                'w-full h-44 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 px-6 transition-all active:scale-[0.99]',
                flipped
                  ? 'border-amber-500 bg-amber-500/10'
                  : isDark ? 'border-white/15 bg-white/5' : 'border-stone-200 bg-stone-50',
              )}
            >
              <span className={cn('text-[10px] uppercase tracking-wider', theme.text.muted)}>
                {flipped ? 'перевод' : 'по-бурятски · нажмите, чтобы перевернуть'}
              </span>
              <span className={cn('text-3xl font-extrabold text-center leading-tight', theme.text.primary)}>
                {flipped
                  ? hintOf({ ru: w.ru, translations: w.en ? { en: w.en } : undefined })
                  : w.bur}
              </span>
            </button>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => go(-1)}
                disabled={i === 0}
                aria-label="Предыдущая"
                className={cn('p-3 rounded-xl border disabled:opacity-30', isDark ? 'border-white/15 text-white' : 'border-stone-200 text-stone-700')}
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
                className={cn('p-3 rounded-xl border disabled:opacity-30', isDark ? 'border-white/15 text-white' : 'border-stone-200 text-stone-700')}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

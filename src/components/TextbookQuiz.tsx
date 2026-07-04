// Квиз урока учебника: вопросы по лексике с мгновенной обратной связью.
import React, { useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, Target, X } from 'lucide-react';
import { cn } from './ui';
import { useTheme } from '../theme/ThemeContext';
import { hintOf, useGameLang } from '../services/gameLang';
import {
  buildQuiz,
  QUIZ_PASS_RATIO,
  saveQuizResult,
  type TextbookUnit,
  type TextbookWord,
} from '../services/textbook';

interface Props {
  unit: TextbookUnit;
  onClose(): void;
  /** дёргается после сохранения результата — родитель обновляет статусы */
  onFinished(): void;
}

function trOf(w: TextbookWord): string {
  return hintOf({ ru: w.ru, translations: w.en ? { en: w.en } : undefined });
}

export const TextbookQuiz: React.FC<Props> = ({ unit, onClose, onFinished }) => {
  const { theme, isDark } = useTheme();
  useGameLang();
  const [attempt, setAttempt] = useState(0);
  const quiz = useMemo(() => buildQuiz(unit), [unit, attempt]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const q = quiz[qi];
  const passNeed = Math.ceil(quiz.length * QUIZ_PASS_RATIO);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === q.correctIndex;
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    setTimeout(() => {
      if (qi + 1 >= quiz.length) {
        saveQuizResult(unit.slug, nextCorrect, quiz.length);
        setDone(true);
        onFinished();
      } else {
        setQi(qi + 1);
        setPicked(null);
      }
    }, 700);
  };

  const retry = () => {
    setAttempt((a) => a + 1);
    setQi(0);
    setPicked(null);
    setCorrect(0);
    setDone(false);
  };

  const passed = correct >= passNeed;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className={cn(
          'w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto',
          isDark ? 'bg-stone-900' : 'bg-white',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={cn('font-bold flex items-center gap-2', theme.text.primary)}>
            <Target size={18} className="text-amber-500" />
            Проверь себя
          </div>
          <button onClick={onClose} aria-label="Закрыть" className={cn('p-1.5 rounded-lg', theme.text.muted)}>
            <X size={18} />
          </button>
        </div>

        {!done ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className={cn('text-xs', theme.text.muted)}>
                Вопрос {qi + 1} из {quiz.length}
              </span>
              <span className={cn('text-xs font-bold', theme.text.secondary)}>✓ {correct}</span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-500/20 mb-5 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${(qi / quiz.length) * 100}%` }}
              />
            </div>

            <div className={cn('text-center text-xs mb-1', theme.text.muted)}>
              {q.type === 'bur2tr' ? 'Как переводится?' : 'Выбери бурятское слово'}
            </div>
            <div className={cn('text-center text-2xl font-extrabold mb-5', theme.text.primary)}>
              {q.type === 'bur2tr' ? q.word.bur : trOf(q.word)}
            </div>

            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const label = q.type === 'bur2tr' ? trOf(opt) : opt.bur;
                const isCorrect = picked !== null && i === q.correctIndex;
                const isWrongPick = picked === i && i !== q.correctIndex;
                return (
                  <button
                    key={opt.bur}
                    onClick={() => pick(i)}
                    className={cn(
                      'w-full rounded-xl px-4 py-3 text-left text-[15px] font-medium border transition-all',
                      isCorrect && 'bg-emerald-500 border-emerald-500 text-white',
                      isWrongPick && 'bg-red-500 border-red-500 text-white',
                      picked === null &&
                        (isDark
                          ? 'border-white/15 bg-white/5 text-white active:scale-[0.99]'
                          : 'border-stone-200 bg-stone-50 text-stone-800 active:scale-[0.99]'),
                      picked !== null && !isCorrect && !isWrongPick && 'opacity-40 ' + (isDark ? 'border-white/10 text-white' : 'border-stone-200 text-stone-500'),
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-5xl mb-3">{passed ? '🎉' : '💪'}</div>
            <div className={cn('text-xl font-extrabold', theme.text.primary)}>
              {correct} из {quiz.length}
            </div>
            <p className={cn('text-sm mt-2', theme.text.secondary)}>
              {passed
                ? 'Квиз пройден! Слова урока усвоены.'
                : `Для зачёта нужно ${passNeed}+. Загляните в теорию и попробуйте ещё раз.`}
            </p>
            <div className="flex gap-2 justify-center mt-5">
              <button
                onClick={retry}
                className={cn(
                  'px-4 py-2.5 rounded-xl border font-bold text-sm flex items-center gap-1.5',
                  isDark ? 'border-white/20 text-white' : 'border-stone-300 text-stone-700',
                )}
              >
                <RotateCcw size={15} /> Ещё раз
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} /> Готово
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

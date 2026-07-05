// Квиз учебника: вопросы по лексике с мгновенной обратной связью.
// Используется и в уроке (saveSlug задан — результат идёт в прогресс юнита),
// и в «работе над ошибками» (без saveSlug). Каждый ответ обновляет трекер ошибок.
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, RotateCcw, Target, X } from 'lucide-react';
import { cn } from './ui';
import { useTheme } from '../theme/ThemeContext';
import { hintOf, useGameLang } from '../services/gameLang';
import {
  QUIZ_PASS_RATIO,
  recordQuizAnswer,
  saveQuizResult,
  type QuizQuestion,
  type TextbookWord,
} from '../services/textbook';

interface Props {
  title: string;
  /** генератор вопросов — вызывается на старте и при «Ещё раз» */
  makeQuestions(): QuizQuestion[];
  /** slug юнита — если задан, результат сохраняется в прогресс урока */
  saveSlug?: string;
  onClose(): void;
  /** после сохранения результата — родитель обновляет статусы */
  onFinished(): void;
}

function trOf(w: TextbookWord): string {
  return hintOf({ ru: w.ru, translations: w.en ? { en: w.en } : undefined });
}

export const TextbookQuiz: React.FC<Props> = ({ title, makeQuestions, saveSlug, onClose, onFinished }) => {
  const { theme, isDark } = useTheme();
  useGameLang();
  const [attempt, setAttempt] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const quiz = useMemo(() => makeQuestions(), [attempt]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const q = quiz[qi];
  const passNeed = Math.ceil(quiz.length * QUIZ_PASS_RATIO);

  const pick = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    const ok = i === q.correctIndex;
    recordQuizAnswer(q.word.bur, ok);
    const nextCorrect = correct + (ok ? 1 : 0);
    setCorrect(nextCorrect);
    setTimeout(() => {
      if (qi + 1 >= quiz.length) {
        if (saveSlug) saveQuizResult(saveSlug, nextCorrect, quiz.length);
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
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className={cn(
          'w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto',
          isDark ? 'bg-stone-900' : 'bg-white',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={cn('font-bold flex items-center gap-2', theme.text.primary)}>
            <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600')}>
              <Target size={15} />
            </span>
            {title}
          </div>
          <button onClick={onClose} aria-label="Закрыть" className={cn('p-1.5 rounded-lg', theme.text.muted)}>
            <X size={18} />
          </button>
        </div>

        {!q ? (
          <p className={cn('text-sm py-6 text-center', theme.text.muted)}>Нет слов для повторения.</p>
        ) : !done ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className={cn('text-xs', theme.text.muted)}>
                Вопрос {qi + 1} из {quiz.length}
              </span>
              <span className={cn('text-xs font-bold', theme.text.secondary)}>✓ {correct}</span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-500/20 mb-5 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                animate={{ width: `${(qi / quiz.length) * 100}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>

            <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={qi}
              initial={{ x: 46, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -46, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
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
            </motion.div>
            </AnimatePresence>
          </>
        ) : (
          <div className="text-center py-4">
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 240 }}
              className="text-5xl mb-3"
            >
              {passed ? '🎉' : '💪'}
            </motion.div>
            <div className={cn('text-xl font-extrabold', theme.text.primary)}>
              {correct} из {quiz.length}
            </div>
            <p className={cn('text-sm mt-2', theme.text.secondary)}>
              {passed
                ? saveSlug
                  ? 'Квиз пройден! Слова урока усвоены.'
                  : 'Отлично! Ошибки отработаны.'
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
      </motion.div>
    </div>
  );
};

// Учебный план — «путь обучения»: вертикальный таймлайн уроков с узлами-статусами,
// прогресс-кольцо курса в шапке, работа над ошибками и выпускной экзамен.
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  GraduationCap,
  Lock,
  RotateCcw,
  Star,
  Target,
} from 'lucide-react';
import { cn } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import type { GameStore } from '../store/gameStore';
import { TextbookQuiz } from '../components/TextbookQuiz';
import {
  buildExamQuiz,
  buildReviewQuiz,
  courseProgress,
  EXAM_SLUG,
  fetchPracticeLessons,
  getExamBest,
  getMistakeWords,
  getUnitStatuses,
  isExamPassed,
  type PracticeLessonInfo,
  type UnitStatus,
} from '../services/textbook';

interface Props {
  store: GameStore;
}

/** анимированное кольцо прогресса курса */
const ProgressRing: React.FC<{ done: number; total: number }> = ({ done, total }) => {
  const R = 27;
  const C = 2 * Math.PI * R;
  const ratio = total > 0 ? done / total : 0;
  return (
    <div className="relative w-[72px] h-[72px] flex-shrink-0">
      <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
        <circle cx="36" cy="36" r={R} fill="none" strokeWidth="5" className="stroke-white/15" />
        <motion.circle
          cx="36" cy="36" r={R} fill="none" strokeWidth="5" strokeLinecap="round"
          className="stroke-amber-400"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - ratio) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-lg font-extrabold">{done}</span>
        <span className="text-[9px] opacity-60 mt-0.5">из {total}</span>
      </div>
    </div>
  );
};

const Chip: React.FC<{ icon: React.ReactNode; label: string; done?: boolean; accent?: 'green' | 'amber' }> = ({
  icon, label, done, accent = 'green',
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-[3px] rounded-md leading-none',
      done
        ? accent === 'amber'
          ? 'bg-amber-500/15 text-amber-500'
          : 'bg-emerald-500/15 text-emerald-500'
        : 'bg-stone-500/10 text-stone-400',
    )}
  >
    {icon}
    {label}
  </span>
);

export const TextbookScreen: React.FC<Props> = ({ store }) => {
  const { theme, isDark } = useTheme();
  const [lessons, setLessons] = useState<Record<string, PracticeLessonInfo>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [examBest, setExamBest] = useState(getExamBest());
  const [mistakeCount, setMistakeCount] = useState(() => getMistakeWords().length);

  useEffect(() => {
    void fetchPracticeLessons().then(setLessons);
  }, []);

  const starsBySlug = useMemo(
    () => Object.fromEntries(Object.entries(lessons).map(([slug, l]) => [slug, l.stars])),
    [lessons],
  );
  const statuses = useMemo(() => getUnitStatuses(starsBySlug), [starsBySlug]);
  const progress = courseProgress(statuses);
  const nextIdx = statuses.findIndex((s) => !s.completed);
  const allDone = progress.done === progress.total;
  const examPassed = isExamPassed();

  const renderUnit = (s: UnitStatus, i: number) => {
    const isNext = i === nextIdx;
    return (
      <motion.div
        key={s.unit.slug}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.045, 0.5), duration: 0.3 }}
        className="relative pl-12"
      >
        {/* узел на таймлайне */}
        <div
          className={cn(
            'absolute left-0 top-3 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm z-10 ring-4 transition-colors',
            isDark ? 'ring-stone-900' : 'ring-stone-50',
            s.completed
              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
              : isNext
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_14px_rgba(245,158,11,0.5)]'
                : isDark ? 'bg-stone-800 text-stone-400 border border-white/10' : 'bg-white text-stone-400 border border-stone-200',
          )}
        >
          {s.completed ? <Check size={16} strokeWidth={3} /> : i + 1}
        </div>

        <button
          onClick={() => store.navigateToTextbookUnit(s.unit.slug)}
          className={cn(
            'w-full text-left rounded-2xl px-4 py-3.5 border transition-all active:scale-[0.985] group',
            isDark
              ? cn(theme.backgrounds.card, s.completed ? 'border-emerald-500/25' : isNext ? 'border-amber-500/50' : theme.borders.subtle)
              : cn('bg-white', s.completed ? 'border-emerald-200 shadow-sm' : isNext ? 'border-amber-300 shadow-[0_2px_14px_rgba(245,158,11,0.15)]' : 'border-stone-100 shadow-sm'),
          )}
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('font-bold text-[15px] leading-tight', theme.text.primary)}>
                  {s.unit.title.replace(/^Урок \d+\. /, '')}
                </span>
                {isNext && (
                  <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    дальше
                  </span>
                )}
              </div>
              <div className={cn('text-xs mt-1 leading-snug', theme.text.muted)}>{s.unit.goal}</div>
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <Chip icon={<BookOpen size={10} />} label="теория" done={s.theoryRead} />
                {s.unit.practiceSlugs.length > 0 && (
                  <Chip
                    icon={<Star size={10} />}
                    label={s.practiceStars > 0 ? `${s.practiceStars}★` : 'практика'}
                    done={s.practiceStars > 0}
                    accent="amber"
                  />
                )}
                <Chip
                  icon={<Target size={10} />}
                  label={s.quizPassed ? 'квиз' : s.quizBest ? `${s.quizBest.correct}/${s.quizBest.total}` : 'квиз'}
                  done={s.quizPassed}
                />
              </div>
            </div>
            <ChevronRight
              size={17}
              className={cn('flex-shrink-0 transition-transform group-active:translate-x-0.5', theme.text.dimmed)}
            />
          </div>
        </button>
      </motion.div>
    );
  };

  return (
    <div className={cn('min-h-screen flex flex-col', theme.backgrounds.primaryGradient)}>
      {/* Hero-шапка */}
      <header className={cn('relative overflow-hidden p-4 pb-6', isDark ? '' : 'rounded-b-3xl shadow-lg', theme.header.bg, theme.header.text)}>
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2">
          <button onClick={store.goBack} aria-label="Назад" className="p-2 -ml-2 rounded-xl active:bg-white/10">
            <ArrowLeft size={22} />
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">курс</span>
        </div>
        <div className="flex items-center gap-4 mt-2 px-1">
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-extrabold leading-tight">Учебник бурятского</h1>
            <p className="text-xs opacity-70 mt-1.5 leading-relaxed">
              12 уроков: от алфавита до свободных фраз.
              {allDone ? ' Курс пройден — остался экзамен!' : ' Двигайтесь по пути сверху вниз.'}
            </p>
          </div>
          <ProgressRing done={progress.done} total={progress.total} />
        </div>
      </header>

      <main className="flex-1 px-4 pt-5 pb-10">
        {/* Работа над ошибками */}
        {mistakeCount >= 3 && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setReviewOpen(true)}
            className={cn(
              'w-full text-left rounded-2xl p-3.5 mb-5 flex items-center gap-3 border active:scale-[0.985]',
              'bg-gradient-to-r',
              isDark
                ? 'from-amber-500/15 to-orange-500/10 border-amber-500/40'
                : 'from-amber-50 to-orange-50 border-amber-300',
            )}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <RotateCcw size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('font-bold text-sm', theme.text.primary)}>Работа над ошибками</div>
              <div className={cn('text-[11px] mt-0.5', theme.text.muted)}>
                {mistakeCount} слов ждут повторения
              </div>
            </div>
            <ChevronRight size={16} className={theme.text.dimmed} />
          </motion.button>
        )}

        {/* Таймлайн уроков */}
        <div className="relative">
          <div
            className={cn(
              'absolute left-[17px] top-4 bottom-4 w-[2px] rounded-full',
              isDark ? 'bg-gradient-to-b from-amber-500/40 via-white/10 to-white/5' : 'bg-gradient-to-b from-amber-300 via-stone-200 to-stone-100',
            )}
          />
          <div className="space-y-3.5">
            {statuses.map((s, i) => renderUnit(s, i))}

            {/* Экзамен — финал пути */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="relative pl-12"
            >
              <div
                className={cn(
                  'absolute left-0 top-3 w-9 h-9 rounded-full flex items-center justify-center z-10 ring-4 text-white',
                  isDark ? 'ring-stone-900' : 'ring-stone-50',
                  examPassed
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                    : allDone
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_14px_rgba(245,158,11,0.5)]'
                      : isDark ? 'bg-stone-800 text-stone-500 border border-white/10' : 'bg-white text-stone-400 border border-stone-200',
                )}
              >
                {examPassed ? <Check size={16} strokeWidth={3} /> : allDone ? <GraduationCap size={16} /> : <Lock size={14} />}
              </div>
              <button
                onClick={() => allDone && setExamOpen(true)}
                disabled={!allDone}
                className={cn(
                  'w-full text-left rounded-2xl px-4 py-3.5 border-2 transition-all',
                  allDone && 'active:scale-[0.985]',
                  examPassed
                    ? isDark ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50'
                    : allDone
                      ? cn('bg-gradient-to-r', isDark ? 'from-amber-500/15 to-orange-500/10 border-amber-500/50' : 'from-amber-50 to-orange-50 border-amber-300')
                      : cn('opacity-55', isDark ? 'border-white/10' : 'border-stone-200 bg-white'),
                )}
              >
                <div className={cn('font-extrabold text-[15px]', theme.text.primary)}>
                  Экзамен курса{examPassed ? ' — сдан ✓' : ''}
                </div>
                <div className={cn('text-xs mt-1', theme.text.muted)}>
                  {allDone
                    ? examBest
                      ? `16 вопросов по всему курсу · лучший результат ${examBest.correct}/${examBest.total}`
                      : '16 вопросов по всему курсу — финальная проверка'
                    : `Откроется после всех уроков · пройдено ${progress.done} из ${progress.total}`}
                </div>
              </button>
            </motion.div>
          </div>
        </div>

        <p className={cn('text-[10px] text-center pt-6', theme.text.dimmed)}>
          Материалы урока подготовлены с помощью ИИ и могут содержать неточности.
        </p>
      </main>

      {examOpen && (
        <TextbookQuiz
          title="Экзамен курса"
          makeQuestions={() => buildExamQuiz()}
          saveSlug={EXAM_SLUG}
          onClose={() => setExamOpen(false)}
          onFinished={() => setExamBest(getExamBest())}
        />
      )}
      {reviewOpen && (
        <TextbookQuiz
          title="Работа над ошибками"
          makeQuestions={() => buildReviewQuiz()}
          onClose={() => {
            setReviewOpen(false);
            setMistakeCount(getMistakeWords().length);
          }}
          onFinished={() => setMistakeCount(getMistakeWords().length)}
        />
      )}
    </div>
  );
};

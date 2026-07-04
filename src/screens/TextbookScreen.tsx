// Учебный план: список уроков учебника со статусами теории/практики и общим прогрессом.
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Star, Target } from 'lucide-react';
import { cn } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import type { GameStore } from '../store/gameStore';
import {
  courseProgress,
  fetchPracticeLessons,
  getUnitStatuses,
  type PracticeLessonInfo,
} from '../services/textbook';

interface Props {
  store: GameStore;
}

export const TextbookScreen: React.FC<Props> = ({ store }) => {
  const { theme, isDark } = useTheme();
  const [lessons, setLessons] = useState<Record<string, PracticeLessonInfo>>({});

  useEffect(() => {
    void fetchPracticeLessons().then(setLessons);
  }, []);

  const starsBySlug = useMemo(
    () => Object.fromEntries(Object.entries(lessons).map(([slug, l]) => [slug, l.stars])),
    [lessons],
  );
  const statuses = useMemo(() => getUnitStatuses(starsBySlug), [starsBySlug]);
  const progress = courseProgress(statuses);

  return (
    <div className={cn('min-h-screen flex flex-col', theme.backgrounds.primaryGradient)}>
      <header className={cn('p-4 pb-5 relative z-10', isDark ? '' : 'rounded-b-3xl shadow-lg', theme.header.bg, theme.header.text)}>
        <div className="flex items-center gap-3">
          <button onClick={store.goBack} aria-label="Назад" className="p-2 -ml-2 rounded-xl active:bg-white/10">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BookOpen size={20} /> Учебник бурятского
            </h1>
            <p className="text-xs opacity-70 mt-0.5">
              Пройдено {progress.done} из {progress.total} уроков
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-400 transition-all"
            style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
          />
        </div>
      </header>

      <main className="flex-1 p-4 space-y-3 pb-8">
        {statuses.map((s, i) => (
          <button
            key={s.unit.slug}
            onClick={() => store.navigateToTextbookUnit(s.unit.slug)}
            className={cn(
              'w-full text-left rounded-2xl p-4 flex items-start gap-3 border transition-all active:scale-[0.99]',
              isDark ? cn(theme.backgrounds.card, theme.borders.subtle) : 'bg-white shadow-sm border-stone-100',
              s.completed && 'border-emerald-500/50',
            )}
          >
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm',
                s.completed
                  ? 'bg-emerald-500 text-white'
                  : isDark ? 'bg-white/10 text-white/70' : 'bg-stone-100 text-stone-500',
              )}
            >
              {s.completed ? <CheckCircle2 size={18} /> : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('font-bold text-[15px] leading-tight', theme.text.primary)}>
                {s.unit.title.replace(/^Урок \d+\. /, '')}
              </div>
              <div className={cn('text-xs mt-1', theme.text.muted)}>{s.unit.goal}</div>
              <div className="flex items-center gap-3 mt-2 text-[11px]">
                <span className={cn('flex items-center gap-1', s.theoryRead ? 'text-emerald-500' : theme.text.muted)}>
                  <BookOpen size={11} /> теория{s.theoryRead ? ' ✓' : ''}
                </span>
                {s.unit.practiceSlugs.length > 0 && (
                  <span className={cn('flex items-center gap-1', s.practiceStars > 0 ? 'text-amber-500' : theme.text.muted)}>
                    <Star size={11} /> практика{s.practiceStars > 0 ? ` ${s.practiceStars}★` : ''}
                  </span>
                )}
                <span className={cn('flex items-center gap-1', s.quizPassed ? 'text-emerald-500' : theme.text.muted)}>
                  <Target size={11} /> квиз{s.quizPassed ? ' ✓' : s.quizBest ? ` ${s.quizBest.correct}/${s.quizBest.total}` : ''}
                </span>
              </div>
            </div>
          </button>
        ))}
        <p className={cn('text-[10px] text-center pt-2', theme.text.muted)}>
          Материалы урока подготовлены с помощью ИИ и могут содержать неточности.
        </p>
      </main>
    </div>
  );
};

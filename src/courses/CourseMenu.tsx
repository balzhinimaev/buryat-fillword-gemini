import { lazy, Suspense, useState } from 'react';
import { Check, Globe2 } from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { chooseCourse } from './progress';
import { activeCourseId, restartCourseApp } from './activeCourse';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { cn } from '../utils/cn';
const MainMenu = lazy(() => import('../screens/MainMenu'));
const button = 'course-choice min-h-12 flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-xs sm:text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500';

export default function CourseMenu({ store }: { store: GameStore }) {
  const { themeId } = useTheme();
  const styles = getMenuStyles(themeId);
  const [course] = useState(activeCourseId);
  const [error, setError] = useState('');
  return <>
    <section aria-label="Выбор изучаемого языка" className={cn('course-switcher', styles.pageBackground, styles.buttons.text.primary)} style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><Globe2 size={17} aria-hidden />Мои языки</p>
          <span className={cn('text-xs', styles.buttons.text.muted)}>Burlive</span>
        </div>
        <div className={cn('grid grid-cols-3 gap-1.5 rounded-2xl border p-1.5', styles.buttons.card.background, styles.buttons.card.border)}>
          {([['bua-ru', 'Бурятский'], ['cs-ru', 'Чешский'], ['en-ru', 'Английский']] as const).map(([id, title]) => <button key={id} type="button" aria-pressed={course === id} className={cn(button, course === id ? ['bg-gradient-to-br text-white shadow-sm', styles.buttons.play.gradient] : styles.buttons.text.secondary)} onClick={() => { try { if (id === course) return; chooseCourse(id); restartCourseApp(); } catch { setError('Не удалось сохранить выбор языка. Проверьте свободное место.'); } }}>
            {course === id && <Check size={14} className="shrink-0" aria-hidden />}<span className="min-w-0 break-words">{title}</span>
          </button>)}
        </div>
        <p className={cn('mt-2 text-xs', styles.buttons.text.muted)}>Объяснения на русском · у каждого языка свой прогресс</p>
        {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>}
      </div>
    </section>
    <Suspense fallback={<p role="status" className={cn("p-8 text-center text-sm", styles.pageBackground, styles.buttons.text.secondary)}>Загружаем курс…</p>}>
      <MainMenu store={store} />
    </Suspense>
  </>;
}

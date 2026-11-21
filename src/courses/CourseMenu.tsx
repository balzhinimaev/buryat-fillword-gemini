import { lazy, Suspense, useEffect, useState } from 'react';
import { ChevronRight, Globe2 } from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { chooseCourse } from './progress';
import { activeCourseId, restartCourseApp } from './activeCourse';
import { learningProfile, PROFILE_EVENT, syncLearningProfile } from './enrollments';
import { progressOwner } from '../services/progressStorage';
import { COURSE_CATALOG } from './catalog';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { cn } from '../utils/cn';
const MainMenu = lazy(() => import('../screens/MainMenu'));
const CourseHub = lazy(() => import('./CourseHub'));
export default function CourseMenu({ store }: { store: GameStore }) {
  const { themeId } = useTheme(), styles = getMenuStyles(themeId);
  const [course] = useState(activeCourseId), [hub, setHub] = useState(false);
  const [owner] = useState(progressOwner);
  const [plan, setPlan] = useState(() => learningProfile(owner).courses[course]);
  useEffect(() => {
    const update = () => { if (owner === progressOwner()) setPlan(learningProfile(owner).courses[course]); };
    const sync = () => { if (owner === progressOwner()) void syncLearningProfile().catch(() => {}); };
    window.addEventListener(PROFILE_EVENT, update); window.addEventListener('online', sync); sync();
    return () => { window.removeEventListener(PROFILE_EVENT, update); window.removeEventListener('online', sync); };
  }, [owner, course]);
  const [error, setError] = useState('');
  const descriptor = COURSE_CATALOG[course];
  const loading = <p role="status" className={cn('p-8 text-center', styles.pageBackground, styles.buttons.text.secondary)}>Загружаем…</p>;
  if (hub) return <Suspense fallback={loading}><CourseHub activeId={course} onClose={() => setHub(false)} onEnter={id => {
    try { if (id === course) { setHub(false); return; } chooseCourse(id); restartCourseApp(); }
    catch { setError('Не удалось открыть курс. Проверь свободное место.'); setHub(false); }
  }} /></Suspense>;
  return <>
    <section aria-label="Текущий курс" className={cn('course-switcher', styles.pageGradient, styles.buttons.text.primary)} style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <button type="button" onClick={() => setHub(true)} aria-label={`Мои курсы. Сейчас: ${descriptor.title}`} className={cn('w-full min-h-14 rounded-2xl border px-3 py-2 flex items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500', styles.buttons.card.background, styles.buttons.card.border)}>
          <Globe2 size={23} className={styles.title.secondary} aria-hidden />
          <span className="flex-1 min-w-0"><span className="block text-sm font-semibold">{descriptor.title}</span><span className={cn('block text-xs mt-1', styles.buttons.text.secondary)}>{plan ? `${plan.minutes} мин. за занятие` : 'Объяснения на русском'}</span></span>
          <span className="text-sm font-semibold">Курсы</span><ChevronRight size={18} aria-hidden />
        </button>
        {error && <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    </section>
    <Suspense fallback={loading}><MainMenu store={store} /></Suspense>
  </>;
}

import { lazy, Suspense, useState } from 'react';
import { Globe2 } from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { chooseCourse } from './progress';
import { activeCourseId, restartCourseApp } from './activeCourse';
const MainMenu = lazy(() => import('../screens/MainMenu'));
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600';

export default function CourseMenu({ store }: { store: GameStore }) {
  const [course] = useState(activeCourseId);
  const [error, setError] = useState('');
  return <>
    <section aria-label="Выбор изучаемого языка" className="border-b border-stone-200 bg-white px-4 py-4 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <div><p className="flex items-center gap-2 text-sm font-semibold"><Globe2 size={17} aria-hidden />Мои языки</p><p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Объяснения и переводы на русском</p></div>
        <div className="flex flex-wrap gap-2">{([['bua-ru', 'Бурятский'], ['cs-ru', 'Чешский'], ['en-ru', 'Английский']] as const).map(([id, title]) => <button key={id} type="button" aria-pressed={course === id} className={`${button} ${course === id ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200'}`} onClick={() => { try { if (id === course) return; chooseCourse(id); restartCourseApp(); } catch { setError('Не удалось сохранить выбор языка. Проверьте свободное место.'); } }}>{title}</button>)}</div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
    </section>
    <Suspense fallback={<p className="p-8 text-center">Загружаем курс…</p>}>
      <MainMenu store={store} />
    </Suspense>
  </>;
}

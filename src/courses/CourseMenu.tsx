import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Check, Globe2, Play, RotateCcw, Volume2 } from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import type { Coord } from '../types';
import { czechCourse, type LearningCourse, type CourseId, type CourseLesson } from './czech';
import { extendSelection, selectedWord, type CourseBoard } from './engine';
import { chosenCourse, chooseCourse, completedLessons, completeCourseLesson, syncCourseProgress, COURSE_PROGRESS_EVENT } from './progress';
import { progressOwner } from '../services/progressStorage';
import { readDraft, writeDraft, clearDraft, draftBoard } from './draft';
import { englishCourse } from './english';
import ReviewPractice from './ReviewPractice';
import { dueWords } from './review';
const MainMenu = lazy(() => import('../screens/MainMenu'));
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600';

export default function CourseMenu({ store }: { store: GameStore }) {
  const [course, setCourse] = useState<CourseId>(chosenCourse);
  const [error, setError] = useState('');
  return <>
    <section aria-label="Выбор изучаемого языка" className="border-b border-stone-200 bg-white px-4 py-4 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <div><p className="flex items-center gap-2 text-sm font-semibold"><Globe2 size={17} aria-hidden />Мои языки</p><p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Объяснения и переводы на русском</p></div>
        <div className="flex flex-wrap gap-2">{([['bua-ru', 'Бурятский'], ['cs-ru', 'Чешский'], ['en-ru', 'Английский']] as const).map(([id, title]) => <button key={id} type="button" aria-pressed={course === id} className={`${button} ${course === id ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200'}`} onClick={() => { try { chooseCourse(id); setCourse(id); setError(''); } catch { setError('Не удалось сохранить выбор языка. Проверьте свободное место.'); } }}>{title}</button>)}</div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
    </section>
    <Suspense fallback={<p className="p-8 text-center">Загружаем курс…</p>}>
      {course === 'bua-ru' ? <MainMenu store={store} /> : <CzechCourse key={course} course={course === 'en-ru' ? englishCourse : czechCourse} />}
    </Suspense>
  </>;
}

export function CzechCourse({ course = czechCourse }: { course?: LearningCourse }) {
  const [completed, setCompleted] = useState(() => completedLessons(undefined, course));
  const [reviewTime, setReviewTime] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setReviewTime(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const [review, setReview] = useState(false);
  const [lesson, setLesson] = useState<CourseLesson | null>(null);
  const [status, setStatus] = useState('Прогресс сохраняется на этом устройстве.');
  const owner = progressOwner();
  useEffect(() => {
    let live = true;
    const changed = () => setCompleted(completedLessons(undefined, course));
    const sync = async () => {
      try {
        const saved = await syncCourseProgress(course);
        if (live) setStatus(saved ? 'Прогресс синхронизирован с аккаунтом.' : 'Прогресс сохраняется на этом устройстве.');
      } catch { if (live) setStatus('Сохранено на устройстве. Синхронизация повторится при подключении.'); }
    };
    window.addEventListener(COURSE_PROGRESS_EVENT, changed);
    window.addEventListener('online', sync);
    const timer = window.setInterval(sync, 30_000);
    void sync();
    return () => { live = false; clearInterval(timer); window.removeEventListener(COURSE_PROGRESS_EVENT, changed); window.removeEventListener('online', sync); };
  }, [owner, course]);
  const finish = (id: string) => {
    completeCourseLesson(id, owner, course);
    setCompleted(completedLessons(undefined, course));
    setStatus('Сохранено на этом устройстве.');
    void syncCourseProgress(course).then(saved => { if (progressOwner() === owner && saved) setStatus('Прогресс синхронизирован с аккаунтом.'); }).catch(() => {});
  };
  return <main className="min-h-[80dvh] bg-stone-50 px-4 py-6 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
    <div className="mx-auto max-w-3xl">
      {review ? <ReviewPractice course={course} onBack={() => setReview(false)} /> : lesson ? <CzechLesson course={course} key={lesson.id} lesson={lesson} onBack={() => setLesson(null)} onComplete={() => finish(lesson.id)} onNext={() => { const index = course.lessons.findIndex(l => l.id === lesson.id); setLesson(course.lessons[index + 1] || null); }} /> : <>
        <div className="mb-6 rounded-3xl bg-emerald-800 p-6 text-white">
          <p className="text-sm font-medium text-emerald-100">{course.nativeTitle} · первые шаги</p>
          <h1 className="mt-2 text-3xl font-bold">{course.title} через игру</h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-emerald-50">48 слов в 8 небольших уроках. Сначала познакомьтесь со словами, затем найдите их на поле. {course.language === 'cs' ? 'Буквы со значками сохраняются, а CH занимает одну клетку.' : 'Каждая английская буква занимает отдельную клетку.'}</p>
          <p className="mt-4 font-semibold">Пройдено {completed.length} из {course.lessons.length} уроков</p>
          <progress aria-label={`Прогресс курса: ${course.title}`} value={completed.length} max={course.lessons.length} className="mt-2 h-2 w-full accent-emerald-300" />
          <button type="button" className={`${button} mt-4 bg-white text-emerald-900`} onClick={() => setLesson(course.lessons.find(l => readDraft(l, course)) || course.lessons.find(l => !completed.includes(l.id)) || course.lessons[0])}><Play size={18} aria-hidden />{completed.length || course.lessons.some(l => readDraft(l, course)) ? 'Продолжить обучение' : 'Начать первый урок'}</button>
        </div>
        <section className="mb-5 rounded-2xl border border-emerald-200 bg-white p-4 dark:border-emerald-800 dark:bg-stone-900">
          <h2 className="text-lg font-bold">Закрепим изученное</h2>
          <p className="my-2 text-sm">{completed.length ? `Готовы к повторению: ${dueWords(course, reviewTime).length} слов. Вспоминайте перевод без подсказки; трудные слова встретятся чаще.` : 'Пройдите первый урок — затем проверьте, какие слова запомнились.'}</p>
          <button type="button" className={`${button} bg-emerald-700 text-white disabled:opacity-50`} disabled={!dueWords(course, reviewTime).length} onClick={() => setReview(true)}>Повторить слова</button>
        </section>
        <div className="grid gap-3 sm:grid-cols-2">{course.lessons.map((item, index) => <button type="button" key={item.id} onClick={() => setLesson(item)} className="flex min-h-24 items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-left focus-visible:outline-emerald-600 dark:border-stone-700 dark:bg-stone-900">
          <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${completed.includes(item.id) ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>{completed.includes(item.id) ? <Check size={22} /> : index + 1}</span>
          <span><span className="block font-bold">{item.title}</span><span className="mt-1 block text-sm text-stone-500 dark:text-stone-400">6 слов · {completed.includes(item.id) ? 'Пройдено — можно повторить' : 'Урок и филворд'}</span></span>
        </button>)}</div>
        <details className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"><summary className="min-h-11 cursor-pointer font-semibold">Словарь курса · 48 слов</summary><dl className="mt-3 grid gap-3 sm:grid-cols-2">{course.lessons.flatMap(l => l.words).map(word => <div key={word.id}><dt lang={course.language} className="font-semibold">{word.text}</dt><dd className="text-sm text-stone-500 dark:text-stone-400">{word.ru}</dd></div>)}</dl></details>
      </>}
      <p className="mt-5 text-sm text-stone-600 dark:text-stone-400" role="status">{status}</p>
      {owner === 'guest' && <p className="mt-1 text-xs text-stone-500">Гостевой прогресс привязан к этому устройству. При смене аккаунта он не переносится автоматически.</p>}
    </div>
  </main>;
}

function CzechLesson({ course, lesson, onBack, onComplete, onNext }: { course: LearningCourse; lesson: CourseLesson; onBack: () => void; onComplete: () => void; onNext: () => void }) {
  const [owner] = useState(progressOwner);
  const [draft] = useState(() => readDraft(lesson, course));
  const [version] = useState<1 | 2>(() => draft?.version ?? 2);
  const [hint, setHint] = useState<Coord | null>(null);
  const [seed] = useState(() => draft?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0]);
  const [board, setBoard] = useState<CourseBoard | null>(() => draft ? draftBoard(lesson, draft.seed, course, version) : null);
  const [draftError, setDraftError] = useState('');
  const persist = (ids: string[]) => {
    try { writeDraft(lesson, seed, ids, owner, course, version); setDraftError(''); }
    catch { setDraftError('Не удалось сохранить игру на устройстве. Не закрывайте страницу до завершения урока.'); }
  };
  const finish = () => {
    onComplete(); setSaved(true);
    try { clearDraft(lesson, owner, course); setDraftError(''); } catch { /* Completion is already durable. */ }
  };
  const [selected, setSelected] = useState<Coord[]>([]);
  const selection = useRef<Coord[]>([]);
  const gesture = useRef<{ moved: boolean } | null>(null);
  const [found, setFound] = useState<string[]>(() => draft?.found || []);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const load = () => setVoice(speechSynthesis.getVoices().find(v => v.lang.toLowerCase().split('-')[0] === course.language && v.localService) || null);
    load(); speechSynthesis.addEventListener('voiceschanged', load);
    return () => { speechSynthesis.removeEventListener('voiceschanged', load); speechSynthesis.cancel(); };
  }, [course.language]);
  useEffect(() => {
    const cancel = () => { gesture.current = null; selection.current = []; setSelected([]); };
    const hidden = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', hidden); };
  }, []);
  const update = (path: Coord[]) => { selection.current = path; setSelected(path); };
  const verify = () => {
    if (!board) return;
    const word = selectedWord(board, selection.current);
    if (!word) { setNotice('Пока не получилось. Начните с первой буквы и идите по соседним клеткам.'); selection.current = []; setSelected([]); return; }
    if (found.includes(word.id)) { setNotice('Это слово уже найдено.'); selection.current = []; setSelected([]); return; }
    setHint(null);
    const next = [...found, word.id]; setFound(next); persist(next);
    setNotice(`${word.text} — ${word.ru}. Верно!`); selection.current = []; setSelected([]);
    if (next.length === lesson.words.length) {
      try { finish(); } catch { setNotice('Урок пройден, но сохранить прогресс не удалось. Освободите место и нажмите «Сохранить результат».'); }
    }
  };
  const cellAt = (x: number, y: number): Coord | null => {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-course-cell]');
    if (!element) return null;
    return { r: Number(element.dataset.row), c: Number(element.dataset.col) };
  };
  const allFound = found.length === lesson.words.length;
  return <>
    <button type="button" className={`${button} mb-3 bg-white text-stone-700 dark:bg-stone-800 dark:text-stone-100`} onClick={onBack}><ArrowLeft size={18} aria-hidden />Все уроки</button>
    <h1 className="text-2xl font-bold">{lesson.title}</h1>
    {draft && <p className="my-2 text-sm text-emerald-700 dark:text-emerald-300">Игра восстановлена. Продолжайте с того же места.</p>}
    {draftError && <p role="alert" className="my-2 text-sm text-red-600">{draftError}</p>}
    {!board ? <>
      <p className="my-4 leading-relaxed text-stone-600 dark:text-stone-300">{lesson.note}</p>
      <ul className="space-y-2">{lesson.words.map(word => <li key={word.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"><div><p lang={course.language} className="text-xl font-bold">{word.text}</p><p className="text-stone-500 dark:text-stone-400">{word.ru}</p></div>{voice && <button type="button" aria-label={`Прослушать ${word.text}`} className={`${button} bg-stone-100 text-stone-700`} onClick={() => { speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(word.text); utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = .8; speechSynthesis.speak(utterance); }}><Volume2 size={20} aria-hidden /></button>}</li>)}</ul>
      {!voice && <p className="mt-3 text-xs text-stone-500">На устройстве нет доступного офлайн-голоса для выбранного языка. Урок можно пройти без озвучки.</p>}
      <button type="button" className={`${button} mt-5 w-full bg-emerald-700 text-white`} onClick={() => { setBoard(draftBoard(lesson, seed, course, version)); persist([]); }}><Play size={18} aria-hidden />Найти слова на поле</button>
    </> : <>
      <p className="my-3 text-sm text-stone-600 dark:text-stone-300">Ведите по буквам или нажимайте клетки по очереди, затем «Проверить». Только вверх, вниз, вправо и влево. {course.language === 'cs' ? 'CH — одна клетка.' : 'Одна буква — одна клетка.'}</p>
      <p className="mb-3 font-semibold" aria-live="polite">Найдено {found.length} из {lesson.words.length}</p>
      <p aria-live="polite" className="mb-3 min-h-7 text-center font-bold" lang={course.language}>{selected.length ? selected.map(p => board.grid[p.r][p.c]).join(' · ') : '…'}</p>
      <div className="mx-auto grid w-full max-w-md touch-none select-none gap-1.5" style={{ gridTemplateColumns: `repeat(${board.size}, minmax(0, 1fr))` }} aria-label={`Поле филворда: ${course.title}`}
        onPointerDown={event => { const cell = cellAt(event.clientX, event.clientY); if (!cell || allFound) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); gesture.current = { moved: false }; const next = extendSelection(selection.current, cell); update(next === selection.current ? [cell] : next); }}
        onPointerMove={event => { if (!gesture.current) return; const cell = cellAt(event.clientX, event.clientY); if (!cell) return; const next = extendSelection(selection.current, cell); if (next !== selection.current) { gesture.current.moved = true; update(next); } }}
        onPointerUp={() => { if (gesture.current?.moved) verify(); gesture.current = null; }} onPointerCancel={() => { gesture.current = null; update([]); }}>
        {board.grid.flatMap((row, r) => row.map((letter, c) => {
          const active = selected.some(p => p.r === r && p.c === c);
          const hinted = hint?.r === r && hint.c === c;
          const done = board.words.some(w => found.includes(w.word.id) && w.path.some(p => p.r === r && p.c === c));
          return <button key={`${r}-${c}`} type="button" data-course-cell data-row={r} data-col={c} aria-label={`${letter}, строка ${r + 1}, столбец ${c + 1}`} aria-pressed={active} disabled={allFound} lang={course.language} onClick={event => { if (event.detail === 0) update(extendSelection(selection.current, { r, c })); }} className={`aspect-square min-h-11 rounded-xl text-lg font-bold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:text-2xl ${hinted ? 'ring-4 ring-inset ring-sky-500' : ''} ${active ? 'bg-amber-400 text-stone-950' : done ? 'bg-emerald-700 text-white' : 'bg-white text-stone-800 dark:bg-stone-800 dark:text-stone-100'}`}>{letter}</button>;
        }))}
      </div>
      {!allFound && <div className="my-4 flex flex-wrap gap-2"><button type="button" className={`${button} bg-emerald-700 text-white`} disabled={!selected.length} onClick={verify}>Проверить</button><button type="button" className={`${button} bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-100`} onClick={() => update([])}><RotateCcw size={17} aria-hidden />Сбросить выделение</button><button type="button" className={`${button} bg-sky-100 text-sky-950`} onClick={() => { const word = board.words.find(w => !found.includes(w.word.id)); if (!word) return; update([]); setHint(word.path[0]); setNotice(`Начните здесь: ${word.word.ru}. Первая буква — ${board.grid[word.path[0].r][word.path[0].c]}.`); }}>Показать первую букву</button></div>}
      <p role="status" className="my-3 min-h-6 text-sm">{notice}</p>
      <ul className="grid gap-2 sm:grid-cols-2">{lesson.words.map(word => <li key={word.id} className={`rounded-xl p-3 text-sm ${found.includes(word.id) ? 'bg-emerald-100 text-emerald-900' : 'bg-white dark:bg-stone-900'}`}>{found.includes(word.id) ? `${word.text} — ${word.ru} ✓` : word.ru}</li>)}</ul>
      {!allFound && <details className="mt-4"><summary className="min-h-11 cursor-pointer text-sm font-semibold">Подсказка: как пишутся слова</summary><p lang={course.language} className="p-3">{lesson.words.filter(w => !found.includes(w.id)).map(w => w.text).join(' · ')}</p></details>}
      {allFound && <section className="mt-5 rounded-2xl bg-emerald-100 p-5 text-emerald-950"><h2 className="text-xl font-bold">Отлично! Все слова найдены</h2><p className="mt-2">{saved ? 'Результат сохранён в выбранном курсе.' : 'Результат ещё не сохранён.'}</p>{!saved && <button type="button" className={`${button} mt-3 bg-white`} onClick={() => { try { finish(); } catch { setNotice('Сохранение недоступно. Проверьте свободное место.'); } }}>Сохранить результат</button>}<button type="button" className={`${button} mt-3 bg-emerald-800 text-white`} onClick={onNext}><BookOpen size={18} aria-hidden />Следующий урок</button></section>}
    </>}
  </>;
}

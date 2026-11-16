import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronRight, Pause, Plus, Play } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { cn } from '../utils/cn';
import { useBackButton } from '../hooks/useTelegram';
import { progressOwner } from '../services/progressStorage';
import { availableCourses, COURSE_CATALOG, starterCourse } from './catalog';
import { completedLessons } from './progress';
import { acceptRemotePlan, GOALS, learningProfile, PROFILE_EVENT, saveCoursePlan, syncLearningProfile, type CoursePlan, type LearningProfile } from './enrollments';
import type { CourseId } from './model';

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500';
interface Props { activeId: CourseId; onClose: () => void; onEnter: (id: CourseId) => void }
export default function CourseHub({ activeId, onClose, onEnter }: Props) {
  const { themeId } = useTheme(), styles = getMenuStyles(themeId);
  const [owner] = useState(progressOwner);
  const [profile, setProfile] = useState<LearningProfile>(() => learningProfile(owner));
  const [view, setView] = useState<'mine' | 'catalog'>('mine');
  const [detail, setDetail] = useState<CourseId>();
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const back = () => detail ? setDetail(undefined) : onClose();
  useBackButton(back);
  const card = cn('rounded-2xl border p-4', styles.buttons.card.background, styles.buttons.card.border);
  useEffect(() => {
    let live = true;
    const update = () => { if (live && owner === progressOwner()) setProfile(learningProfile(owner)); };
    const sync = () => { void syncLearningProfile().then(result => {
      if (!live || owner !== progressOwner()) return;
      setSyncStatus(result === 'synced' ? 'Курсы и учебные планы синхронизированы с аккаунтом.' : result === 'conflict' ? 'Есть изменения с другого устройства — проверь план курса.' : 'Учебные планы сохранены на этом устройстве.');
    }).catch(() => { if (live) setSyncStatus('План сохранён на устройстве. Синхронизация повторится при подключении.'); }); };
    window.addEventListener(PROFILE_EVENT, update); window.addEventListener('online', sync); sync();
    return () => { live = false; window.removeEventListener(PROFILE_EVENT, update); window.removeEventListener('online', sync); };
  }, [owner]);
  const act = (action: () => void) => {
    try { if (owner !== progressOwner()) throw new Error('owner'); action(); setError(''); setProfile(learningProfile(owner)); setSyncStatus('План сохранён на устройстве.'); void syncLearningProfile().then(result => { if (owner === progressOwner()) setSyncStatus(result === 'synced' ? 'Курсы и учебные планы синхронизированы с аккаунтом.' : result === 'conflict' ? 'Проверь изменения плана с другого устройства.' : 'Учебные планы сохранены на этом устройстве.'); }).catch(() => {}); }
    catch { setError('Не удалось сохранить изменения. Проверь аккаунт и свободное место, затем попробуй снова.'); }
  };
  const enter = (id: CourseId) => act(() => {
    const plan = learningProfile(owner).courses[id];
    if (!plan) { setDetail(id); return; }
    if (plan.status === 'paused') saveCoursePlan(id, { ...plan, status: 'active' }, owner);
    onEnter(id);
  });
  const courseList = availableCourses().filter(c => view === 'catalog' || profile.courses[c.id]);
  return <div className={cn('min-h-[100dvh] px-4 pb-10', styles.pageGradient, styles.buttons.text.primary)} style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
    <div className="max-w-2xl mx-auto space-y-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={back} aria-label={detail ? 'Назад к курсам' : 'Назад к занятию'} className={cn('min-w-11 min-h-11 rounded-xl flex items-center justify-center', focus, styles.buttons.card.background)}><ArrowLeft size={22} /></button>
        <div><h1 className="text-2xl font-bold">{detail ? COURSE_CATALOG[detail].title : 'Мои курсы'}</h1><p className={cn('text-sm mt-1', styles.buttons.text.secondary)}>Один аккаунт · отдельный путь для каждого языка</p></div>
      </header>
      {error && <p role="alert" className="text-red-500 text-sm">{error}</p>}
      {detail ? <CourseDetails key={detail} id={detail} activeId={activeId} profile={profile} onSave={input => act(() => saveCoursePlan(detail, input, owner))} onStart={input => act(() => { saveCoursePlan(detail, input, owner); onEnter(detail); })} onAccept={() => act(() => acceptRemotePlan(detail, owner))} /> : <>
        <section aria-label="Языки обучения" className={card}>
          <h2 className="font-semibold">Как ты учишься</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><dt className={styles.buttons.text.muted}>Интерфейс</dt><dd className="font-semibold mt-1">Русский</dd></div>
            <div><dt className={styles.buttons.text.muted}>Объяснения и переводы</dt><dd className="font-semibold mt-1">Русский</dd></div>
          </dl>
          <p className={cn('mt-3 text-xs leading-relaxed', styles.buttons.text.secondary)}>Изучаемый язык выбирается в курсе. Другие языки объяснений появятся вместе с подготовленными программами.</p>
        </section>
        <div className="flex gap-2" role="group" aria-label="Разделы курсов">
          <button type="button" aria-pressed={view === 'mine'} onClick={() => setView('mine')} className={cn('min-h-11 flex-1 rounded-xl px-3 font-semibold border', focus, view === 'mine' ? styles.title.secondary : styles.buttons.text.secondary, styles.buttons.card.border)}>Мои курсы</button>
          <button type="button" aria-pressed={view === 'catalog'} onClick={() => setView('catalog')} className={cn('min-h-11 flex-1 rounded-xl px-3 font-semibold border', focus, view === 'catalog' ? styles.title.secondary : styles.buttons.text.secondary, styles.buttons.card.border)}>Каталог курсов</button>
        </div>
        <div className="space-y-3">{courseList.map(c => {
          const plan = profile.courses[c.id], content = starterCourse(c.id);
          const finished = content ? completedLessons(owner, content).length : null;
          return <article key={c.id} className={card}>
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{c.title}</h2><p className={cn('text-xs mt-1', styles.buttons.text.secondary)}>Русский → {c.title} · {c.nativeTitle}</p></div>
              {activeId === c.id ? <span className={cn('text-xs font-semibold flex items-center gap-1', styles.title.secondary)}><Check size={14} />Сейчас открыт</span> : plan?.status === 'paused' && <span className={cn('text-xs', styles.buttons.text.muted)}>На паузе</span>}
            </div>
            <p className={cn('mt-3 text-sm', styles.buttons.text.secondary)}>{c.description}</p>
            {plan && <p className={cn('mt-2 text-xs', styles.buttons.text.muted)}>{GOALS[plan.goal]} · ориентир {plan.minutes} мин. за занятие</p>}
            {finished !== null && <p className={cn('mt-2 text-xs', styles.buttons.text.secondary)}>Филворды уроков: {finished} из {content!.lessons.length}</p>}
            {plan?.conflict && <p className="mt-2 text-sm text-amber-600">Проверь изменения учебного плана</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {plan && <button type="button" onClick={() => enter(c.id)} className={cn('min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-white flex items-center gap-2', focus, styles.buttons.play.gradient)}><Play size={16} aria-hidden />{c.id === activeId ? 'Вернуться к занятию' : plan.status === 'paused' ? 'Возобновить курс' : 'Продолжить курс'}</button>}
              <button type="button" onClick={() => setDetail(c.id)} className={cn('min-h-11 rounded-xl px-3 py-2 border text-sm font-semibold flex items-center gap-2', focus, styles.buttons.card.border)}>{plan ? <BookOpen size={16} /> : <Plus size={16} />}{plan ? 'Программа и план' : 'Посмотреть курс'}<ChevronRight size={14} /></button>
            </div>
          </article>;
        })}</div>
      </>}
      <p role="status" className={cn('text-xs leading-relaxed', styles.buttons.text.muted)}>{syncStatus || 'Сохранение учебного профиля…'}</p>
      <p className={cn('text-xs leading-relaxed', styles.buttons.text.muted)}>Добавление или пауза курса не удаляет результаты. Планы и список курсов синхронизируются после входа. Звёзды, XP и незаконченные игры английского и чешского пока остаются на устройстве.</p>
    </div>
  </div>;
}
function CourseDetails({ id, activeId, profile, onSave, onStart, onAccept }: { id: CourseId; activeId: CourseId; profile: LearningProfile; onSave: (p: CoursePlan) => void; onStart: (p: CoursePlan) => void; onAccept: () => void }) {
  const { themeId } = useTheme(), styles = getMenuStyles(themeId), course = COURSE_CATALOG[id], content = starterCourse(id), saved = profile.courses[id];
  const [draft, setDraft] = useState<Pick<CoursePlan, 'goal' | 'minutes'>>();
  const goal = draft?.goal ?? saved?.goal ?? 'everyday';
  const minutes = draft?.minutes ?? saved?.minutes ?? 5;
  const plan = { courseId: id, goal, minutes, status: 'active' as const, revision: saved?.revision ?? 0 };
  const card = cn('rounded-2xl p-4 border', styles.buttons.card.background, styles.buttons.card.border);
  return <div className="space-y-4">
    <section className={card}><h2 className="font-bold">Русский → {course.title}</h2><p className={cn('mt-2 text-sm', styles.buttons.text.secondary)}>{course.scope}</p><p className={cn('mt-2 text-sm', styles.buttons.text.secondary)}>{course.letterNote}</p>
      <p className={cn('mt-3 text-sm', styles.buttons.text.secondary)}>Учебник → карточки → филворды → проверка знаний. Играть можно и отдельно от уроков.</p>
      {content && <><p className="mt-3 text-sm font-semibold">{content.lessons.length} уроков · {content.lessons.flatMap(l => l.words).length} слов</p><ol className={cn('mt-2 grid sm:grid-cols-2 gap-2 text-sm list-decimal list-inside', styles.buttons.text.secondary)}>{content.lessons.map(l => <li key={l.id}>{l.title}</li>)}</ol></>}
    </section>
    <section className={card}><h2 className="font-bold">Мой учебный план</h2>
      <label className="block mt-4 text-sm font-semibold">Зачем изучаю язык<select value={goal} onChange={e => setDraft({ minutes, goal: e.target.value as CoursePlan['goal'] })} className={cn('block mt-2 w-full min-h-12 rounded-xl border px-3', focus, styles.pageBackground, styles.buttons.card.border)}>{Object.entries(GOALS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <fieldset className="mt-4"><legend className="text-sm font-semibold">Сколько времени удобно выделять</legend><div className="flex gap-2 mt-2">{([5, 10, 15] as const).map(n => <label key={n} className={cn('flex-1 min-h-12 rounded-xl border px-2 flex items-center justify-center gap-2 text-sm cursor-pointer', styles.buttons.card.border)}><input type="radio" name="course-minutes" value={n} checked={n === minutes} onChange={() => setDraft({ goal, minutes: n })} />{n} мин.</label>)}</div></fieldset>
      <p className={cn('mt-3 text-xs leading-relaxed', styles.buttons.text.muted)}>Это ориентир для занятия, не таймер и не обязательная норма. Цель сохраняется в плане; состав программы пока одинаковый для всех целей.</p>
      {saved?.conflict && <div role="alert" className="mt-4 text-sm"><p>На другом устройстве сохранён план: {GOALS[saved.conflict.goal]}, {saved.conflict.minutes} мин. Старый план не перезаписан.</p><button type="button" onClick={() => { onAccept(); setDraft(undefined); }} className={cn('min-h-11 underline underline-offset-4', focus)}>Принять план с другого устройства</button></div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onStart(plan)} className={cn('min-h-11 rounded-xl px-4 font-semibold text-white', focus, styles.buttons.play.gradient)}>{saved ? 'Сохранить и учиться' : 'Добавить курс и начать'}</button>
        {saved && <button type="button" onClick={() => onSave({ ...plan, status: saved.status })} className={cn('min-h-11 rounded-xl px-3 border text-sm font-semibold', focus, styles.buttons.card.border)}>{saved.conflict ? 'Сохранить мой план' : 'Сохранить план'}</button>}
        {saved && id !== activeId && <button type="button" onClick={() => onSave({ ...plan, status: saved.status === 'paused' ? 'active' : 'paused' })} className={cn('min-h-11 rounded-xl px-3 flex items-center gap-2 text-sm', focus)}><Pause size={16} />{saved.status === 'paused' ? 'Снять с паузы' : 'Поставить на паузу'}</button>}
      </div>
    </section>
  </div>;
}

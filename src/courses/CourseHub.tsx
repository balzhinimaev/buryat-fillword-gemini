import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronDown, ChevronRight, Pause, Plus } from 'lucide-react';
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
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [detail, view]);
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
    <div className="max-w-2xl mx-auto">
      <header className="flex items-center gap-3 mb-5">
        <button type="button" onClick={back} aria-label={detail ? 'Назад к курсам' : 'Назад к занятию'} className={cn('w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border', focus, styles.buttons.card.background, styles.buttons.card.border)}><ArrowLeft size={20} /></button>
        <div className="min-w-0"><p className={cn('text-[11px] font-semibold tracking-widest uppercase mb-1', styles.buttons.text.muted)}>Языки и практика</p><h1 className="text-2xl font-semibold tracking-tight">{detail ? COURSE_CATALOG[detail].title : 'Мои курсы'}</h1></div>
      </header>
      {error && <p role="alert" className="text-red-500 text-sm mb-4">{error}</p>}
      {detail ? <CourseDetails key={detail} id={detail} activeId={activeId} profile={profile} onSave={input => act(() => saveCoursePlan(detail, input, owner))} onStart={input => act(() => { saveCoursePlan(detail, input, owner); onEnter(detail); })} onAccept={() => act(() => acceptRemotePlan(detail, owner))} /> : <>
        <p className={cn('text-sm leading-relaxed mb-5 max-w-md', styles.buttons.text.secondary)}>Начни с нескольких слов — продолжай в своём ритме.</p>
        <div className="flex gap-1 border-b mb-5" role="group" aria-label="Разделы курсов">
          <button type="button" aria-pressed={view === 'mine'} onClick={() => setView('mine')} className={cn('min-h-12 px-3 text-sm border-b-2 transition-colors', focus, view === 'mine' ? 'border-current font-semibold ui-accent-text' : 'border-transparent ui-dimmed')}>Мои курсы <span className="ml-1 opacity-60">{availableCourses().filter(c => profile.courses[c.id]).length}</span></button>
          <button type="button" aria-label="Каталог курсов" aria-pressed={view === 'catalog'} onClick={() => setView('catalog')} className={cn('min-h-12 px-3 text-sm border-b-2 transition-colors', focus, view === 'catalog' ? 'border-current font-semibold ui-accent-text' : 'border-transparent ui-dimmed')}>Все языки <span className="ml-1 opacity-60">{availableCourses().length}</span></button>
        </div>
        <section aria-label={view === 'mine' ? 'Твои курсы' : 'Доступные языки'} className={cn('rounded-2xl border overflow-hidden', styles.buttons.card.background, styles.buttons.card.border)}>
          {courseList.map((c, index) => {
            const plan = profile.courses[c.id], content = starterCourse(c.id);
            const finished = content ? completedLessons(owner, content).length : null;
            return <article key={c.id} className={cn('p-4 sm:p-5', index > 0 && ['border-t', styles.buttons.card.border])}>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="w-10 h-10 shrink-0 rounded-xl ui-soft ui-accent-text flex items-center justify-center text-xs font-bold tracking-wide">{c.id === 'bua-ru' ? 'БУ' : c.id === 'en-ru' ? 'EN' : 'ČE'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1"><h2 className="text-lg font-semibold tracking-tight">{c.title}</h2>
                    {activeId === c.id ? <span className="text-[11px] font-medium inline-flex items-center gap-1 ui-accent-text"><Check size={12} />Выбран</span> : plan?.status === 'paused' && <span className={cn('text-[11px]', styles.buttons.text.muted)}>На паузе</span>}
                  </div>
                  <p className={cn('text-xs mt-0.5', styles.buttons.text.muted)}>{c.nativeTitle}{content ? ' · С нуля' : ''}</p>
                </div>
              </div>
              <p className={cn('mt-3 text-sm leading-relaxed', styles.buttons.text.secondary)}>{c.description}</p>
              <div className={cn('mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs', styles.buttons.text.muted)}>
                {plan && <span>{plan.minutes} мин. за занятие</span>}
                {content && <span>{plan ? `Филлворды: ${finished} / ${content.lessons.length}` : `${content.lessons.length} уроков для старта`}</span>}
                {!content && <span>Уроки и филлворды</span>}
              </div>
              {plan?.conflict && <p className="mt-2 text-xs text-amber-600">Проверь изменения учебного плана</p>}
              <div className="mt-3 flex items-center justify-between flex-wrap gap-x-3 gap-y-1">
                <button type="button" onClick={() => setDetail(c.id)} aria-label={plan ? `Программа и план: ${c.title}` : 'Посмотреть курс'} className={cn('min-h-11 text-sm font-medium inline-flex items-center gap-1', focus, styles.title.secondary)}>{plan ? 'План курса' : 'Посмотреть курс'}<ChevronRight size={15} aria-hidden /></button>
                {plan && <button type="button" onClick={() => enter(c.id)} aria-label={`${plan.status === 'paused' ? 'Возобновить' : 'Продолжить'} курс: ${c.title}`} className={cn('min-h-11 rounded-xl px-4 text-sm font-semibold text-white inline-flex items-center gap-2', focus, styles.buttons.play.gradient)}>{plan.status === 'paused' ? 'Возобновить' : 'Продолжить'}</button>}
              </div>
            </article>;
          })}
          {courseList.length === 0 && <p className={cn('p-5 text-sm', styles.buttons.text.secondary)}>Выбери первый язык во вкладке «Все языки».</p>}
        </section>
        {view === 'mine' && <button type="button" onClick={() => setView('catalog')} className={cn('w-full min-h-14 mt-3 flex items-center justify-center gap-2 text-sm font-medium rounded-xl', focus, styles.title.secondary)}><Plus size={17} />Добавить язык</button>}
        <p className={cn('mt-5 text-xs text-center', styles.buttons.text.muted)}>Объяснения на русском · отдельный прогресс для каждого языка</p>
      </>}
      <details className={cn('mt-6 text-xs leading-relaxed', styles.buttons.text.muted)}>
        <summary className={cn('cursor-pointer min-h-11 flex items-center gap-2', focus)}><BookOpen size={14} />О сохранении прогресса</summary>
        <p role="status" className="mt-2">{syncStatus || 'Проверяем сохранение учебного профиля…'}</p>
        <p className="mt-2">Добавление или пауза курса не удаляет результаты. Планы и список курсов синхронизируются после входа. Звёзды, XP и незаконченные игры английского и чешского пока остаются на устройстве.</p>
      </details>
    </div>
  </div>;
}
function CourseDetails({ id, activeId, profile, onSave, onStart, onAccept }: { id: CourseId; activeId: CourseId; profile: LearningProfile; onSave: (p: CoursePlan) => void; onStart: (p: CoursePlan) => void; onAccept: () => void }) {
  const { themeId } = useTheme(), styles = getMenuStyles(themeId), course = COURSE_CATALOG[id], content = starterCourse(id), saved = profile.courses[id];
  const [draft, setDraft] = useState<Pick<CoursePlan, 'goal' | 'minutes'>>();
  const goal = draft?.goal ?? saved?.goal ?? 'everyday';
  const minutes = draft?.minutes ?? saved?.minutes ?? 5;
  const plan = { courseId: id, goal, minutes, status: 'active' as const, revision: saved?.revision ?? 0 };
  const goalLabels = { everyday: 'Для общения', travel: 'Для путешествий', culture: 'Для языка и культуры' };
  return <div className="space-y-4">
    <section className="pb-2">
      <p className="text-lg font-medium leading-relaxed">{course.description}</p>
      <p className={cn('mt-2 text-sm leading-relaxed', styles.buttons.text.secondary)}>{content ? course.scope : 'Знакомься со словами в учебнике, закрепляй их в игре и обсуждай открытия в сообществе.'}</p>
      <p className={cn('mt-3 text-xs', styles.buttons.text.muted)}>Объяснения на русском{content ? ` · ${content.lessons.length} уроков · ${content.lessons.flatMap(l => l.words).length} слов` : ''}</p>
      <details className={cn('mt-4 border-t border-b py-1', styles.buttons.card.border)}>
        <summary className={cn('min-h-11 cursor-pointer flex items-center justify-between text-sm font-semibold', focus)}>Что внутри курса<ChevronRight size={16} aria-hidden /></summary>
        <p className={cn('text-sm leading-relaxed py-2', styles.buttons.text.secondary)}>Учебник, карточки, филлворды и проверка знаний. Играть можно и отдельно от уроков.</p>
        {content && <ol className={cn('pb-3 grid sm:grid-cols-2 gap-2 text-sm list-decimal list-inside', styles.buttons.text.secondary)}>{content.lessons.map(l => <li key={l.id}>{l.title}</li>)}</ol>}
        <p className={cn('text-xs pb-3', styles.buttons.text.muted)}>{course.letterNote}</p>
      </details>
    </section>
    <section aria-labelledby="course-plan-title" className="course-plan py-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="course-plan-title" className="text-lg font-semibold tracking-tight">Мой учебный план</h2>
      </div>
      <div className="course-plan-goal relative mt-5">
        <label htmlFor="course-plan-goal" className={cn('text-xs', styles.buttons.text.muted)}>Моя цель</label>
        <select id="course-plan-goal" aria-label="Зачем изучаю язык" value={goal} onChange={e => setDraft({ minutes, goal: e.target.value as CoursePlan['goal'] })}
          className={cn('block w-full min-h-11 appearance-none bg-transparent pr-6 text-sm font-semibold outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-500', styles.buttons.text.primary)}>
          {Object.entries(goalLabels).map(([value, label]) => <option key={value} value={value} className="ui-card ui-text">{label}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-1 bottom-3.5 pointer-events-none ui-dimmed" aria-hidden />
      </div>
      <fieldset className="mt-5">
        <legend className={cn('text-xs mb-3', styles.buttons.text.secondary)}>Время на занятие</legend>
        <div className="grid grid-cols-3 gap-2">
          {([5, 10, 15] as const).map(n => <label key={n} className="cursor-pointer min-w-0">
            <input type="radio" name="course-minutes" value={n} aria-label={`${n} мин.`} checked={n === minutes} onChange={() => setDraft({ goal, minutes: n })} className="sr-only course-plan-radio" />
            <span className="course-plan-time flex min-h-11 items-center justify-center gap-1 rounded-lg px-2">
              <span className="text-sm font-semibold tabular-nums">{n}</span>
              <span className="text-sm">мин.</span>
            </span>
          </label>)}
        </div>
      </fieldset>
      <details className={cn('mt-3 text-xs leading-relaxed', styles.buttons.text.muted)}>
        <summary className={cn('min-h-11 flex items-center gap-1 cursor-pointer', focus)}>Без таймера и обязательной нормы<ChevronDown size={12} aria-hidden /></summary>
        <p className="pb-2">Длительность — ориентир для занятия. Цель сохраняется в плане; программа пока одинаковая для всех целей.</p>
      </details>
      {saved?.conflict && <div role="alert" className="mt-4 text-sm"><p>На другом устройстве сохранён план: {GOALS[saved.conflict.goal]}, {saved.conflict.minutes} мин. Старый план не перезаписан.</p><button type="button" onClick={() => { onAccept(); setDraft(undefined); }} className={cn('min-h-11 underline underline-offset-4', focus)}>Принять план с другого устройства</button></div>}
      <div className="mt-2 space-y-1">
        <button type="button" onClick={() => onStart(plan)} className={cn('course-plan-start w-full min-h-12 rounded-xl px-4 text-sm font-semibold text-white', focus)}>{saved ? 'Сохранить и учиться' : 'Добавить курс и начать'}</button>
        {saved && <button type="button" onClick={() => onSave({ ...plan, status: saved.status })} className={cn('w-full min-h-11 rounded-xl px-3 text-sm font-medium', focus, styles.title.secondary)}>{saved.conflict ? 'Сохранить мой план' : 'Сохранить план'}</button>}
        {saved && id !== activeId && <button type="button" onClick={() => onSave({ ...plan, status: saved.status === 'paused' ? 'active' : 'paused' })} className={cn('w-full min-h-11 rounded-xl px-3 flex items-center justify-center gap-2 text-xs', focus, styles.buttons.text.muted)}><Pause size={16} />{saved.status === 'paused' ? 'Снять с паузы' : 'Поставить на паузу'}</button>}
      </div>
    </section>
  </div>;
}

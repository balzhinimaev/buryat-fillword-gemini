import { readClassicDraft } from '../courses/classicDraft';
import { additionalCourse, courseTitle, isAdditionalCourse } from '../courses/activeCourse';
import { completedLessons, syncCourseProgress } from '../courses/progress';
import ReviewPractice from '../courses/ReviewPractice';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, BookOpen, CheckCircle2, ChevronDown, Flame, GraduationCap, Heart, HelpCircle, Home, MessageCircle, Play, RotateCcw, Settings, Shield, Star, Trophy, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { cn } from '../utils/cn';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';
import { IS_VK_MINIAPP } from '../services/vkMiniApp';
import { OFFLINE } from '../config/offline';
import { TextbookQuiz } from '../components/TextbookQuiz';
import { buildReviewQuiz, courseProgress, fetchPracticeLessons, getMistakeWords, getUnitStatuses, TEXTBOOK_PROGRESS_EVENT, type PracticeLessonInfo } from '../services/textbook';
import { trackAnalyticsEventNonBlocking } from '../utils/analytics';

function localDate(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const MainMenu = ({ store }: { store: GameStore }) => {
  const { state, navigate } = store;
  const { stats } = state;
  const course = additionalCourse();
  const [spacedReview, setSpacedReview] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);
  const { openLink } = useTelegram();
  const { state: auth, refreshUser } = useAuth();
  const [lessons, setLessons] = useState<Record<string, PracticeLessonInfo>>({});
  const [revision, setRevision] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mistakes, setMistakes] = useState(() => getMistakeWords().length);
  const [today, setToday] = useState(() => localDate(new Date()));

  useEffect(() => {
    let active = true;
    void fetchPracticeLessons().then(value => { if (active) setLessons(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const update = () => {
      setRevision(value => value + 1);
      setMistakes(getMistakeWords().length);
      setToday(localDate(new Date()));
    };
    window.addEventListener(TEXTBOOK_PROGRESS_EVENT, update);
    window.addEventListener('focus', update);
    const timer = window.setInterval(() => setToday(localDate(new Date())), 60_000);
    return () => {
      window.removeEventListener(TEXTBOOK_PROGRESS_EVENT, update);
      window.removeEventListener('focus', update);
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => { if (auth.isAuthenticated) void refreshUser(); }, [auth.isAuthenticated, refreshUser]);

  useEffect(() => {
    if (!course) return;
    let live = true;
    const sync = () => { void syncCourseProgress(course).then(ok => {
      if (live) setSyncStatus(ok ? 'Пройденные уроки синхронизированы с аккаунтом.' : 'Пройденные уроки сохранены на устройстве.');
    }).catch(() => { if (live) setSyncStatus('Пройденные уроки сохранены на устройстве; синхронизация повторится при подключении.'); }); };
    sync(); window.addEventListener('online', sync);
    return () => { live = false; window.removeEventListener('online', sync); };
  }, [course]);
  const statuses = useMemo(() => {
    void revision;
    return getUnitStatuses(Object.fromEntries(Object.entries(lessons).map(([slug, lesson]) => [slug, lesson.stars])));
  }, [lessons, revision]);
  const progress = courseProgress(statuses);
  const nextUnit = statuses.find(unit => !unit.completed && (unit.theoryRead || unit.quizPassed || unit.practiceStars > 0))
    ?? statuses.find(unit => !unit.completed);
  const streak = (isAdditionalCourse() ? undefined : auth.user)?.streak?.current ?? stats.currentStreak;
  const stars = course ? Object.values(lessons).reduce((sum, l) => sum + l.stars, 0) : auth.user?.campaignStats?.totalStars ?? stats.totalStars;
  const level = (isAdditionalCourse() ? undefined : auth.user)?.xp?.level ?? stats.level;
  const xpProgress = Math.min(100, Math.max(0, (isAdditionalCourse() ? undefined : auth.user)?.xp?.progressPercent ?? store.xpProgress * 100));
  const lastActive = (isAdditionalCourse() ? undefined : auth.user)?.streak?.lastActiveDate ?? stats.lastPlayedDate;
  const goalDone = Boolean(lastActive && localDate(lastActive) === today);
  const first = !state.settings.hasSeenHowTo;
  const savedLesson = course?.lessons.find(l => readClassicDraft(l.id));
  const resumeSlug = state.campaignResumeSlug ?? savedLesson?.id;
  const hasResume = Boolean(resumeSlug);
  const allowDonate = !IS_VK_MINIAPP && !auth.isNewUser && (stars > 0 || streak > 0);
  const card = cn('rounded-2xl border', styles.buttons.card.background, styles.buttons.card.border);
  const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500';
  const primaryTitle = first ? 'Начать с трёх слов' : hasResume ? 'Продолжить игру' : nextUnit ? 'Продолжить занятие' : 'Выбрать игру';
  const primaryHint = first ? 'Попробуй на небольшом поле, без таймера' : hasResume ? 'Вернись к начатому уровню' : nextUnit ? nextUnit.unit.title : 'Курс пройден — закрепи знания в игре';
  const continueLearning = () => {
    if (first) { navigate('howto'); return; }
    if (resumeSlug) {
      trackAnalyticsEventNonBlocking('resume_clicked', { ctx: { source: 'menu' }, props: { slug: resumeSlug } });
      store.setCampaignLandingView(null);
      store.selectCategory(resumeSlug);
      store.setCampaignResumeSlug(null);
      return;
    }
    if (nextUnit) store.navigateToTextbookUnit(nextUnit.unit.slug);
    else navigate('gameMode');
  };
  const secondary = (label: string, icon: LucideIcon, onClick: () => void, hint?: string) => {
    const Icon = icon;
    return <button key={label} type="button" onClick={onClick} className={cn('w-full min-h-14 flex items-center gap-3 p-3 text-left rounded-xl', focus, isDark ? 'hover:bg-white/5' : 'hover:bg-black/5')}>
      <Icon size={20} className={cn('shrink-0', styles.buttons.text.muted)} />
      <span className="min-w-0 flex-1"><span className={cn('block text-sm font-semibold', styles.buttons.text.primary)}>{label}</span>{hint && <span className={cn('block mt-0.5 text-xs', styles.buttons.text.muted)}>{hint}</span>}</span>
      <ArrowRight size={16} className={styles.buttons.text.muted} />
    </button>;
  };
  if (spacedReview && course) return <ReviewPractice course={course} onBack={() => setSpacedReview(false)} />;
  return (
    <div className={cn('min-h-[100dvh] flex flex-col', styles.pageGradient)} style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}>
        <header className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className={cn('text-xs tracking-widest uppercase', styles.title.secondary)}>{courseTitle()} · Филлворд</p>
            <h1 className={cn('text-3xl font-bold tracking-tight mt-1', styles.title.primary)}>Сегодня</h1>
          </div>
          <button type="button" onClick={() => navigate('profile')} aria-label="Открыть профиль" className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', card, focus)}>
            <UserRound size={22} className={styles.title.secondary} />
          </button>
        </header>
        <main className="space-y-5">
          {course && <section className={cn(card, 'p-4 text-sm')}>
            <p>{syncStatus} Звёзды, XP и результаты проверок пока хранятся на этом устройстве отдельно для каждого языка.</p>
            {completedLessons(undefined, course).length > 0 && <button className="mt-3 min-h-11 font-semibold" onClick={() => setSpacedReview(true)}>Повторить слова по расписанию</button>}
          </section>}
          <section aria-label="Следующее занятие">
            <p className={cn('text-sm mb-3', styles.buttons.text.secondary)}>Несколько минут для себя и родного языка.</p>
            <button type="button" onClick={continueLearning} className={cn('w-full rounded-3xl p-5 sm:p-6 text-left text-white relative overflow-hidden', styles.buttons.play.gradient, focus)}>
              <svg aria-hidden="true" viewBox="0 0 200 40" className="absolute right-0 top-0 w-40 h-8 text-white/10"><path d="M0 20h20l10-10 10 10h20l10 10 10-10h20l10-10 10 10h20l10 10 10-10h40" stroke="currentColor" fill="none" strokeWidth="3" /></svg>
              <span className="text-xs uppercase tracking-widest text-white/80">{first ? 'Первый шаг' : 'Твой следующий шаг'}</span>
              <span className="flex items-center gap-3 mt-3"><span className="flex-1 min-w-0"><span className="block text-xl sm:text-2xl font-bold leading-tight">{primaryTitle}</span><span className="block text-sm mt-2 text-white/90 leading-relaxed">{primaryHint}</span></span><Play size={24} className="shrink-0" /></span>
            </button>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-2">
              <p className={cn('text-xs', styles.buttons.text.muted)}>{OFFLINE ? 'Можно играть без интернета' : 'Занимайся в своём темпе'}</p>
              <button type="button" onClick={() => navigate('gameMode')} className={cn('min-h-11 text-sm underline underline-offset-4', focus, styles.buttons.text.secondary)}>Все игровые режимы</button>
            </div>
          </section>

          <section aria-label="План на сегодня" className={cn(card, 'p-4')}>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className={cn('shrink-0 mt-0.5', goalDone ? 'text-emerald-500' : styles.buttons.text.muted)} />
              <div className="flex-1"><h2 className={cn('font-semibold text-sm', styles.buttons.text.primary)}>{goalDone ? 'Цель дня выполнена' : 'Один игровой уровень сегодня'}</h2><p className={cn('text-xs mt-1 leading-relaxed', styles.buttons.text.muted)}>{goalDone ? 'Можно отдохнуть или повторить трудные слова.' : 'Небольшой шаг тоже считается. Начни с удобного режима.'}</p></div>
              <span className={cn('text-sm tabular-nums shrink-0', styles.buttons.text.muted)}>{goalDone ? '1 / 1' : '0 / 1'}</span>
            </div>
            <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2 border-t mt-4 pt-3 text-xs', styles.buttons.card.border, styles.buttons.text.secondary)}>
              <span className="flex items-center gap-1.5"><Flame size={16} />Серия: {streak} дн.</span><span className="flex items-center gap-1.5"><Star size={16} />{stars} звёзд</span><span>Уровень {level}</span>
            </div>
          </section>

          <div className="grid sm:grid-cols-2 gap-3">
            <button type="button" onClick={() => mistakes > 0 ? setReviewOpen(true) : navigate('textbook')} className={cn(card, focus, 'p-4 text-left min-h-32')}>
              <RotateCcw size={22} className={styles.title.secondary} /><span className={cn('block font-semibold mt-3', styles.buttons.text.primary)}>{mistakes > 0 ? 'Повторить трудные слова' : 'Новые слова'}</span>
              <span className={cn('block text-sm mt-1', styles.buttons.text.muted)}>{mistakes > 0 ? `На повторение: ${mistakes}. Короткий квиз без таймера.` : 'Слов для повторения пока нет. Загляни в учебник.'}</span>
            </button>
            <button type="button" onClick={() => navigate('textbook')} className={cn(card, focus, 'p-4 text-left min-h-32')}>
              <GraduationCap size={22} className={styles.title.secondary} /><span className={cn('block font-semibold mt-3', styles.buttons.text.primary)}>Учебник</span>
              <span className={cn('block text-sm mt-1', styles.buttons.text.muted)}>Пройдено {progress.done} из {progress.total} уроков</span>
              <div role="progressbar" aria-label="Прогресс учебника" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} className={cn('mt-3 h-1.5 rounded-full overflow-hidden', styles.statsCard.progressTrack)}><div className={cn('h-full rounded-full', styles.statsCard.progressFill)} style={{ width: `${progress.total ? progress.done / progress.total * 100 : 0}%` }} /></div>
            </button>
          </div>

          <details className={cn(card, 'p-2 group')}>
            <summary className={cn('min-h-12 px-2 flex items-center justify-between cursor-pointer list-none rounded-xl font-semibold text-sm', focus, styles.buttons.text.primary)}>Ещё в приложении<ChevronDown size={18} className="group-open:rotate-180" /></summary>
            <div className="pt-2">
              {secondary('Филлворд дня', Play, () => { if (first) navigate('howto'); else store.startDailyGame(); }, 'Новая задача каждый день')}
              {secondary('Словарь', BookOpen, () => navigate('dictionary'), 'Переводы и произношение')}
              {secondary('Статистика', BarChart3, () => navigate('stats'), `До следующего уровня: ${(isAdditionalCourse() ? undefined : auth.user)?.xp?.xpRemainingToNextLevel ?? store.xpToNextLevel} XP`)}
              <div className={cn('h-1 rounded-full mx-3 mb-2 overflow-hidden', styles.statsCard.progressTrack)}><div className={cn('h-full', styles.statsCard.progressFill)} style={{ width: `${xpProgress}%` }} /></div>
              {!course && secondary('Рейтинг', Trophy, () => navigate('leaderboard'))}
              {!course && secondary('Из сообщества', MessageCircle, () => navigate('community'), 'Истории и культура Бурятии')}
              {!course && secondary('Үгын Дархан', Heart, () => navigate('contribute'), 'Помоги сохранить язык')}
              {allowDonate && secondary('Поддержать проект', Heart, () => navigate('support'))}
              {secondary('Как играть', HelpCircle, () => navigate('howto'), 'Попробовать на маленьком поле')}
              {secondary('Настройки', Settings, () => navigate('settings'), 'Тема, звук и язык')}
              {secondary('Новости проекта', MessageCircle, () => openLink('https://t.me/bur_live'))}
              {secondary('Задать вопрос', HelpCircle, () => openLink('https://t.me/frntdev'))}
              {!course && auth.user?.role === 'admin' && secondary('Админ-панель', Shield, () => navigate('admin'))}
            </div>
          </details>
          <p className={cn('text-xs text-center pt-1 pb-6', styles.footer.text)}>Учись понемногу. Возвращайся, когда удобно.</p>
        </main>
      </div>
      <nav aria-label="Основные разделы" className={cn('fixed inset-x-0 bottom-0 border-t z-20', styles.pageBackground, styles.buttons.card.border)} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-2xl mx-auto grid grid-cols-4 gap-1 px-2">
          {([{ label: 'Сегодня', icon: Home, screen: 'menu' }, { label: 'Учиться', icon: GraduationCap, screen: 'textbook' }, { label: 'Словарь', icon: BookOpen, screen: 'dictionary' }, { label: 'Профиль', icon: UserRound, screen: 'profile' }] as const).map(item => <button key={item.screen} type="button" aria-current={item.screen === 'menu' ? 'page' : undefined} onClick={() => navigate(item.screen)} className={cn('min-h-16 py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px]', focus, item.screen === 'menu' ? styles.title.secondary : styles.buttons.text.muted)}><item.icon size={20} />{item.label}</button>)}
        </div>
      </nav>
      {reviewOpen && <TextbookQuiz title="Повторить трудные слова" makeQuestions={() => buildReviewQuiz()} onClose={() => { setReviewOpen(false); setMistakes(getMistakeWords().length); }} onFinished={() => setMistakes(getMistakeWords().length)} />}
    </div>
  );
};
export default MainMenu;

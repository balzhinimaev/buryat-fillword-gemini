// src/screens/GameModeSelectScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  BookOpen, 
  Infinity as InfinityIcon, 
  Star, 
  Lock,
  ChevronRight,
  GraduationCap,
  Settings,
  Trophy,
  Crown,
  Medal,
  Clock,
  Sparkles,
  Flame,
  CheckCircle2,
  CalendarDays,
  Play,
  Zap
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import { LEVEL_PACKS } from '../store/gameStore';
import { trackAnalyticsEventNonBlocking } from '../utils/analytics';
import { api, type CampaignOverviewResponse, type LevelModeProgressResponse, type DailyWordTodayResponse } from '../services/api';

interface GameModeSelectScreenProps {
  store: GameStore;
}

export const GameModeSelectScreen: React.FC<GameModeSelectScreenProps> = ({ store }) => {
  const { navigate, goBack, selectLevelPack, isPackUnlocked, getPackProgress, selectCategory, setCampaignResumeSlug, setCampaignLandingView, state } = store;
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);
  
  useBackButton(() => goBack());

  // Серверный прогресс уровневого режима
  const [levelModeProgress, setLevelModeProgress] = useState<LevelModeProgressResponse | null>(null);
  
  const totalCompletedLevels = levelModeProgress?.levelsCompleted
    ?? state.endlessProgress.completedLevels.length;

  const [campaignOverview, setCampaignOverview] = useState<CampaignOverviewResponse | null>(null);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [campaignData, levelModeData] = await Promise.all([
          api.getCampaignOverview().catch(() => null),
          api.getLevelModeProgress().catch(() => null),
        ]);
        if (!isMounted) return;
        if (campaignData) setCampaignOverview(campaignData);
        if (levelModeData) setLevelModeProgress(levelModeData);
      } catch {
        // ignore
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const campaignStarsText = useMemo(() => {
    const earned = campaignOverview?.earnedStars ?? state.stats.totalStars;
    const total = campaignOverview?.totalStars ?? 36;
    return `${earned}/${total}`;
  }, [campaignOverview, state.stats.totalStars]);

  const campaignProgressPercent = useMemo(() => {
    if (typeof campaignOverview?.progressPercent === 'number') return campaignOverview.progressPercent;
    if (typeof campaignOverview?.totalStars === 'number' && campaignOverview.totalStars > 0) {
      return ((campaignOverview.earnedStars ?? 0) / campaignOverview.totalStars) * 100;
    }
    return Math.min(100, (state.stats.totalStars / 36) * 100);
  }, [campaignOverview, state.stats.totalStars]);

  const thematicModulesCount = campaignOverview?.modules?.length ?? 0;

  const resumeLevelSlug = state.campaignResumeSlug;

  const resumeLevel = useMemo(() => {
    if (!resumeLevelSlug || !campaignOverview?.categories) return null;
    const allLevels = campaignOverview.categories.flatMap(category => category.levels ?? []);
    return allLevels.find(level => level.slug === resumeLevelSlug) ?? null;
  }, [resumeLevelSlug, campaignOverview]);

  const trackModeSelectedFromMenu = useCallback((mode: string, props?: Record<string, unknown>) => {
    trackAnalyticsEventNonBlocking('mode_selected_from_menu', {
      ctx: {
        source: 'menu',
      },
      props: {
        mode,
        ...props,
      },
    });
  }, []);

  const handleResumeFirstLevel = useCallback(() => {
    if (!resumeLevelSlug) return;
    trackModeSelectedFromMenu('campaign_resume', {
      slug: resumeLevelSlug,
    });
    trackAnalyticsEventNonBlocking('resume_clicked', {
      ctx: {
        source: 'menu',
      },
      props: {
        slug: resumeLevelSlug,
      },
    });
    setCampaignResumeSlug(null);
    selectCategory(resumeLevelSlug);
  }, [resumeLevelSlug, selectCategory, setCampaignResumeSlug, trackModeSelectedFromMenu]);

  // ─── Countdown до «Второй главы» ───
  // 11 февраля 20:00 по Улан-Удэ (UTC+8)
  const CHAPTER2_DATE = useMemo(() => new Date('2026-02-11T20:00:00+08:00'), []);

  const calcTimeLeft = useCallback(() => {
    const diff = CHAPTER2_DATE.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff / 3_600_000) % 24),
      minutes: Math.floor((diff / 60_000) % 60),
      seconds: Math.floor((diff / 1_000) % 60),
      total: diff,
    };
  }, [CHAPTER2_DATE]);

  const [timeLeft, setTimeLeft] = useState(calcTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(id);
  }, [calcTimeLeft]);

  const isChapter2Live = timeLeft.total <= 0;
  const pad = (n: number) => String(n).padStart(2, '0');

  // ─── Филлворд дня (API) ───
  const [dailyData, setDailyData] = useState<DailyWordTodayResponse | null>(null);
  const [dailyNotFound, setDailyNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await api.getDailyWordToday();
        if (isMounted) setDailyData(data);
      } catch (err) {
        if (isMounted) {
          // 404 = на сегодня нет филлворда
          if ((err as { statusCode?: number })?.statusCode === 404) {
            setDailyNotFound(true);
          }
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const dailyPuzzle = useMemo(() => {
    const dateStr = dailyData?.date ?? (() => {
      const now = new Date();
      const uu = new Date(now.getTime() + 8 * 3600_000);
      return uu.toISOString().slice(0, 10);
    })();

    const [, m, d] = dateStr.split('-').map(Number);
    const monthNames = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const weekDays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    const dt = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = dt.getDay();

    return {
      dateLabel: `${d} ${monthNames[m - 1]}`,
      weekDay: weekDays[dayOfWeek],
      dateKey: dateStr,
    };
  }, [dailyData]);

  const dailyCompleted = dailyData?.currentStars != null;
  const dailyStars = dailyData?.currentStars ?? null;

  const handleDailyPlay = useCallback(() => {
    trackModeSelectedFromMenu('daily');
    trackAnalyticsEventNonBlocking('daily_opened', {
      ctx: {
        source: 'menu',
      },
      props: {
        entrypoint: 'mode_select',
      },
    });
    store.startDailyGame();
  }, [store, trackModeSelectedFromMenu]);

  return (
    <div className={cn("min-h-[100dvh] flex flex-col relative overflow-hidden", styles.pageGradient)}>
      {/* Sticky Header */}
      <StickyHeader 
        title="Выбор режима" 
        onBack={() => goBack()}
        rightElement={
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('settings')}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isDark ? "hover:bg-white/10" : "hover:bg-black/5"
            )}
          >
            <Settings size={20} className={isDark ? "text-stone-400" : "text-stone-500"} />
          </motion.button>
        }
      />

      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn("absolute top-1/4 -left-32 w-64 h-64 rounded-full blur-3xl", styles.decorativeOrbs.primary)} />
        <div className={cn("absolute bottom-1/3 -right-32 w-80 h-80 rounded-full blur-3xl", styles.decorativeOrbs.secondary)} />
        
        {/* Сетка */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `
              linear-gradient(to right, ${styles.gridPattern} 1px, transparent 1px),
              linear-gradient(to bottom, ${styles.gridPattern} 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px'
          }} 
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-5 pt-16 pb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => goBack()}
          className={cn(
            "absolute top-4 left-4 p-2 rounded-xl transition-colors",
            isDark ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"
          )}
        >
          <ArrowLeft size={24} className={styles.buttons.text.primary} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('settings')}
          className={cn(
            "absolute top-4 right-4 p-2 rounded-xl transition-colors",
            isDark ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"
          )}
        >
          <Settings size={22} className={isDark ? "text-stone-400" : "text-stone-500"} />
        </motion.button>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-8"
        >
          <h1 className={cn("text-2xl font-bold mb-2", styles.buttons.text.primary)}>
            Выбери режим игры
          </h1>
          <p className={cn("text-sm", styles.buttons.text.muted)}>
            Изучай бурятский язык в своём темпе
          </p>
        </motion.div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-5 pb-6 relative z-10 space-y-6">

        {/* Resume-first-flow prompt */}
        {resumeLevelSlug && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleResumeFirstLevel}
            className="relative w-full p-4 rounded-2xl overflow-hidden text-left"
          >
            <div className={cn(
              'absolute inset-0 transition-all duration-300',
              isDark
                ? 'bg-gradient-to-r from-amber-500/35 via-orange-500/35 to-rose-500/35'
                : 'bg-gradient-to-r from-amber-400/70 via-orange-400/70 to-rose-400/70'
            )} />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
            <Zap className="absolute top-3 right-3 text-white/30" size={20} />

            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Play size={20} className="text-white ml-0.5" fill="white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="font-bold text-base text-white">Продолжить уровень</h2>
                  <span className="px-1.5 py-px bg-white/20 rounded-full text-[10px] font-semibold text-white/90">
                    Resume
                  </span>
                </div>
                <p className="text-xs text-white/75 truncate">
                  {resumeLevel?.name ?? 'Незавершённый стартовый уровень'}
                </p>
                <p className="text-[11px] text-white/60 mt-1">
                  Ты уже начинал этот уровень — дожмём до первой победы 💪
                </p>
              </div>
              <ChevronRight size={20} className="text-white/55 shrink-0" />
            </div>
          </motion.button>
        )}

        {/* ═══════════════ Вторая глава — Countdown ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative w-full rounded-2xl overflow-hidden">
            {/* Фон */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            {/* Шиммер */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
            />
            {/* Декоративные круги */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/[0.05] blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-400/10 blur-2xl" />
            {/* Декоративные звёзды */}
            <Sparkles className="absolute top-3 right-3 text-white/15" size={28} />
            <Flame className="absolute bottom-3 right-10 text-orange-300/10" size={22} />

            <div className="relative z-10 p-5">
              {/* Заголовок */}
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-bold text-xl text-white">Вторая глава</h2>
                <motion.span
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-2 py-0.5 bg-orange-400/20 border border-orange-400/30 rounded-full text-[11px] font-semibold text-orange-200"
                >
                  СКОРО
                </motion.span>
              </div>
              <p className="text-sm text-white/70 mb-4">
                Новые слова, сложные уровни и настоящий вызов для носителей языка
              </p>

              {/* Countdown */}
              {!isChapter2Live ? (
                <div className="flex items-center gap-2">
                  {([
                    { value: timeLeft.days, label: 'дн' },
                    { value: timeLeft.hours, label: 'ч' },
                    { value: timeLeft.minutes, label: 'мин' },
                    { value: timeLeft.seconds, label: 'сек' },
                  ] as const).map((unit, i) => (
                    <React.Fragment key={unit.label}>
                      {i > 0 && (
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="text-white/40 font-bold text-lg -mx-0.5 select-none"
                        >
                          :
                        </motion.span>
                      )}
                      <div className="flex-1 flex flex-col items-center">
                        <div className={cn(
                          "w-full py-2 rounded-xl text-center font-mono font-bold text-2xl text-white",
                          "bg-white/10 backdrop-blur-sm border border-white/10",
                          "shadow-lg shadow-black/10"
                        )}>
                          <AnimatePresence mode="popLayout">
                            <motion.span
                              key={unit.value}
                              initial={{ y: -16, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: 16, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                              className="inline-block"
                            >
                              {pad(unit.value)}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                        <span className="text-[10px] text-white/50 mt-1 uppercase tracking-wider">
                          {unit.label}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-white/20 backdrop-blur text-white font-bold text-center"
                >
                  Начать Вторую главу
                </motion.button>
              )}

              {/* Дата запуска — улан-удэнское время (UTC+8) */}
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <Clock size={12} className="text-white/40" />
                <span className="text-[11px] text-white/40">
                  Запуск: 11 февраля 2026 в 20:00 по Улан-Удэ
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════ Филлворд дня ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <motion.button
            whileHover={!dailyNotFound ? { scale: 1.02, y: -2 } : {}}
            whileTap={!dailyNotFound ? { scale: 0.98 } : {}}
            onClick={!dailyNotFound ? handleDailyPlay : undefined}
            disabled={dailyNotFound}
            className={cn(
              "relative w-full rounded-2xl overflow-hidden text-left group",
              dailyNotFound && "opacity-60"
            )}
          >
            {/* Фон — тёплый оранжево-янтарный */}
            <div className={cn(
              "absolute inset-0",
              isDark
                ? "bg-gradient-to-r from-amber-700/80 via-orange-600/80 to-rose-600/70"
                : "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
            )} />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />

            {/* Шиммер */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
            />

            {/* Декор */}
            <CalendarDays className="absolute top-3 right-3 text-white/10" size={48} />

            <div className="relative z-10 p-4 flex items-center gap-3.5">
              {/* Дата-блок */}
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center shadow-inner shrink-0">
                <span className="text-[10px] font-semibold text-white/70 uppercase leading-none">
                  {dailyPuzzle.weekDay.slice(0, 2)}
                </span>
                <span className="text-xl font-black text-white leading-tight">
                  {dailyPuzzle.dateLabel.split(' ')[0]}
                </span>
                <span className="text-[9px] font-medium text-white/60 uppercase leading-none">
                  {dailyPuzzle.dateLabel.split(' ')[1]}
                </span>
              </div>

              {/* Инфо */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="font-bold text-base text-white">Филлворд дня</h2>
                  {dailyNotFound ? (
                    <span className="px-1.5 py-px bg-white/15 rounded-full text-[10px] text-white/60">
                      Скоро
                    </span>
                  ) : dailyCompleted ? (
                    <span className="px-1.5 py-px bg-white/20 rounded-full text-[10px] text-white/90 flex items-center gap-0.5">
                      <CheckCircle2 size={10} />
                      {dailyStars !== null ? `${dailyStars}★` : 'Пройден'}
                    </span>
                  ) : dailyData ? (
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="px-1.5 py-px bg-white/20 rounded-full text-[10px] font-semibold text-yellow-100 flex items-center gap-0.5"
                    >
                      <Zap size={10} />
                      Новый!
                    </motion.span>
                  ) : null}
                </div>
                <p className="text-xs text-white/70">
                  {dailyNotFound
                    ? 'Филлворд дня ещё не готов, загляните позже'
                    : dailyCompleted
                      ? 'Улучши результат — переиграй!'
                      : 'Один паззл для всех — разгадай и сравни результат'}
                </p>
              </div>

              {/* Кнопка-play */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                "bg-white/20 backdrop-blur-sm"
              )}>
                <Play size={18} className="text-white ml-0.5" fill="white" />
              </div>
            </div>
          </motion.button>
        </motion.div>

        {/* ═══════════════ Первая глава (Обучение) ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (resumeLevelSlug) {
                handleResumeFirstLevel();
                return;
              }
              trackModeSelectedFromMenu('campaign_chapters');
              setCampaignLandingView('chapters');
              navigate('levels');
            }}
            className="relative w-full p-4 rounded-2xl overflow-hidden group text-left"
          >
            {/* Фон — более приглушённый, «пройденный» */}
            <div className={cn(
              "absolute inset-0 transition-all duration-300",
              isDark
                ? "bg-gradient-to-r from-emerald-800/60 via-teal-800/60 to-cyan-800/60"
                : "bg-gradient-to-r from-emerald-500/80 via-teal-500/80 to-cyan-500/80"
            )} />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
            
            {/* Декоративный элемент */}
            <GraduationCap className="absolute top-2.5 right-2.5 text-white/15" size={28} />
            {campaignProgressPercent >= 100 && (
              <CheckCircle2 className="absolute bottom-2.5 right-2.5 text-white/15" size={22} />
            )}
            
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0">
                <BookOpen size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="font-bold text-base text-white">Первая глава</h2>
                  <span className="px-1.5 py-px bg-white/15 rounded-full text-[10px] text-white/80">
                    Базовый курс
                  </span>
                </div>
                <p className="text-xs text-white/65 mb-1.5">
                  Базовые темы: животные, еда, числа и другое
                </p>
                <div className="flex items-center gap-3 text-[11px] text-white/60">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="fill-current" />
                    <span>{campaignStarsText}</span>
                  </div>
                  <div className={cn(
                    "flex-1 h-1 rounded-full overflow-hidden max-w-[120px]",
                    "bg-white/10"
                  )}>
                    <div
                      className="h-full rounded-full bg-white/40"
                      style={{ width: `${Math.min(100, campaignProgressPercent)}%` }}
                    />
                  </div>
                  <span>{campaignProgressPercent.toFixed(0)}%</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-white/40 shrink-0" />
            </div>
          </motion.button>
        </motion.div>

        {/* Тематические модули — отдельная глава */}
        {thematicModulesCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                trackModeSelectedFromMenu('campaign_modules');
                setCampaignLandingView('modules');
                navigate('levels');
              }}
              className="relative w-full p-4 rounded-2xl overflow-hidden group text-left"
            >
              <div className={cn(
                "absolute inset-0 transition-all duration-300",
                isDark
                  ? "bg-gradient-to-r from-fuchsia-800/65 via-violet-800/65 to-indigo-800/65"
                  : "bg-gradient-to-r from-fuchsia-500/85 via-violet-500/85 to-indigo-500/85"
              )} />
              <Sparkles className="absolute top-2.5 right-2.5 text-white/20" size={26} />

              <div className="relative z-10 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0">
                  <Sparkles size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="font-bold text-base text-white">Спецмодули</h2>
                    <span className="px-1.5 py-px bg-white/15 rounded-full text-[10px] text-white/85 whitespace-nowrap">
                      Глава
                    </span>
                  </div>
                  <p className="text-xs text-white/70 mb-1.5">
                    Праздники и спецтемы с отдельными уровнями
                  </p>
                  <div className="text-[11px] text-white/65">{thematicModulesCount} мод.</div>
                </div>
                <ChevronRight size={20} className="text-white/40 shrink-0" />
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Разделитель */}
        <div className="flex items-center gap-4 px-2">
          <div className={cn("flex-1 h-px", isDark ? "bg-white/10" : "bg-black/10")} />
          <span className={cn("text-sm font-medium", styles.buttons.text.muted)}>или</span>
          <div className={cn("flex-1 h-px", isDark ? "bg-white/10" : "bg-black/10")} />
        </div>

        {/* Режим Уровни */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isDark ? "bg-violet-500/20" : "bg-violet-100"
              )}>
                <InfinityIcon size={20} className={isDark ? "text-violet-400" : "text-violet-600"} />
              </div>
              <div>
                <h2 className={cn("font-bold text-lg", styles.buttons.text.primary)}>
                  Уровневый режим
                </h2>
                <p className={cn("text-xs", styles.buttons.text.muted)}>
                  Пройди все уровни и стань легендой
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={cn("text-xs", styles.buttons.text.muted)}>Пройдено</div>
              <div className={cn("font-bold", styles.statsCard.text.accent)}>
                {totalCompletedLevels}
                {levelModeProgress ? ` ⭐${levelModeProgress.totalStars}` : '/200'}
              </div>
            </div>
          </div>

          {/* Пакеты уровней */}
          <div className="space-y-3">
            {LEVEL_PACKS.map((pack, index) => {
              // Разблокировка: серверный maxUnlockedLevel или fallback
              const unlocked = levelModeProgress
                ? pack.levelStart <= (levelModeProgress.maxUnlockedLevel ?? 1)
                : isPackUnlocked(pack);
              
              // Прогресс: серверные данные или fallback
              const progress = (() => {
                if (levelModeProgress?.levels) {
                  let completed = 0;
                  let stars = 0;
                  for (const lvl of levelModeProgress.levels) {
                    if (lvl.levelNumber >= pack.levelStart && lvl.levelNumber <= pack.levelEnd) {
                      if (lvl.stars >= 1) completed++;
                      stars += lvl.stars;
                    }
                  }
                  return { completed, total: pack.levelEnd - pack.levelStart + 1, stars };
                }
                return getPackProgress(pack);
              })();
              const progressPercent = (progress.completed / progress.total) * 100;
              
              return (
                <motion.button
                  key={pack.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={unlocked ? { scale: 1.02, y: -2 } : {}}
                  whileTap={unlocked ? { scale: 0.98 } : {}}
                  onClick={() => {
                    if (!unlocked) return;
                    trackModeSelectedFromMenu('level_mode', {
                      packId: pack.id,
                    });
                    selectLevelPack(pack.id);
                  }}
                  disabled={!unlocked}
                  className={cn(
                    "relative w-full p-4 rounded-2xl border transition-all text-left overflow-hidden",
                    unlocked 
                      ? cn(styles.buttons.card.background, styles.buttons.card.border, styles.buttons.card.borderHover)
                      : cn(
                          isDark ? "bg-stone-800/30" : "bg-stone-100/50",
                          "border-dashed",
                          isDark ? "border-stone-700/30" : "border-stone-300/50"
                        )
                  )}
                >
                  {/* Прогресс бар фон */}
                  {unlocked && progressPercent > 0 && (
                    <div 
                      className={cn(
                        "absolute left-0 top-0 bottom-0 opacity-10",
                        `bg-gradient-to-r ${pack.gradient}`
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  )}
                  
                  <div className="relative z-10 flex items-center gap-4">
                    {/* Иконка */}
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center text-2xl",
                      unlocked 
                        ? `bg-gradient-to-br ${pack.gradient} shadow-lg`
                        : isDark ? "bg-stone-700/50" : "bg-stone-200"
                    )}>
                      {unlocked ? (
                        <span>{pack.emoji}</span>
                      ) : (
                        <Lock size={24} className={isDark ? "text-stone-500" : "text-stone-400"} />
                      )}
                    </div>
                    
                    {/* Инфо */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          "font-bold",
                          unlocked ? styles.buttons.text.primary : styles.buttons.text.muted
                        )}>
                          {pack.name}
                        </h3>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          unlocked
                            ? isDark ? "bg-white/10 text-white/70" : "bg-black/5 text-stone-600"
                            : isDark ? "bg-stone-700/50 text-stone-500" : "bg-stone-200 text-stone-400"
                        )}>
                          {pack.levelStart}-{pack.levelEnd}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm truncate",
                        unlocked ? styles.buttons.text.muted : (isDark ? "text-stone-600" : "text-stone-400")
                      )}>
                        {unlocked 
                          ? pack.description 
                          : levelModeProgress 
                            ? `Пройди уровень ${pack.levelStart - 1}` 
                            : `Нужно пройти ${pack.unlockRequirement} уровней`}
                      </p>
                      
                      {/* Прогресс */}
                      {unlocked && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className={cn(
                            "flex-1 h-1.5 rounded-full overflow-hidden",
                            isDark ? "bg-white/10" : "bg-black/5"
                          )}>
                            <div 
                              className={cn("h-full rounded-full", `bg-gradient-to-r ${pack.gradient}`)}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-medium", styles.buttons.text.muted)}>
                            {progress.completed}/{progress.total}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Звёзды или стрелка */}
                    <div className="flex flex-col items-end gap-1">
                      {unlocked ? (
                        <>
                          <div className="flex items-center gap-1">
                            <Star size={14} className={isDark ? "text-amber-400 fill-amber-400" : "text-amber-500 fill-amber-500"} />
                            <span className={cn("text-sm font-bold", styles.statsCard.text.accent)}>
                              {progress.stars}
                            </span>
                          </div>
                          <ChevronRight size={20} className={styles.buttons.text.muted} />
                        </>
                      ) : (
                        <Lock size={18} className={isDark ? "text-stone-600" : "text-stone-400"} />
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Баннер рейтинга */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('leaderboard')}
            className={cn(
              "relative w-full p-4 rounded-2xl overflow-hidden text-left",
              isDark
                ? "bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20"
                : "bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/60"
            )}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
            />

            <div className="relative z-10 flex items-center gap-3.5">
              {/* Trophy icon */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                isDark
                  ? "bg-gradient-to-br from-amber-500/25 to-orange-500/25"
                  : "bg-gradient-to-br from-amber-100 to-orange-100"
              )}>
                <Trophy size={24} className={isDark ? "text-amber-400" : "text-amber-600"} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-bold text-[15px]", styles.buttons.text.primary)}>
                    Рейтинг игроков
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Crown size={12} className={isDark ? "text-amber-400" : "text-amber-500"} />
                    <Medal size={12} className={isDark ? "text-stone-400" : "text-stone-500"} />
                  </div>
                </div>
                <p className={cn("text-xs mt-0.5", styles.buttons.text.muted)}>
                  Играй, набирай очки и соревнуйся!
                </p>
              </div>

              <ChevronRight size={20} className={isDark ? "text-amber-400/60" : "text-amber-500/60"} />
            </div>
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
};

export default GameModeSelectScreen;


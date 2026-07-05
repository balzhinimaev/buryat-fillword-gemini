// src/screens/MainMenu.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Settings, 
  BarChart3, 
  Trophy, 
  BookOpen,
  GraduationCap,
  Flame,
  Shield,
  Sparkles,
  Star,
  HelpCircle,
  Heart,
  Target,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { cn } from '../components/ui';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';
import { IS_VK_MINIAPP } from '../services/vkMiniApp';
import { trackAnalyticsEventNonBlocking } from '../utils/analytics';
import { api, getWordsStats } from '../services/api';
import { courseProgress, fetchPracticeLessons, getUnitStatuses } from '../services/textbook';

interface MainMenuProps {
  store: GameStore;
}

const STREAK_REWARD_MILESTONES = [3, 7, 14, 30] as const;
const DAILY_NUDGE_DISMISS_STORAGE_KEY = 'buryat_fillword_daily_nudge_dismissed_date';

// Декоративный элемент - традиционный орнамент
const Ornament: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 20" className={className}>
    <path
      d="M0 10 L15 10 L20 5 L25 10 L35 10 L40 15 L45 10 L55 10 L60 5 L65 10 L75 10 L80 15 L85 10 L100 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Сетка филлворда для шапки
type CellType = { letter: string; highlighted: 1 | 2 | false };
const STATIC_GRID: CellType[][] = [
  [{ letter: 'А', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'Н', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'Р', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'Н', highlighted: 1 }, { letter: 'Е', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Р', highlighted: false }],
  [{ letter: 'Р', highlighted: false }, { letter: 'Ү', highlighted: false }, { letter: 'М', highlighted: false }, { letter: 'Т', highlighted: false }, { letter: 'О', highlighted: false }, { letter: 'Л', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'А', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'И', highlighted: false }, { letter: 'Ц', highlighted: false }],
  [{ letter: 'У', highlighted: 2 }, { letter: 'Һ', highlighted: 2 }, { letter: 'А', highlighted: 2 }, { letter: 'Н', highlighted: 2 }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'А', highlighted: false }, { letter: 'В', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'Ж', highlighted: false }, { letter: 'М', highlighted: 1 }, { letter: 'О', highlighted: 1 }, { letter: 'Д', highlighted: 1 }, { letter: 'О', highlighted: 1 }, { letter: 'Н', highlighted: 1 }],
  [{ letter: 'О', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Э', highlighted: false }, { letter: 'Ь', highlighted: false }, { letter: 'Ы', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Й', highlighted: false }, { letter: 'З', highlighted: false }, { letter: 'Ч', highlighted: false }, { letter: 'У', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Р', highlighted: false }],
  [{ letter: 'Х', highlighted: false }, { letter: 'Т', highlighted: 2 }, { letter: 'Э', highlighted: 2 }, { letter: 'Н', highlighted: 2 }, { letter: 'Г', highlighted: 2 }, { letter: 'Э', highlighted: 2 }, { letter: 'Р', highlighted: 2 }, { letter: 'И', highlighted: 2 }, { letter: 'Д', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'Ж', highlighted: false }, { letter: 'И', highlighted: false }, { letter: 'Ц', highlighted: false }, { letter: 'У', highlighted: false }, { letter: 'А', highlighted: false }],
  [{ letter: 'Р', highlighted: false }, { letter: 'Ү', highlighted: false }, { letter: 'М', highlighted: false }, { letter: 'Т', highlighted: false }, { letter: 'О', highlighted: false }, { letter: 'Л', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'А', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Г', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'З', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'Р', highlighted: 1 }, { letter: 'Н', highlighted: false }],
  [{ letter: 'А', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ү', highlighted: false }, { letter: 'М', highlighted: false }, { letter: 'Т', highlighted: false }, { letter: 'О', highlighted: false }],
  [{ letter: 'О', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Э', highlighted: false }, { letter: 'Ь', highlighted: false }, { letter: 'Ы', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Й', highlighted: false }, { letter: 'З', highlighted: false }, { letter: 'Ч', highlighted: false }, { letter: 'У', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'А', highlighted: false }],
];

// Header с сеткой филлворда
const FillwordHeader: React.FC<{ styles: ReturnType<typeof getMenuStyles>; isDark: boolean }> = ({ styles, isDark }) => {
  const cellSize = 24;
  const gap = 3;
  const cols = 15;
  
  const getHighlightStyle = (highlighted: 1 | 2 | false) => {
    if (highlighted === 1) return styles.fillwordGrid.highlight1;
    if (highlighted === 2) return styles.fillwordGrid.highlight2;
    return styles.fillwordGrid.default;
  };
  
  return (
    <header className="relative w-full overflow-hidden pt-12 pb-16">
      <div className={cn("absolute inset-0 flex justify-center items-start pt-6", isDark ? "opacity-60" : "opacity-80")}>
        <div className="relative w-full flex justify-center">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
              gap: `${gap}px`,
            }}
          >
            {STATIC_GRID.flat().map((cell, index) => {
              const row = Math.floor(index / cols);
              const col = index % cols;
              
              return (
                <motion.div
                  key={`${row}-${col}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ 
                    delay: (row * 0.02) + (col * 0.01),
                    duration: 0.2
                  }}
                  className={cn(
                    "flex items-center justify-center rounded font-semibold text-[10px]",
                    getHighlightStyle(cell.highlighted)
                  )}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {cell.letter}
                </motion.div>
              );
            })}
          </div>
        </div>
        
        {/* Виньетка */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 90% 80% at 50% 40%, 
                transparent 0%, 
                transparent 30%, 
                ${styles.fillwordGrid.vignette}33 50%, 
                ${styles.fillwordGrid.vignette}b3 70%,
                ${styles.fillwordGrid.vignette}f2 100%
              )
            `
          }}
        />
      </div>
      
      {/* Градиент перехода */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, ${styles.fillwordGrid.bottomFade}80 40%, ${styles.fillwordGrid.bottomFade} 100%)`
        }}
      />
    </header>
  );
};

// Заголовок
const AppTitle: React.FC<{ styles: ReturnType<typeof getMenuStyles> }> = ({ styles }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="text-center py-4"
  >
    <h1 className={cn("text-3xl font-bold mb-1 tracking-tight", styles.title.primary)}>
      Бурятский
    </h1>
    <div className="flex items-center justify-center gap-3">
      <Ornament className={cn("w-12 h-4", styles.title.ornament)} />
      <h2 className={cn("text-xl font-semibold", styles.title.secondary)}>
        Филлворд
      </h2>
      <Ornament className={cn("w-12 h-4 scale-x-[-1]", styles.title.ornament)} />
    </div>
  </motion.div>
);

export const MainMenu: React.FC<MainMenuProps> = ({ store }) => {
  const { state, navigate, selectCategory, setCampaignLandingView, setCampaignResumeSlug, startDailyGame, xpProgress, xpToNextLevel } = store;
  const { stats } = state;
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);
  const { openLink } = useTelegram();
  const { state: authState, refreshUser } = useAuth();
  const isAdmin = authState.user?.role === 'admin';
  const [totalVerifiedWords, setTotalVerifiedWords] = useState<number | null>(null);
  const [tbProgress, setTbProgress] = useState<{ done: number; total: number } | null>(null);
  useEffect(() => {
    void fetchPracticeLessons().then((lessons) => {
      const starsBySlug = Object.fromEntries(Object.entries(lessons).map(([k, l]) => [k, l.stars]));
      setTbProgress(courseProgress(getUnitStatuses(starsBySlug)));
    }).catch(() => {});
  }, []);
  const [showDonateBtn, setShowDonateBtn] = useState(true);
  const [hasUnplayedDaily, setHasUnplayedDaily] = useState(false);

  // Скрываем кнопку 💸 когда прокручено дальше шапки (~250px)
  const handleScroll = useCallback(() => {
    setShowDonateBtn(window.scrollY < 150);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Обновляем данные пользователя при монтировании компонента
  useEffect(() => {
    if (authState.isAuthenticated) {
      refreshUser();
    }
  }, [authState.isAuthenticated, refreshUser]);

  // Загружаем актуальное количество верифицированных слов из API
  useEffect(() => {
    getWordsStats()
      .then((data) => setTotalVerifiedWords(data.verified))
      .catch(() => {});
  }, []);

  // Есть ли «свежий» daily, который пользователь ещё не проходил
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    let mounted = true;

    api.getDailyWordToday()
      .then((daily) => {
        if (!mounted) return;
        setHasUnplayedDaily(daily.currentStars == null);
      })
      .catch(() => {
        if (!mounted) return;
        setHasUnplayedDaily(false);
      });

    return () => {
      mounted = false;
    };
  }, [authState.isAuthenticated]);

  // Streak — берём из бэка или fallback на локальное
  const currentStreak = authState.user?.streak?.current ?? stats.currentStreak;

  // XP/Level — берём из бэка или fallback на локальное
  const backendXp = authState.user?.xp;
  const displayLevel = backendXp?.level ?? stats.level;
  const displayXpProgress = backendXp
    ? backendXp.progressPercent / 100
    : xpProgress;
  // xpRemainingToNextLevel — сколько осталось до следующего уровня
  const displayXpRemaining = backendXp?.xpRemainingToNextLevel ?? xpToNextLevel;

  // Звёзды кампании — берём из бэка или локальное
  const displayTotalStars = authState.user?.campaignStats?.totalStars ?? stats.totalStars;

  const todayKey = useMemo(() => dateToLocalKey(new Date()), []);
  const [isDailyNudgeDismissedToday, setIsDailyNudgeDismissedToday] = useState(() => isDailyNudgeDismissedForDate(todayKey));

  const dismissDailyNudgeForToday = useCallback(() => {
    setDailyNudgeDismissedForDate(todayKey);
    setIsDailyNudgeDismissedToday(true);
    trackAnalyticsEventNonBlocking('daily_nudge_dismissed', {
      ctx: {
        source: 'menu',
      },
      props: {
        date: todayKey,
      },
    });
  }, [todayKey]);

  const lastActiveRaw = authState.user?.streak?.lastActiveDate ?? stats.lastPlayedDate;
  const lastActiveKey = useMemo(() => parseDateToLocalKey(lastActiveRaw), [lastActiveRaw]);
  const dailyGoalCompleted = Boolean(lastActiveKey && lastActiveKey === todayKey);

  const nextRewardMilestone = useMemo(
    () => STREAK_REWARD_MILESTONES.find((milestone) => milestone > currentStreak) ?? null,
    [currentStreak],
  );

  const nextRewardHint = useMemo(() => {
    if (currentStreak <= 0) return 'Начни серию: 1 уровень сегодня';
    if (!nextRewardMilestone) return 'Ты на максимальной награде за серию';
    const daysLeft = nextRewardMilestone - currentStreak;
    return `До бонуса ${daysLeft} ${getDaysWord(daysLeft)}`;
  }, [currentStreak, nextRewardMilestone]);

  const handleStartCampaignFromWidget = useCallback(async () => {
    if (!state.settings.hasSeenHowTo) {
      navigate('howto');
      return;
    }

    try {
      const overview = await api.getCampaignOverview();

      // Весь обучающий контент живёт в тематических модулях (главах), а не в
      // плоских тирах сложности (categories). Если модули есть — открываем их список.
      if ((overview.modules?.length ?? 0) > 0) {
        setCampaignLandingView('modules');
        navigate('levels');
        return;
      }

      const firstUnlockedLevel = overview.categories
        ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .flatMap((category) => [...(category.levels ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
        .find((level) => level.isUnlocked === true)
        ?? overview.categories
          ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .flatMap((category) => [...(category.levels ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))[0];

      if (firstUnlockedLevel?.slug) {
        setCampaignLandingView(null);
        selectCategory(firstUnlockedLevel.slug);
        return;
      }
    } catch {
      // fallback ниже
    }

    setCampaignLandingView('chapters');
    navigate('levels');
  }, [navigate, selectCategory, setCampaignLandingView, state.settings.hasSeenHowTo]);

  const handleResumeCampaignFromGoal = useCallback(() => {
    if (!state.campaignResumeSlug) {
      void handleStartCampaignFromWidget();
      return;
    }

    if (!state.settings.hasSeenHowTo) {
      navigate('howto');
      return;
    }

    trackAnalyticsEventNonBlocking('resume_clicked', {
      ctx: {
        source: 'menu',
      },
      props: {
        slug: state.campaignResumeSlug,
      },
    });
    setCampaignLandingView(null);
    selectCategory(state.campaignResumeSlug);
    setCampaignResumeSlug(null);
  }, [
    handleStartCampaignFromWidget,
    navigate,
    selectCategory,
    setCampaignLandingView,
    setCampaignResumeSlug,
    state.campaignResumeSlug,
    state.settings.hasSeenHowTo,
  ]);

  const handleDailyGoalCta = useCallback(() => {
    if (!state.settings.hasSeenHowTo) {
      navigate('howto');
      return;
    }

    trackAnalyticsEventNonBlocking('daily_opened', {
      ctx: {
        source: 'menu',
      },
      props: {
        entrypoint: 'daily_goal_card',
      },
    });

    startDailyGame();
  }, [navigate, startDailyGame, state.settings.hasSeenHowTo]);

  const dailyGoalCard = useMemo(() => {
    const hasResume = Boolean(state.campaignResumeSlug);
    const isNewPlayer = displayTotalStars <= 0;

    if (!state.settings.hasSeenHowTo) {
      return {
        title: 'Пройди короткое обучение',
        progress: 'Шаг 1/1',
        cta: 'Начать',
        iconDone: false,
        hint: 'Это займёт меньше минуты',
        onClick: () => navigate('howto'),
      };
    }

    if (dailyGoalCompleted) {
      if (isDailyNudgeDismissedToday) {
        return {
          title: 'Цель дня выполнена',
          progress: '1/1 выполнено',
          cta: 'Продолжить игру',
          iconDone: true,
          hint: 'Сегодня без daily — выбери любой удобный режим',
          onClick: () => navigate('gameMode'),
        };
      }

      return {
        title: 'Цель дня выполнена',
        progress: '1/1 выполнено',
        cta: 'Филлворд дня',
        iconDone: true,
        hint: 'Бонус: закрепи прогресс в ежедневном режиме',
        onClick: handleDailyGoalCta,
      };
    }

    if (hasResume) {
      return {
        title: 'Заверши начатый уровень',
        progress: '0/1 сегодня',
        cta: 'Продолжить',
        iconDone: false,
        hint: 'Один шаг до выполнения цели дня',
        onClick: handleResumeCampaignFromGoal,
      };
    }

    if (isNewPlayer) {
      return {
        title: 'Сделай первую победу сегодня',
        progress: '0/1 сегодня',
        cta: 'Начать',
        iconDone: false,
        hint: 'Первая звезда запустит серию дней',
        onClick: () => {
          void handleStartCampaignFromWidget();
        },
      };
    }

    return {
      title: currentStreak > 0
        ? 'Сохрани серию: 1 уровень сегодня'
        : 'Пройди 1 уровень сегодня',
      progress: '0/1 сегодня',
      cta: currentStreak > 0 ? 'Сохранить серию' : 'К уровню',
      iconDone: false,
      hint: currentStreak > 0
        ? 'Один уровень — и серия не прервётся'
        : 'Короткая сессия на 2–3 минуты',
      onClick: () => {
        void handleStartCampaignFromWidget();
      },
    };
  }, [
    currentStreak,
    dailyGoalCompleted,
    displayTotalStars,
    handleDailyGoalCta,
    handleResumeCampaignFromGoal,
    handleStartCampaignFromWidget,
    isDailyNudgeDismissedToday,
    navigate,
    state.campaignResumeSlug,
    state.settings.hasSeenHowTo,
  ]);

  const isColdUser = displayTotalStars <= 0 && currentStreak <= 0;
  // В VK Mini App донат-кнопки скрыты: правила ВК разрешают приём платежей
  // в мини-аппах только через VK Pay — внешние платёжные ссылки заворачивает модерация.
  const allowDonateCta = !IS_VK_MINIAPP && !authState.isNewUser && !isColdUser;

  const primaryAction = useMemo(() => {
    if (!state.settings.hasSeenHowTo) {
      return {
        title: 'Начать обучение',
        subtitle: 'Короткий вводный уровень',
        onClick: () => navigate('howto'),
      };
    }

    if (state.campaignResumeSlug) {
      return {
        title: 'Продолжить',
        subtitle: 'Вернись к начатому уровню',
        onClick: handleResumeCampaignFromGoal,
      };
    }

    if (hasUnplayedDaily && !isDailyNudgeDismissedToday) {
      return {
        title: 'Играть',
        subtitle: 'Выбери режим: daily, кампания или уровни',
        onClick: () => navigate('gameMode'),
      };
    }

    return {
      title: 'Играть',
      subtitle: `${stats.learnedWords.length} слов выучено`,
      onClick: () => navigate('gameMode'),
    };
  }, [
    handleResumeCampaignFromGoal,
    hasUnplayedDaily,
    isDailyNudgeDismissedToday,
    navigate,
    state.campaignResumeSlug,
    state.settings.hasSeenHowTo,
    stats.learnedWords.length,
  ]);

  return (
    <div className={cn("min-h-[100dvh] flex flex-col relative overflow-hidden", styles.pageGradient)}>
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn("absolute top-1/2 -left-32 w-64 h-64 rounded-full blur-3xl", styles.decorativeOrbs.primary)} />
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

      {/* Плавающие кнопки — fixed, исчезают при скролле ниже шапки */}
      <AnimatePresence>
        {showDonateBtn && (
          <div className="fixed top-4 right-4 z-50 flex flex-col items-center gap-2">
            {/* Поддержать проект */}
            {allowDonateCta && (
              <motion.button
                onClick={() => navigate('support')}
                className="cursor-pointer"
                initial={{ opacity: 0, scale: 0, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0, rotate: 30 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.span
                  className="text-3xl block drop-shadow-lg select-none"
                  animate={{
                    y: [0, -4, 0],
                    rotate: [0, -6, 6, -3, 0],
                  }}
                  transition={{
                    y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                    rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                  }}
                >
                  💸
                </motion.span>
              </motion.button>
            )}

            {/* Телеграм-канал */}
            <motion.button
              onClick={() => openLink('https://t.me/bur_live')}
              className="cursor-pointer"
              initial={{ opacity: 0, scale: 0, rotate: 30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, rotate: -30 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.span
                className="text-[1.65rem] block drop-shadow-lg select-none"
                animate={{
                  y: [0, -3, 0],
                }}
                transition={{
                  y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 },
                }}
              >
                📰
              </motion.span>
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <FillwordHeader styles={styles} isDark={isDark} />
      
      {/* Заголовок */}
      <AppTitle styles={styles} />

      {/* Stats card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mx-5 mb-5"
      >
        <div className={cn(
          "relative p-4 rounded-2xl border overflow-hidden",
          styles.statsCard.background,
          styles.statsCard.border
        )}>
          {/* Декор */}
          <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-bl-full", styles.statsCard.accent)} />
          
          <div className="relative z-10">
            {/* Streak и звёзды */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", styles.statsCard.streakIcon)}>
                  <Flame className="text-white" size={20} />
                </div>
                <div>
                  <div className={cn("text-xs", styles.statsCard.text.secondary)}>Серия</div>
                  <div className={cn("font-bold", styles.statsCard.text.primary)}>
                    {currentStreak} {getDaysWord(currentStreak)}
                  </div>
                  <div className={cn("text-[10px] leading-tight", styles.statsCard.text.secondary)}>
                    {nextRewardHint}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div>
                  <div className={cn("text-xs text-right", styles.statsCard.text.secondary)}>Всего звёзд</div>
                  <div className={cn("font-bold text-right flex items-center gap-1 justify-end", styles.statsCard.text.accent)}>
                    <Star size={16} className="fill-current" />
                    {displayTotalStars}
                  </div>
                </div>
              </div>
            </div>
            
            {/* XP прогресс */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
                styles.statsCard.levelBadge
              )}>
                {displayLevel}
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className={cn("font-medium", styles.statsCard.text.primary)}>Уровень {displayLevel}</span>
                  <span className={styles.statsCard.text.secondary}>{displayXpRemaining} XP</span>
                </div>
                <div className={cn("h-2.5 rounded-full overflow-hidden", styles.statsCard.progressTrack)}>
                  <motion.div
                    className={cn("h-full rounded-full", styles.statsCard.progressFill)}
                    initial={{ width: 0 }}
                    animate={{ width: `${displayXpProgress * 100}%` }}
                    transition={{ type: 'spring', stiffness: 50 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Цель дня — компактная строка */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36 }}
        className="mx-5 mb-5"
      >
        <button
          type="button"
          onClick={dailyGoalCard.onClick}
          className={cn(
            'w-full rounded-2xl border p-3 flex items-center gap-3 text-left active:scale-[0.985] transition-transform',
            styles.buttons.card.background,
            styles.buttons.card.border
          )}
        >
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
            dailyGoalCard.iconDone ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          )}>
            {dailyGoalCard.iconDone ? (
              <CheckCircle2 size={17} className="text-emerald-400" />
            ) : (
              <Target size={17} className="text-amber-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn('text-[10px] uppercase tracking-wider font-semibold', styles.buttons.text.muted)}>
              Цель дня · {dailyGoalCard.progress}
            </div>
            <div className={cn('text-sm font-semibold truncate mt-0.5', styles.buttons.text.primary)}>
              {dailyGoalCard.title}
            </div>
          </div>
          <span className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold flex-shrink-0',
            dailyGoalCard.iconDone
              ? 'bg-emerald-500/15 text-emerald-500'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
          )}>
            {dailyGoalCard.cta}
            <ArrowRight size={12} />
          </span>
        </button>
      </motion.section>

      {/* Menu buttons */}
      <main className="flex-1 px-5 pb-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          {/* Главная кнопка: обучение / resume / выбор режима */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={primaryAction.onClick}
            className="relative w-full p-5 rounded-2xl overflow-hidden group"
          >
            <div className={cn("absolute inset-0 transition-all duration-300", styles.buttons.play.gradient)} />
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300", styles.buttons.play.gradientHover)} />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
            <Sparkles className="absolute top-3 right-3 text-white/30" size={20} />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className={cn("w-14 h-14 rounded-xl backdrop-blur-sm flex items-center justify-center shadow-inner", styles.buttons.play.iconBg)}>
                <Play size={28} className="text-white ml-1" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-xl text-white">{primaryAction.title}</div>
                <div className="text-sm text-white/70">{primaryAction.subtitle}</div>
              </div>
            </div>
          </motion.button>

          {hasUnplayedDaily && !isDailyNudgeDismissedToday && state.settings.hasSeenHowTo && !state.campaignResumeSlug && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={dismissDailyNudgeForToday}
                className={cn(
                  'px-2 py-1 rounded-md text-xs transition-colors',
                  isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/10'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-black/5'
                )}
              >
                Не хочу ежедневник сегодня
              </button>
            </div>
          )}

          {/* Мой профиль — компактная строка с аватаром */}
          {authState.isAuthenticated && authState.user && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate('profile')}
              className={cn(
                "w-full p-3 rounded-2xl border transition-all flex items-center gap-3",
                styles.buttons.card.background,
                styles.buttons.card.border,
                styles.buttons.card.borderHover
              )}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 flex-shrink-0">
                {authState.user.photoUrl ? (
                  <img src={authState.user.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className={cn(
                    "w-full h-full rounded-full flex items-center justify-center font-bold text-sm",
                    isDark ? "bg-stone-800 text-amber-400" : "bg-white text-amber-600"
                  )}>
                    {authState.user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className={cn("font-semibold truncate", styles.buttons.text.primary)}>
                  {authState.user.name || 'Игрок'}
                </div>
                <div className={cn("text-xs", styles.buttons.text.muted)}>Мой профиль</div>
              </div>
              <span className={cn("text-lg", styles.buttons.text.muted)}>›</span>
            </motion.button>
          )}

          <div className={cn("flex items-center gap-2 pt-3 pb-0.5")}>
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", styles.buttons.text.muted)}>Прогресс</span>
            <span className={cn("flex-1 h-px", isDark ? "bg-white/10" : "bg-stone-200")} />
          </div>
          {/* Статистика и Рекорды */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('stats')}
              className={cn(
                "p-4 rounded-2xl border transition-all group relative overflow-hidden",
                styles.buttons.card.background,
                styles.buttons.card.border,
                styles.buttons.card.borderHover
              )}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", styles.buttons.iconColors.stats.bg)}>
                <BarChart3 size={22} className={styles.buttons.iconColors.stats.icon} />
              </div>
              <div className="text-left">
                <div className={cn("font-semibold", styles.buttons.text.primary)}>Статистика</div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('leaderboard')}
              className={cn(
                "p-4 rounded-2xl border transition-all group",
                styles.buttons.card.background,
                styles.buttons.card.border,
                styles.buttons.card.borderHover
              )}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", styles.buttons.iconColors.leaderboard.bg)}>
                <Trophy size={22} className={styles.buttons.iconColors.leaderboard.icon} />
              </div>
              <div className="text-left">
                <div className={cn("font-semibold", styles.buttons.text.primary)}>Рекорды</div>
              </div>
            </motion.button>
          </div>

          <div className={cn("flex items-center gap-2 pt-3 pb-0.5")}>
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", styles.buttons.text.muted)}>Обучение</span>
            <span className={cn("flex-1 h-px", isDark ? "bg-white/10" : "bg-stone-200")} />
          </div>
          {/* Учебник — фичевая карточка курса */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('textbook')}
            className="relative w-full p-4 rounded-2xl overflow-hidden group text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-500 to-orange-600" />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
            <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <GraduationCap size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg text-white leading-tight">Учебник</div>
                <div className="text-xs text-white/80 mt-0.5">
                  {tbProgress && tbProgress.done > 0
                    ? `Пройдено ${tbProgress.done} из ${tbProgress.total} уроков`
                    : 'Путь от алфавита до свободных фраз'}
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{ width: `${tbProgress ? (tbProgress.done / Math.max(1, tbProgress.total)) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <ArrowRight size={18} className="text-white/80 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </motion.button>

          <div className="grid grid-cols-2 gap-3">
            {/* Словарь */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('dictionary')}
              className={cn(
                "p-3.5 rounded-2xl border transition-all group text-left",
                styles.buttons.card.background,
                styles.buttons.card.border,
                styles.buttons.card.borderHover
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", styles.buttons.iconColors.dictionary.bg)}>
                <BookOpen size={20} className={styles.buttons.iconColors.dictionary.icon} />
              </div>
              <div className={cn("font-semibold text-sm", styles.buttons.text.primary)}>Словарь</div>
              <div className={cn("text-[11px] mt-0.5 truncate", styles.buttons.text.muted)}>{stats.learnedWords.length} из {totalVerifiedWords ?? '…'}</div>
            </motion.button>
            {/* Как играть */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('howto')}
              className={cn(
                "p-3.5 rounded-2xl border transition-all group text-left",
                styles.buttons.card.background,
                styles.buttons.card.border,
                styles.buttons.card.borderHover
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", styles.buttons.iconColors.help.bg)}>
                <HelpCircle size={20} className={styles.buttons.iconColors.help.icon} />
              </div>
              <div className={cn("font-semibold text-sm", styles.buttons.text.primary)}>Как играть</div>
              <div className={cn("text-[11px] mt-0.5 truncate", styles.buttons.text.muted)}>Пошаговое обучение</div>
            </motion.button>
          </div>

          <div className={cn("flex items-center gap-2 pt-3 pb-0.5")}>
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", styles.buttons.text.muted)}>Сообщество</span>
            <span className={cn("flex-1 h-px", isDark ? "bg-white/10" : "bg-stone-200")} />
          </div>
          {/* Үгын Дархан */}
          <motion.button
            onClick={() => navigate('contribute')}
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            className="relative w-full p-4 rounded-2xl overflow-hidden flex items-center gap-4 group cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500"
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              style={{ backgroundSize: '200% 200%' }}
            />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
            <motion.div 
              className="absolute inset-0 rounded-2xl"
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(244, 63, 94, 0.4), 0 0 40px rgba(244, 63, 94, 0.2)',
                  '0 0 35px rgba(244, 63, 94, 0.6), 0 0 70px rgba(244, 63, 94, 0.3)',
                  '0 0 20px rgba(244, 63, 94, 0.4), 0 0 40px rgba(244, 63, 94, 0.2)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            <motion.div 
              className="relative z-10 w-14 h-14 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Heart size={28} className="text-white fill-white/50" />
            </motion.div>
            
            <div className="relative z-10 text-left flex-1">
              <div className="font-bold text-lg text-white flex items-center gap-2">
                Үгын Дархан
                <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}>
                  ✨
                </motion.span>
              </div>
              <div className="text-sm text-white/90">Помоги сохранить бурятский язык!</div>
            </div>
            
            <motion.div 
              className="relative z-10 text-white font-bold text-xl"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.div>
          </motion.button>

          {/* Поддержать проект */}
          {allowDonateCta && (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('support')}
              className={cn(
                "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 group",
                styles.buttons.card.background,
                styles.buttons.card.border,
                "hover:border-rose-500/50"
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52 }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform bg-rose-500/15">
                <Heart size={22} className="text-rose-500" />
              </div>
              <div className="text-left flex-1">
                <div className={cn("font-semibold", styles.buttons.text.primary)}>Поддержать проект</div>
                <div className={cn("text-sm", styles.buttons.text.muted)}>На развитие приложения</div>
              </div>
            </motion.button>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Настройки */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('settings')}
              className={cn(
                "p-3.5 rounded-2xl border transition-all group text-left",
                styles.buttons.card.background,
                styles.buttons.card.border,
                styles.buttons.card.borderHover
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", styles.buttons.iconColors.settings.bg)}>
                <Settings size={20} className={styles.buttons.iconColors.settings.icon} />
              </div>
              <div className={cn("font-semibold text-sm", styles.buttons.text.primary)}>Настройки</div>
              <div className={cn("text-[11px] mt-0.5 truncate", styles.buttons.text.muted)}>Тема, звук, язык</div>
            </motion.button>
            {/* Вопросы и ответы */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { openLink('https://t.me/frntdev'); }}
              className={cn(
                "p-3.5 rounded-2xl border transition-all group text-left",
                styles.buttons.card.background,
                styles.buttons.card.border,
                styles.buttons.card.borderHover
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", styles.buttons.iconColors.help.bg)}>
                <HelpCircle size={20} className={styles.buttons.iconColors.help.icon} />
              </div>
              <div className={cn("font-semibold text-sm", styles.buttons.text.primary)}>Вопросы</div>
              <div className={cn("text-[11px] mt-0.5 truncate", styles.buttons.text.muted)}>Telegram: @frntdev</div>
            </motion.button>
          </div>

          {/* Admin panel (admin only) */}
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('admin')}
              className={cn(
                "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 group",
                styles.buttons.card.background,
                styles.buttons.card.border,
                "hover:border-violet-500/50"
              )}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform bg-violet-500/20">
                <Shield size={22} className="text-violet-400" />
              </div>
              <div className="text-left flex-1">
                <div className={cn("font-semibold", styles.buttons.text.primary)}>Админ-панель</div>
                <div className={cn("text-sm", styles.buttons.text.muted)}>Управление и статистика</div>
              </div>
            </motion.button>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center">
        <p className={cn("text-sm", styles.footer.text)}>Изучай бурятский язык играя! ✨</p>
      </footer>
    </div>
  );
};

// Helpers

function isDailyNudgeDismissedForDate(todayKey: string): boolean {
  try {
    return localStorage.getItem(DAILY_NUDGE_DISMISS_STORAGE_KEY) === todayKey;
  } catch {
    return false;
  }
}

function setDailyNudgeDismissedForDate(todayKey: string): void {
  try {
    localStorage.setItem(DAILY_NUDGE_DISMISS_STORAGE_KEY, todayKey);
  } catch {
    // ignore write errors
  }
}

function dateToLocalKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateToLocalKey(value?: string | null): string | null {
  if (!value) return null;

  const raw = value.trim();
  const yyyyMmDd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (yyyyMmDd) {
    const y = Number(yyyyMmDd[1]);
    const m = Number(yyyyMmDd[2]);
    const d = Number(yyyyMmDd[3]);
    return dateToLocalKey(new Date(y, m - 1, d));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateToLocalKey(parsed);
}

function getDaysWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'дней';
  if (lastDigit === 1) return 'день';
  if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
  return 'дней';
}

export default MainMenu;

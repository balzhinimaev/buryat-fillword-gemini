// src/screens/StatsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Clock,
  Target,
  Flame,
  Trophy,
  BookOpen,
  TrendingUp,
  Star,
  ArrowLeft,
  Plus,
  CheckCircle2,
  XCircle,
  Shield,
  Rocket,
  CalendarCheck,
  CalendarDays,
  Users,
  Lightbulb,
  Zap,
  Award,
  Medal,
  Sparkles,
  Mic,
  Radio,
  Flag,
  GraduationCap,
  Gift,
  Megaphone,
  ScrollText,
  Library,
  Feather,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import { useAuth } from '../store/authStore';
import { categories, getAllWords } from '../data/words';
import {
  getUserProfile,
  type UserProfileXpHistoryItem,
  type UserProfileAchievement,
} from '../services/api';

interface StatsScreenProps {
  store: GameStore;
}

interface XpDayStats {
  xp: number;
  actions: number;
  xpByType: Record<string, number>;
}

const XP_TYPE_LABELS: Record<string, string> = {
  daily: 'Ежедневный филлворд',
  streak: 'Бонус за серию дней',
  level: 'Прохождение уровней',
  lesson: 'Прохождение уроков',
  campaign: 'Кампания',
  endless: 'Бесконечный режим',
  word: 'Найденные слова',
  tutorial: 'Обучение',
  contribution: 'Словарная мастерская',
};

const ACHIEVEMENT_CATEGORY_ORDER: UserProfileAchievement['category'][] = [
  'starter',
  'progress',
  'streak',
  'campaign',
  'daily',
  'learning',
  'community',
  'referral',
];

const ACHIEVEMENT_CATEGORY_LABELS: Record<UserProfileAchievement['category'], string> = {
  starter: 'Старт',
  progress: 'Прогресс',
  streak: 'Серия',
  campaign: 'Кампания',
  daily: 'Дейлики',
  learning: 'Учебник',
  community: 'Комьюнити',
  referral: 'Друзья',
};

// Иконки достижений: бэкенд отдаёт эмодзи (стоковые смайлики) — рисуем свои,
// консистентные с остальным приложением. По id, с фолбэком по категории.
const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  starter_level_1: Rocket,
  starter_stars_5: Star,
  progress_level_5: TrendingUp,
  progress_level_10: Medal,
  progress_xp_1000: Zap,
  campaign_levels_5: Target,
  campaign_levels_15: Trophy,
  campaign_stars_25: Star,
  campaign_stars_50: Sparkles,
  streak_3: Flame,
  streak_7: CalendarCheck,
  streak_30: CalendarDays,
  daily_3: CalendarCheck,
  daily_14: CalendarDays,
  community_words_added_5: Plus,
  community_words_verified_25: CheckCircle2,
  community_words_approved_10: Shield,
  daily_50: Sun,
  community_audio_5: Mic,
  community_audio_25: Radio,
  community_reports_3: Flag,
  lore_keeper_1: ScrollText,
  lore_keeper_5: Library,
  lore_keeper_25: Feather,
  learning_theory_6: BookOpen,
  learning_quiz_6: GraduationCap,
  learning_exam_1: Trophy,
  referral_1: Gift,
  referral_5: Megaphone,
  // локальные фолбэк-ачивки (офлайн)
  first_level: Trophy,
  all_stars: Star,
};

const ACHIEVEMENT_CATEGORY_ICONS: Record<UserProfileAchievement['category'], LucideIcon> = {
  starter: Rocket,
  progress: TrendingUp,
  streak: Flame,
  campaign: Target,
  daily: CalendarCheck,
  learning: GraduationCap,
  community: Users,
  referral: Gift,
};

const AchievementIcon: React.FC<{
  achievement: Pick<UserProfileAchievement, 'id' | 'category'>;
  size?: number;
  className?: string;
}> = ({ achievement, size = 22, className }) => {
  const Icon =
    ACHIEVEMENT_ICONS[achievement.id] ??
    ACHIEVEMENT_CATEGORY_ICONS[achievement.category] ??
    Award;
  return <Icon size={size} className={className} />;
};

export const StatsScreen: React.FC<StatsScreenProps> = ({ store }) => {
  const { state, goBack, xpProgress, xpToNextLevel } = store;
  const { stats, levelProgress } = state;
  const { theme, isDark } = useTheme();
  const { state: authState, refreshUser } = useAuth();
  const [xpHistory, setXpHistory] = useState<UserProfileXpHistoryItem[]>([]);
  const [profileAchievements, setProfileAchievements] = useState<UserProfileAchievement[]>([]);
  const [selectedChartDayKey, setSelectedChartDayKey] = useState<string | null>(null);
  const [newAchievementToast, setNewAchievementToast] = useState<UserProfileAchievement | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<UserProfileAchievement | null>(null);

  const toLocalDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDateLabel = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const detectNewlyUnlockedAchievement = (
    userId: string,
    achievementsList: UserProfileAchievement[],
  ): UserProfileAchievement | null => {
    if (achievementsList.length === 0) return null;

    const storageKey = `bfw:seen-achievements:${userId}`;
    const unlockedIds = achievementsList
      .filter((item) => item.isUnlocked)
      .map((item) => item.id)
      .sort();

    try {
      const raw = localStorage.getItem(storageKey);

      if (!raw) {
        localStorage.setItem(storageKey, JSON.stringify(unlockedIds));
        return null;
      }

      const previous = JSON.parse(raw);
      const previousIds = Array.isArray(previous)
        ? previous.filter((item): item is string => typeof item === 'string')
        : [];

      const newlyUnlockedIds = unlockedIds.filter((id) => !previousIds.includes(id));
      localStorage.setItem(storageKey, JSON.stringify(unlockedIds));

      if (newlyUnlockedIds.length === 0) return null;

      return achievementsList.find((item) => item.id === newlyUnlockedIds[0] && item.isUnlocked) ?? null;
    } catch {
      return null;
    }
  };

  // Обновляем данные пользователя при монтировании компонента
  useEffect(() => {
    if (authState.isAuthenticated) {
      refreshUser();
    }
  }, [authState.isAuthenticated, refreshUser]);

  // История XP: нужна для блока «За сегодня / Лучший день»
  useEffect(() => {
    let mounted = true;

    const loadProfileHistory = async () => {
      const userId = authState.user?._id;
      if (!authState.isAuthenticated || !userId) {
        if (mounted) {
          setXpHistory([]);
          setProfileAchievements([]);
        }
        return;
      }

      try {
        const profile = await getUserProfile(userId);
        if (mounted) {
          const achievementsFromApi = profile.achievements ?? [];
          setXpHistory(profile.recentXpHistory ?? []);
          setProfileAchievements(achievementsFromApi);

          const newlyUnlocked = detectNewlyUnlockedAchievement(userId, achievementsFromApi);
          if (newlyUnlocked) {
            window.setTimeout(() => setNewAchievementToast(newlyUnlocked), 0);
          }
        }
      } catch {
        if (mounted) {
          setXpHistory([]);
          setProfileAchievements([]);
        }
      }
    };

    loadProfileHistory();
    return () => {
      mounted = false;
    };
  }, [authState.isAuthenticated, authState.user?._id]);

  // Streak — берём из бэка или fallback на локальное
  const currentStreak = authState.user?.streak?.current ?? stats.currentStreak;
  const longestStreak = authState.user?.streak?.longest ?? stats.longestStreak;

  // XP/Level — берём из бэка или fallback на локальное
  const backendXp = authState.user?.xp;
  const displayLevel = backendXp?.level ?? stats.level;
  const displayXpProgress = backendXp
    ? backendXp.progressPercent / 100
    : xpProgress;
  // xpRemainingToNextLevel — сколько осталось до следующего уровня
  const displayXpRemaining = backendXp?.xpRemainingToNextLevel ?? xpToNextLevel;

  // Campaign stats — берём из бэка или fallback на локальное
  const campaignStats = authState.user?.campaignStats;
  const displayTotalStars = campaignStats?.totalStars ?? stats.totalStars;
  const displayMaxStars = campaignStats?.maxPossibleStars ?? 36;
  const displayPlayTime = campaignStats?.totalPlayTimeSeconds ?? stats.totalTimePlayed;
  const displayTotalAttempts = campaignStats?.totalAttempts ?? stats.totalGamesPlayed;
  
  useBackButton(() => {
    if (selectedAchievement) {
      setSelectedAchievement(null);
      return;
    }
    goBack();
  });

  // Форматирование времени
  const formatPlayTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} сек`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours} ч ${mins} м`;
  };

  // Расчёт процента выученных слов
  const allWords = getAllWords();
  const learnedPercent = Math.round((stats.learnedWords.length / allWords.length) * 100);

  // Количество пройденных уровней
  const completedLevels = Object.values(levelProgress).filter(p => p.completed).length;
  const totalLevels = categories.length;

  // Достижения: берём с бэка, fallback — локальная упрощённая модель
  const fallbackAchievements: UserProfileAchievement[] = [
    { id: 'first_level', name: 'Первая победа', icon: '🏆', category: 'starter', isUnlocked: completedLevels >= 1, description: 'Пройти первый уровень', progress: completedLevels, target: 1, progressPercent: Math.min(100, completedLevels * 100) },
    { id: 'streak_7', name: 'Неделя!', icon: '📅', category: 'streak', isUnlocked: longestStreak >= 7, description: 'Играть 7 дней подряд', progress: longestStreak, target: 7, progressPercent: Math.min(100, Math.round((longestStreak / 7) * 100)) },
    { id: 'all_stars', name: 'Коллекционер', icon: '⭐', category: 'campaign', isUnlocked: displayTotalStars >= displayMaxStars, description: 'Собрать все звёзды', progress: displayTotalStars, target: displayMaxStars, progressPercent: Math.min(100, Math.round((displayTotalStars / Math.max(1, displayMaxStars)) * 100)) },
    { id: 'level_5', name: 'Прокачанный', icon: '⬆️', category: 'progress', isUnlocked: displayLevel >= 5, description: 'Достигнуть 5 уровня', progress: displayLevel, target: 5, progressPercent: Math.min(100, Math.round((displayLevel / 5) * 100)) },
  ];

  const achievements = profileAchievements.length > 0
    ? profileAchievements
    : fallbackAchievements;

  const sortedAchievements = useMemo(() => (
    [...achievements].sort((a, b) => {
      const categoryDiff = ACHIEVEMENT_CATEGORY_ORDER.indexOf(a.category) - ACHIEVEMENT_CATEGORY_ORDER.indexOf(b.category);
      if (categoryDiff !== 0) return categoryDiff;
      if (a.isUnlocked !== b.isUnlocked) return Number(b.isUnlocked) - Number(a.isUnlocked);
      return (b.progressPercent ?? 0) - (a.progressPercent ?? 0);
    })
  ), [achievements]);

  const unlockedAchievements = sortedAchievements.filter((a) => a.isUnlocked);
  const nextAchievementHints = sortedAchievements
    .filter((a) => !a.isUnlocked)
    .sort((a, b) => (b.progressPercent ?? 0) - (a.progressPercent ?? 0))
    .slice(0, 3);

  const achievementCategorySummary = useMemo(() => (
    ACHIEVEMENT_CATEGORY_ORDER
      .map((category) => ({
        category,
        total: sortedAchievements.filter((item) => item.category === category).length,
      }))
      .filter((item) => item.total > 0)
  ), [sortedAchievements]);

  useEffect(() => {
    if (!newAchievementToast) return;
    const timer = window.setTimeout(() => setNewAchievementToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [newAchievementToast]);

  // Статы для отображения
  const statCards = [
    { icon: Target, label: 'Слов найдено', value: stats.totalWordsFound, color: 'amber' },
    { icon: Clock, label: 'Время в игре', value: formatPlayTime(displayPlayTime), color: 'terra' },
    { icon: Flame, label: 'Серия дней', value: currentStreak, subValue: `Рекорд: ${longestStreak}`, color: 'orange' },
    { icon: BarChart3, label: 'Игр сыграно', value: displayTotalAttempts, color: 'meadow' },
  ];

  const groupedXpByDay = useMemo(() => {
    const byDay = new Map<string, XpDayStats>();

    xpHistory.forEach((entry) => {
      const date = new Date(entry.createdAt);
      if (Number.isNaN(date.getTime())) return;

      const key = toLocalDateKey(date);
      const current = byDay.get(key) ?? { xp: 0, actions: 0, xpByType: {} };
      const gainedXp = Math.max(0, entry.amount);
      const typeKey = (entry.type ?? 'other').toLowerCase();

      byDay.set(key, {
        xp: current.xp + gainedXp,
        actions: current.actions + 1,
        xpByType: {
          ...current.xpByType,
          [typeKey]: (current.xpByType[typeKey] ?? 0) + gainedXp,
        },
      });
    });

    return byDay;
  }, [xpHistory]);

  const todayProgress = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    return groupedXpByDay.get(todayKey) ?? { xp: 0, actions: 0, xpByType: {} };
  }, [groupedXpByDay]);

  const bestDayProgress = useMemo<{ dateKey: string; xp: number; actions: number } | null>(() => {
    let best: { dateKey: string; xp: number; actions: number } | null = null;

    groupedXpByDay.forEach((value, key) => {
      if (!best || value.xp > best.xp || (value.xp === best.xp && key > best.dateKey)) {
        best = { dateKey: key, xp: value.xp, actions: value.actions };
      }
    });

    return best;
  }, [groupedXpByDay]);

  const last7DaysXp = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));

      const key = toLocalDateKey(date);
      const dayData = groupedXpByDay.get(key) ?? { xp: 0, actions: 0, xpByType: {} };
      const weekDay = date
        .toLocaleDateString('ru-RU', { weekday: 'short' })
        .replace('.', '')
        .slice(0, 2);

      const topTypeEntry = Object.entries(dayData.xpByType).sort((a, b) => b[1] - a[1])[0];
      const topTypeKey = topTypeEntry?.[0] ?? null;
      const topTypeLabel = topTypeKey
        ? Object.entries(XP_TYPE_LABELS).find(([keyPart]) => topTypeKey.includes(keyPart))?.[1] ?? 'Разные активности'
        : null;

      return {
        key,
        weekDay,
        dayNumber: date.getDate(),
        xp: dayData.xp,
        actions: dayData.actions,
        topTypeKey,
        topTypeLabel,
      };
    });

    const maxXp = Math.max(1, ...days.map((day) => day.xp));
    const hasAnyXp = days.some((day) => day.xp > 0);

    return { days, maxXp, hasAnyXp };
  }, [groupedXpByDay]);

  const preferredChartDayKey = useMemo(() => {
    if (last7DaysXp.days.length === 0) return null;

    const todayKey = toLocalDateKey(new Date());
    return last7DaysXp.days.find((day) => day.key === todayKey)?.key
      ?? last7DaysXp.days[last7DaysXp.days.length - 1].key;
  }, [last7DaysXp.days]);

  const selectedChartDay = useMemo(() => {
    if (last7DaysXp.days.length === 0) return null;

    return last7DaysXp.days.find((day) => day.key === selectedChartDayKey)
      ?? last7DaysXp.days.find((day) => day.key === preferredChartDayKey)
      ?? last7DaysXp.days[last7DaysXp.days.length - 1];
  }, [last7DaysXp.days, preferredChartDayKey, selectedChartDayKey]);

  const getXpTip = (day: { xp: number; actions: number; topTypeKey: string | null }) => {
    if (day.xp <= 0) {
      return 'Начни с 1 уровня кампании и «слова дня» — это самый быстрый старт для XP.';
    }

    if (day.actions <= 1) {
      return 'Сделай ещё 1–2 коротких захода сегодня: несколько сессий в день дают XP стабильнее.';
    }

    if (day.topTypeKey?.includes('daily')) {
      return 'У тебя хорошо работает ежедневный режим — закрепи его серией дней для бонусного XP.';
    }

    if (day.xp < 80) {
      return 'Для ускорения XP добивай уровни на 3★ и закрывай ежедневный филлворд.';
    }

    return 'Отличный темп! Чтобы расти ещё быстрее — держи серию дней и проходи уровни без подсказок.';
  };

  const getAchievementTip = (achievement: UserProfileAchievement) => {
    if (achievement.isUnlocked) {
      return 'Открыто! Продолжай в том же темпе и двигайся к следующей цели.';
    }

    const remaining = Math.max(0, achievement.target - achievement.progress);
    if (remaining <= 1) {
      return 'Остался последний шаг — можно закрыть уже в следующей сессии.';
    }

    if (achievement.category === 'streak') {
      return `До цели осталось ${remaining} дн. серии. Заходи ежедневно без пропусков.`;
    }

    if (achievement.category === 'daily') {
      return `Осталось ${remaining} прохождений филлворда дня. Это самый стабильный путь.`;
    }

    if (achievement.category === 'campaign') {
      return `Осталось ${remaining}. Проходи уровни на 3★ — прогресс будет быстрее.`;
    }

    return `До открытия осталось ${remaining}. Маленькие шаги каждый день дают лучший результат.`;
  };

  return (
    <div className={cn(theme.backgrounds.primaryGradient, "min-h-[100dvh] flex flex-col relative overflow-hidden")}>
      {newAchievementToast && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed top-[max(env(safe-area-inset-top),12px)] left-3 right-3 z-[60]"
        >
          <div className={cn(
            "rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur",
            theme.backgrounds.card,
            theme.borders.subtle,
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center">
                <AchievementIcon achievement={newAchievementToast} size={20} className="text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn("text-xs", theme.text.muted)}>Новое достижение</div>
                <div className={cn("font-semibold truncate", theme.text.primary)}>{newAchievementToast.name}</div>
                <div className={cn("text-xs truncate", theme.text.dimmed)}>
                  {ACHIEVEMENT_CATEGORY_LABELS[newAchievementToast.category]} · {newAchievementToast.description}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewAchievementToast(null)}
                className={cn("p-1 rounded-lg", theme.text.dimmed, "hover:bg-white/10")}
                aria-label="Закрыть уведомление о достижении"
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sticky Header при скролле */}
      <StickyHeader 
        title="Статистика" 
        onBack={() => goBack()} 
      />
      
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-meadow-500/10 via-steppe-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      {/* Hero-шапка */}
      <header className={cn(
        'relative overflow-hidden p-4 pb-5 z-10',
        isDark ? '' : 'rounded-b-3xl shadow-lg',
        theme.header.bg,
        theme.header.text
      )}>
        <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => goBack()} aria-label="Назад" className="p-2 -ml-2 rounded-xl active:bg-white/10">
              <ArrowLeft size={22} />
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">
              прогресс
            </span>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight mt-1 px-1 mb-4">Статистика</h1>

          {/* Уровень + XP-полоса прямо в хиро */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur-sm p-3.5"
          >
            <div className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <span className="text-white font-extrabold text-xl drop-shadow">{displayLevel}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-semibold text-sm">Уровень {displayLevel}</span>
                <span className="text-xs opacity-70">{displayXpRemaining} XP до след.</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden bg-black/20">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${displayXpProgress * 100}%` }}
                  transition={{ type: 'spring', stiffness: 50 }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-6 space-y-4 overflow-auto relative z-10">
        {/* Profile / contribution (backend) */}
        {authState.user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-4")}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className={cn("font-semibold truncate", theme.text.primary)}>
                  {authState.user.name}
                </div>
                <div className={cn("text-xs truncate mb-1.5", theme.text.muted)}>
                  @{authState.user.telegramUsername || '—'}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn(
                    'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    authState.user.role === 'admin' || authState.user.role === 'moderator'
                      ? 'bg-violet-500/15 text-violet-400'
                      : authState.user.role === 'trusted'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : isDark ? 'bg-white/10 text-stone-400' : 'bg-stone-100 text-stone-500',
                  )}>
                    <Shield size={10} />
                    {authState.user.role === 'admin' ? 'Админ'
                      : authState.user.role === 'moderator' ? 'Модератор'
                      : authState.user.role === 'trusted' ? 'Доверенный'
                      : 'Участник'}
                  </span>
                  <span className={cn(
                    'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600',
                  )}>
                    <Award size={10} />
                    Доверие {authState.user.trustScore ?? 0}
                  </span>
                </div>
              </div>
              {authState.user.isPremium && (
                <div className="px-2 py-1 rounded-lg text-xs bg-gradient-to-r from-amber-500/30 to-orange-500/20 text-amber-300 border border-amber-500/20">
                  Premium
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-3")}>
                <div className={cn("flex items-center gap-2 text-xs mb-1", theme.text.muted)}>
                  <Plus size={12} />
                  Добавлено слов
                </div>
                <div className={cn("text-xl font-bold", theme.text.primary)}>{authState.user.stats.wordsAdded}</div>
              </div>

              <div className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-3")}>
                <div className={cn("flex items-center gap-2 text-xs mb-1", theme.text.muted)}>
                  <CheckCircle2 size={12} />
                  Одобрено
                </div>
                <div className={cn("text-xl font-bold", theme.text.primary)}>{authState.user.stats.wordsApproved}</div>
              </div>

              <div className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-3")}>
                <div className={cn("flex items-center gap-2 text-xs mb-1", theme.text.muted)}>
                  <BarChart3 size={12} />
                  Проверено
                </div>
                <div className={cn("text-xl font-bold", theme.text.primary)}>{authState.user.stats.wordsVerified}</div>
              </div>

              <div className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-3")}>
                <div className={cn("flex items-center gap-2 text-xs mb-1", theme.text.muted)}>
                  <XCircle size={12} />
                  Отклонено
                </div>
                <div className={cn("text-xl font-bold", theme.text.primary)}>{authState.user.stats.wordsRejected}</div>
              </div>
            </div>

            <div className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-3 mt-3")}>
              <div className="flex items-center justify-between">
                <div className={cn("flex items-center gap-2 text-sm", theme.text.secondary)}>
                  <Shield size={14} />
                  Точность проверок
                </div>
                <div className={cn("text-lg font-bold", theme.text.primary)}>
                  {authState.user.stats.verificationAccuracy}%
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-4")}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                stat.color === 'amber' && "bg-amber-500/20",
                stat.color === 'terra' && "bg-terra-500/20",
                stat.color === 'orange' && "bg-orange-500/20",
                stat.color === 'meadow' && "bg-meadow-500/20",
              )}>
                <stat.icon size={20} className={cn(
                  stat.color === 'amber' && "text-amber-400",
                  stat.color === 'terra' && "text-terra-400",
                  stat.color === 'orange' && "text-orange-400",
                  stat.color === 'meadow' && "text-meadow-400",
                )} />
              </div>
              <div className={cn("text-2xl font-bold mb-1", theme.text.primary)}>{stat.value}</div>
              <div className={theme.text.muted}>{stat.label}</div>
              {stat.subValue && <div className={cn("text-xs mt-1", theme.text.dimmed)}>{stat.subValue}</div>}
            </motion.div>
          ))}
        </motion.div>

        {/* Daily activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-4")}
        >
          <h3 className={cn("font-semibold mb-4 flex items-center gap-2", theme.text.primary)}>
            <TrendingUp size={18} className="text-violet-400" />
            Динамика XP
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-3")}>
              <div className={cn("text-xs mb-1", theme.text.muted)}>За сегодня</div>
              <div className={cn("text-2xl font-bold", theme.text.primary)}>+{todayProgress.xp} XP</div>
              <div className={cn("text-xs mt-1", theme.text.dimmed)}>{todayProgress.actions} активн.</div>
            </div>

            <div className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-3")}>
              <div className={cn("text-xs mb-1", theme.text.muted)}>Лучший день</div>
              <div className={cn("text-2xl font-bold", theme.text.primary)}>
                {bestDayProgress ? `+${bestDayProgress.xp} XP` : '—'}
              </div>
              <div className={cn("text-xs mt-1", theme.text.dimmed)}>
                {bestDayProgress
                  ? `${formatDateLabel(bestDayProgress.dateKey)} · ${bestDayProgress.actions} активн.`
                  : 'Недостаточно данных'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Weekly XP chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19 }}
          className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-4")}
        >
          <h3 className={cn("font-semibold mb-3 flex items-center gap-2", theme.text.primary)}>
            <BarChart3 size={18} className="text-amber-400" />
            XP за 7 дней
          </h3>

          <p className={cn("text-xs mb-3", theme.text.dimmed)}>
            Тапни по столбику, чтобы посмотреть детали дня
          </p>

          <div className="grid grid-cols-7 gap-2 items-end">
            {last7DaysXp.days.map((day, index) => {
              const heightPercent = day.xp > 0
                ? Math.max(10, (day.xp / last7DaysXp.maxXp) * 100)
                : 0;
              const isSelected = day.key === selectedChartDay?.key;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedChartDayKey(day.key)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg p-1 transition-colors",
                    isSelected
                      ? (theme.borders.subtle + " border bg-white/5")
                      : "border border-transparent"
                  )}
                >
                  <div className={cn("text-[10px] tabular-nums", isSelected ? theme.text.primary : theme.text.dimmed)}>
                    {day.xp > 0 ? `+${day.xp}` : '·'}
                  </div>

                  <div className={cn("w-full h-20 rounded-lg flex items-end p-1", theme.progress.track)}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ delay: 0.2 + index * 0.04, duration: 0.35 }}
                      className={cn(
                        "w-full rounded-md",
                        day.xp > 0
                          ? (isSelected
                              ? 'bg-gradient-to-t from-amber-400 to-orange-400 shadow-lg shadow-amber-500/30'
                              : 'bg-gradient-to-t from-amber-500 to-orange-500')
                          : 'bg-transparent'
                      )}
                    />
                  </div>

                  <div className={cn("text-[10px] uppercase", isSelected ? theme.text.primary : theme.text.muted)}>{day.weekDay}</div>
                  <div className={cn("text-[10px] tabular-nums", theme.text.dimmed)}>{day.dayNumber}</div>
                </button>
              );
            })}
          </div>

          {!last7DaysXp.hasAnyXp && (
            <p className={cn("text-xs mt-3 text-center", theme.text.dimmed)}>
              Пока нет активности за последние 7 дней
            </p>
          )}

          {selectedChartDay && (
            <div className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-3 mt-3") }>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <div className={cn("text-xs", theme.text.muted)}>{formatDateLabel(selectedChartDay.key)}</div>
                  <div className={cn("text-lg font-bold", theme.text.primary)}>
                    +{selectedChartDay.xp} XP · {selectedChartDay.actions} активн.
                  </div>
                </div>
                {selectedChartDay.topTypeLabel && (
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded-full font-semibold",
                    isDark ? "bg-amber-500/15 text-amber-300 border border-amber-400/20" : "bg-amber-50 text-amber-600 border border-amber-200"
                  )}>
                    {selectedChartDay.topTypeLabel}
                  </span>
                )}
              </div>

              <p className={cn("text-xs leading-relaxed flex items-start gap-1.5", theme.text.secondary)}>
                <Lightbulb size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{getXpTip(selectedChartDay)}</span>
              </p>
            </div>
          )}
        </motion.div>

        {/* Progress section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-4")}
        >
          <h3 className={cn("font-semibold mb-4 flex items-center gap-2", theme.text.primary)}>
            <TrendingUp size={18} className="text-steppe-400" />
            Прогресс обучения
          </h3>
          
          <div className="space-y-4">
            {/* Words learned */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className={theme.text.secondary}>Выученные слова</span>
                <span className={cn("font-medium", theme.text.primary)}>{stats.learnedWords.length}/{allWords.length}</span>
              </div>
              <div className={cn("h-2.5 rounded-full overflow-hidden", theme.progress.track)}>
                <motion.div
                  className={theme.progress.fill.success}
                  style={{ height: '100%' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${learnedPercent}%` }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                />
              </div>
              <p className={cn("text-xs mt-1", theme.text.dimmed)}>
                Слово считается выученным после 3 находок
              </p>
            </div>

            {/* Levels completed */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className={theme.text.secondary}>Пройдено уровней</span>
                <span className={cn("font-medium", theme.text.primary)}>{completedLevels}/{totalLevels}</span>
              </div>
              <div className={cn("h-2.5 rounded-full overflow-hidden", theme.progress.track)}>
                <motion.div
                  className={theme.progress.fill.primary}
                  style={{ height: '100%' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedLevels / totalLevels) * 100}%` }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                />
              </div>
            </div>

            {/* Stars */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className={theme.text.secondary}>Собрано звёзд</span>
                <span className={cn("font-medium", theme.text.accent)}>{displayTotalStars}/{displayMaxStars}</span>
              </div>
              <div className={cn("h-2.5 rounded-full overflow-hidden", theme.progress.track)}>
                <motion.div
                  className={theme.progress.fill.amber}
                  style={{ height: '100%' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(displayTotalStars / displayMaxStars) * 100}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-4")}
        >
          <h3 className={cn("font-semibold mb-4 flex items-center gap-2", theme.text.primary)}>
            <Trophy size={18} className="text-amber-400" />
            Достижения 
            <span className={theme.text.muted}>({unlockedAchievements.length}/{achievements.length})</span>
          </h3>

          {achievementCategorySummary.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {achievementCategorySummary.map((item) => (
                <span
                  key={item.category}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-full border",
                    theme.borders.subtle,
                    theme.text.dimmed,
                    theme.backgrounds.card,
                  )}
                >
                  {ACHIEVEMENT_CATEGORY_LABELS[item.category]} · {item.total}
                </span>
              ))}
            </div>
          )}

          <p className={cn("text-xs mb-3", theme.text.dimmed)}>
            Нажми на достижение, чтобы увидеть детали и советы по прогрессу
          </p>

          <div className="grid grid-cols-5 gap-2">
            {sortedAchievements.map((achievement, index) => {
              const isActive = selectedAchievement?.id === achievement.id;

              return (
                <motion.button
                  key={achievement.id}
                  type="button"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.03 }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedAchievement(achievement)}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative overflow-hidden border",
                    achievement.isUnlocked
                      ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 shadow-lg shadow-amber-500/10 border-amber-400/20'
                      : isDark
                        ? 'bg-stone-800/50 border-white/5'
                        : 'bg-stone-100 border-stone-200',
                    isActive && 'ring-2 ring-amber-400/70 ring-offset-1 ring-offset-transparent'
                  )}
                  title={`${achievement.name}: ${achievement.description}`}
                  aria-label={`Открыть достижение: ${achievement.name}`}
                >
                  <AchievementIcon
                    achievement={achievement}
                    size={22}
                    className={achievement.isUnlocked ? 'text-amber-400' : isDark ? 'text-stone-600' : 'text-stone-400'}
                  />
                  {!achievement.isUnlocked && typeof achievement.progressPercent === 'number' && (
                    <div className={cn("absolute bottom-1 left-1 right-1 h-1 rounded-full overflow-hidden", isDark ? 'bg-black/25' : 'bg-stone-200')}>
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${Math.max(4, achievement.progressPercent)}%` }}
                      />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {nextAchievementHints.length > 0 && (
            <div className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-3 mt-3") }>
              <div className={cn("text-xs mb-2", theme.text.muted)}>Ближе всего к открытию</div>
              <div className="space-y-1.5">
                {nextAchievementHints.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className={cn("truncate flex items-center gap-1.5", theme.text.secondary)}>
                      <AchievementIcon achievement={item} size={13} className="text-amber-400 flex-shrink-0" />
                      {item.name}
                    </span>
                    <span className={cn("tabular-nums", theme.text.dimmed)}>
                      {item.progress}/{item.target}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Category Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-4")}
        >
          <h3 className={cn("font-semibold mb-4 flex items-center gap-2", theme.text.primary)}>
            <BookOpen size={18} className="text-terra-400" />
            По категориям
          </h3>
          
          <div className="space-y-2 max-h-48 overflow-auto pr-1">
            {categories.map((category) => {
              const progress = levelProgress[category.id];
              return (
                <div 
                  key={category.id}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl transition-colors",
                    isDark ? "bg-stone-800/30 hover:bg-stone-800/50" : "bg-stone-50 hover:bg-stone-100"
                  )}
                >
                  <span className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0",
                    isDark ? "bg-amber-500/10" : "bg-amber-50"
                  )}>
                    {category.emoji}
                  </span>
                  <span className={cn("flex-1 text-sm truncate", theme.text.secondary)}>{category.name}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={
                          progress && progress.stars >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-transparent text-stone-600'
                        }
                      />
                    ))}
                  </div>
                  {progress?.bestTime && (
                    <span className={cn("text-xs tabular-nums", theme.text.dimmed)}>
                      {Math.floor(progress.bestTime / 60)}:{(progress.bestTime % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70]"
          >
            <button
              type="button"
              onClick={() => setSelectedAchievement(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
              aria-label="Закрыть детали достижения"
            />

            <motion.div
              initial={{ y: 32, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className={cn(
                "absolute left-3 right-3 bottom-3 rounded-3xl border p-4 shadow-2xl",
                theme.backgrounds.card,
                theme.borders.subtle,
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center border",
                  selectedAchievement.isUnlocked
                    ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 border-amber-400/20'
                    : isDark ? 'bg-stone-800/60 border-white/10' : 'bg-stone-100 border-stone-200'
                )}>
                  <AchievementIcon
                    achievement={selectedAchievement}
                    size={26}
                    className={selectedAchievement.isUnlocked ? 'text-amber-400' : isDark ? 'text-stone-500' : 'text-stone-400'}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className={cn("text-xs mb-1", theme.text.muted)}>
                    {ACHIEVEMENT_CATEGORY_LABELS[selectedAchievement.category]}
                  </div>
                  <div className={cn("font-semibold", theme.text.primary)}>{selectedAchievement.name}</div>
                  <div className={cn("text-xs mt-0.5", theme.text.secondary)}>{selectedAchievement.description}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAchievement(null)}
                  className={cn("p-1 rounded-lg", theme.text.dimmed, "hover:bg-white/10")}
                  aria-label="Закрыть"
                >
                  <XCircle size={16} />
                </button>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={theme.text.muted}>Прогресс</span>
                  <span className={cn("tabular-nums", theme.text.secondary)}>
                    {selectedAchievement.progress}/{selectedAchievement.target}
                  </span>
                </div>
                <div className={cn("h-2.5 rounded-full overflow-hidden", theme.progress.track)}>
                  <div
                    className={selectedAchievement.isUnlocked ? theme.progress.fill.amber : theme.progress.fill.primary}
                    style={{
                      height: '100%',
                      width: `${Math.max(4, selectedAchievement.progressPercent)}%`,
                    }}
                  />
                </div>
              </div>

              <p className={cn("text-xs leading-relaxed mt-3 flex items-start gap-1.5", theme.text.secondary)}>
                <Lightbulb size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{getAchievementTip(selectedAchievement)}</span>
              </p>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAchievement(null)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-medium border",
                    theme.borders.subtle,
                    theme.text.primary,
                    theme.backgrounds.card,
                  )}
                >
                  Понятно
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatsScreen;

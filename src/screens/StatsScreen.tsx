// src/screens/StatsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
  Shield
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import { useAuth } from '../store/authStore';
import { categories, getAllWords } from '../data/words';
import { getUserProfile, type UserProfileXpHistoryItem } from '../services/api';

interface StatsScreenProps {
  store: GameStore;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ store }) => {
  const { state, goBack, xpProgress, xpToNextLevel } = store;
  const { stats, levelProgress } = state;
  const { theme } = useTheme();
  const { state: authState, refreshUser } = useAuth();
  const [xpHistory, setXpHistory] = useState<UserProfileXpHistoryItem[]>([]);

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
        if (mounted) setXpHistory([]);
        return;
      }

      try {
        const profile = await getUserProfile(userId);
        if (mounted) {
          setXpHistory(profile.recentXpHistory ?? []);
        }
      } catch {
        if (mounted) {
          setXpHistory([]);
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
  
  useBackButton(() => goBack());

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

  // Достижения
  const achievements = [
    { id: 'first_word', name: 'Первое слово', icon: '🎯', condition: stats.totalWordsFound >= 1, description: 'Найти первое слово' },
    { id: 'ten_words', name: 'Десятка', icon: '🔟', condition: stats.totalWordsFound >= 10, description: 'Найти 10 слов' },
    { id: 'fifty_words', name: 'Полтинник', icon: '5️⃣0️⃣', condition: stats.totalWordsFound >= 50, description: 'Найти 50 слов' },
    { id: 'hundred_words', name: 'Сотня', icon: '💯', condition: stats.totalWordsFound >= 100, description: 'Найти 100 слов' },
    { id: 'first_level', name: 'Первая победа', icon: '🏆', condition: completedLevels >= 1, description: 'Пройти первый уровень' },
    { id: 'streak_3', name: 'Три дня подряд', icon: '🔥', condition: longestStreak >= 3, description: 'Играть 3 дня подряд' },
    { id: 'streak_7', name: 'Неделя!', icon: '📅', condition: longestStreak >= 7, description: 'Играть 7 дней подряд' },
    { id: 'learned_10', name: 'Ученик', icon: '📚', condition: stats.learnedWords.length >= 10, description: 'Выучить 10 слов' },
    { id: 'all_stars', name: 'Коллекционер', icon: '⭐', condition: displayTotalStars >= displayMaxStars, description: 'Собрать все звёзды' },
    { id: 'level_5', name: 'Прокачанный', icon: '⬆️', condition: displayLevel >= 5, description: 'Достигнуть 5 уровня' },
  ];

  const unlockedAchievements = achievements.filter(a => a.condition);

  // Статы для отображения
  const statCards = [
    { icon: Target, label: 'Слов найдено', value: stats.totalWordsFound, color: 'amber' },
    { icon: Clock, label: 'Время в игре', value: formatPlayTime(displayPlayTime), color: 'terra' },
    { icon: Flame, label: 'Серия дней', value: currentStreak, subValue: `Рекорд: ${longestStreak}`, color: 'orange' },
    { icon: BarChart3, label: 'Игр сыграно', value: displayTotalAttempts, color: 'meadow' },
  ];

  const groupedXpByDay = useMemo(() => {
    const byDay = new Map<string, { xp: number; actions: number }>();

    xpHistory.forEach((entry) => {
      const date = new Date(entry.createdAt);
      if (Number.isNaN(date.getTime())) return;

      const key = toLocalDateKey(date);
      const current = byDay.get(key) ?? { xp: 0, actions: 0 };
      byDay.set(key, {
        xp: current.xp + Math.max(0, entry.amount),
        actions: current.actions + 1,
      });
    });

    return byDay;
  }, [xpHistory]);

  const todayProgress = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    return groupedXpByDay.get(todayKey) ?? { xp: 0, actions: 0 };
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

  return (
    <div className={cn(theme.backgrounds.primaryGradient, "min-h-[100dvh] flex flex-col relative overflow-hidden")}>
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

      {/* Header */}
      <header className="relative z-10 p-4 pb-6">
        <div className="flex items-center gap-4 mb-5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => goBack()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={24} className={theme.text.primary} />
          </motion.button>
          <h1 className={cn("text-2xl font-bold flex-1", theme.text.primary)}>Статистика</h1>
        </div>
        
        {/* XP Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(theme.backgrounds.card, theme.borders.subtle, "border rounded-2xl p-4")}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-steppe-500 to-steppe-700 flex items-center justify-center shadow-lg shadow-steppe-500/20">
              <span className="text-white font-bold text-xl">{displayLevel}</span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className={cn("font-semibold", theme.text.primary)}>Уровень {displayLevel}</span>
                <span className={theme.text.muted}>{displayXpRemaining} XP до след.</span>
              </div>
              <div className={cn("h-3 rounded-full overflow-hidden", theme.progress.track)}>
                <motion.div
                  className={theme.progress.fill.primary}
                  style={{ height: '100%' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${displayXpProgress * 100}%` }}
                  transition={{ type: 'spring', stiffness: 50 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
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
                <div className={cn("text-xs truncate", theme.text.muted)}>
                  @{authState.user.telegramUsername || '—'} • роль: {authState.user.role} • trust: {authState.user.trustScore}
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
          
          <div className="grid grid-cols-5 gap-2">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.03 }}
                whileHover={{ scale: 1.1 }}
                className={cn(
                  "aspect-square rounded-xl flex items-center justify-center text-2xl transition-all",
                  achievement.condition
                    ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 shadow-lg shadow-amber-500/10'
                    : 'bg-stone-800/50 grayscale opacity-40'
                )}
                title={`${achievement.name}: ${achievement.description}`}
              >
                {achievement.icon}
              </motion.div>
            ))}
          </div>
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
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-800/30 hover:bg-stone-800/50 transition-colors"
                >
                  <span className="text-xl">{category.emoji}</span>
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
    </div>
  );
};

export default StatsScreen;

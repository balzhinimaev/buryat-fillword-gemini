// src/screens/LeaderboardScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, Star, Zap, Flame, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';
import type { GameStore } from '../store/gameStore';
import {
  api,
  type LeaderboardType,
  type LeaderboardPeriod,
  type LeaderboardEntry,
  type LeaderboardResponse,
} from '../services/api';
import { UserProfileSheet } from '../components/UserProfileSheet';

interface LeaderboardScreenProps {
  store: GameStore;
}

// Призы за топ-3 в турнире месяца (XP + month)
const PRIZES: Record<number, { amount: string; emoji: string; color: string }> = {
  1: { amount: '$50', emoji: '🥇', color: 'from-amber-400 to-yellow-500' },
  2: { amount: '$25', emoji: '🥈', color: 'from-slate-300 to-slate-400' },
  3: { amount: '$15', emoji: '🥉', color: 'from-amber-600 to-amber-700' },
};

// Конфигурация табов по типу рейтинга
const TYPE_TABS: { id: LeaderboardType; label: string; icon: React.ReactNode }[] = [
  { id: 'stars',  label: 'Звёзды', icon: <Star size={16} className="fill-current" /> },
  { id: 'xp',     label: 'Опыт',   icon: <Zap size={16} /> },
  { id: 'streak', label: 'Серия',   icon: <Flame size={16} /> },
];

const PERIOD_TABS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'all',   label: 'Все время' },
  { id: 'week',  label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
];

// ─── Призовой баннер ─────────────────────────────────────────────
const PrizeBanner: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, height: 0, marginTop: 0 }}
    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
    exit={{ opacity: 0, height: 0, marginTop: 0 }}
    transition={{ duration: 0.25, ease: 'easeInOut' }}
    className="mx-4 mb-1 relative overflow-hidden rounded-2xl"
  >
    {/* Dark premium background */}
    <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950" />

    {/* Subtle gold accent glow */}
    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5" />
    <div className="absolute top-0 left-1/3 w-32 h-16 bg-amber-400/8 blur-2xl rounded-full" />

    {/* Content */}
    <div className="relative z-10 px-4 py-4">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <motion.span
          className="text-lg"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          🏆
        </motion.span>
        <span className="font-bold text-amber-400 text-sm tracking-wide uppercase">
          Турнир месяца
        </span>
      </div>

      {/* Prizes row */}
      <div className="flex gap-2 mb-3">
        {[1, 2, 3].map((place) => {
          const prize = PRIZES[place];
          return (
            <motion.div
              key={place}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 + place * 0.1, type: 'spring', stiffness: 400 }}
              className={cn(
                'flex-1 flex flex-col items-center py-2.5 rounded-xl',
                'bg-white/5 border border-white/10',
                place === 1 && 'bg-amber-400/10 border-amber-400/25 shadow-lg shadow-amber-500/10',
              )}
            >
              <span className={cn("text-2xl mb-0.5", place === 1 && "text-3xl")}>
                {prize.emoji}
              </span>
              <span className={cn(
                "font-extrabold",
                place === 1 ? "text-xl text-amber-400" : "text-base text-white/90"
              )}>
                {prize.amount}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Subtitle */}
      <p className="text-center text-xs text-white/50 font-medium">
        Набирай опыт до конца месяца — топ-3 получат призы!
      </p>
    </div>
  </motion.div>
);

// ─── Бейдж приза на карточке ──────────────────────────────────────
const PrizeBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const prize = PRIZES[rank];
  if (!prize) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, delay: 0.3 }}
      className={cn(
        'absolute -top-2 -right-2 z-10 flex items-center gap-0.5',
        'px-2 py-0.5 rounded-full shadow-lg',
        'bg-gradient-to-r text-white font-bold text-xs',
        prize.color,
      )}
    >
      <span>{prize.emoji}</span>
      <span>{prize.amount}</span>
    </motion.div>
  );
};

// ─── Основной экран ───────────────────────────────────────────────
export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ store }) => {
  const { goBack } = store;
  const { theme, isDark } = useTheme();
  const { state: authState } = useAuth();

  useBackButton(() => goBack());

  // Фильтры
  // Дефолт — недельный XP: обнуляется каждую неделю, новичок может побороться
  // с первого дня (звёзды/за всё время у старожилов недосягаемы)
  const [type, setType] = useState<LeaderboardType>('xp');
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');

  // Данные
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Runtime-статус сети: без интернета показываем честное объяснение вместо пустой таблицы
  const [isOfflineNow, setIsOfflineNow] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false
  );

  // Профиль пользователя (bottom sheet)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Турнирный режим: XP + месяц
  const isPrizeMode = type === 'xp' && period === 'month';

  const fetchLeaderboard = useCallback(async (t: LeaderboardType, p: LeaderboardPeriod) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getLeaderboard({ type: t, period: p, limit: 50 });
      setData(response);
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message || 'Ошибка загрузки';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загружаем при смене типа или периода
  useEffect(() => {
    void fetchLeaderboard(type, period);
  }, [type, period, fetchLeaderboard]);

  // Сеть появилась/пропала — обновляем статус и перезагружаем таблицу
  useEffect(() => {
    const onOnline = () => {
      setIsOfflineNow(false);
      void fetchLeaderboard(type, period);
    };
    const onOffline = () => setIsOfflineNow(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [type, period, fetchLeaderboard]);

  const currentUserId = authState.user?._id;
  const HIDDEN_USERNAMES = new Set(['frntdev']);
  const isHiddenUser = (username?: string | null) => {
    if (!username) return false;
    return HIDDEN_USERNAMES.has(username.replace(/^@/, ''));
  };
  const entries = (data?.entries ?? []).filter(e => !isHiddenUser(e.telegramUsername));
  const currentUser = (() => {
    const u = data?.currentUser ?? null;
    if (u && isHiddenUser(u.telegramUsername)) return null;
    return u;
  })();

  // Подпись значения
  const getValueSuffix = () => {
    switch (type) {
      case 'stars': return '⭐';
      case 'xp': return 'XP';
      case 'streak': return 'дн.';
    }
  };

  // Ранг: эмодзи для топ-3, число для остальных
  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1: return { emoji: '🥇', color: 'text-amber-500' };
      case 2: return { emoji: '🥈', color: isDark ? 'text-slate-300' : 'text-slate-500' };
      case 3: return { emoji: '🥉', color: 'text-amber-600' };
      default: return null;
    }
  };

  const renderEntry = (entry: LeaderboardEntry, isCurrentUserCard = false) => {
    const isMe = currentUserId && entry.userId === currentUserId;
    const rank = entry.rank;
    const showPrizeBadge = isPrizeMode && rank <= 3;
    const rankDisplay = getRankDisplay(rank);

    return (
      <motion.div
        key={isCurrentUserCard ? `me-${entry.userId}` : `${entry.rank}-${entry.userId}`}
        initial={isCurrentUserCard ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={isCurrentUserCard ? undefined : { delay: Math.min(rank * 0.025, 0.4) }}
        onClick={() => setSelectedUserId(entry.userId)}
        className={cn(
          'relative rounded-2xl px-3 py-2.5 cursor-pointer transition-all active:scale-[0.98]',
          // Фон
          isDark ? 'bg-white/[0.06]' : 'bg-white/80',
          // Рамка
          isDark ? 'border border-white/[0.06]' : 'border border-stone-200/60',
          // Топ-3 — лёгкая подсветка
          rank === 1 && (isDark ? 'bg-amber-500/[0.08] border-amber-400/20' : 'bg-amber-50/80 border-amber-200/60'),
          rank === 2 && (isDark ? 'bg-slate-400/[0.06] border-slate-400/15' : 'bg-slate-50/80 border-slate-200/60'),
          rank === 3 && (isDark ? 'bg-amber-700/[0.06] border-amber-600/15' : 'bg-orange-50/60 border-orange-200/50'),
          // Свой пользователь
          isMe && !isCurrentUserCard && (isDark ? 'ring-1 ring-amber-400/30' : 'ring-1 ring-amber-400/40'),
          // Призовой режим — золотая тень на 1 месте
          showPrizeBadge && rank === 1 && 'shadow-lg shadow-amber-400/15',
        )}
      >
        {/* Призовой бейдж */}
        {showPrizeBadge && !isCurrentUserCard && <PrizeBadge rank={rank} />}

        <div className="flex items-center gap-3">
          {/* Rank number */}
          <div className="w-7 flex-shrink-0 text-center">
            {rankDisplay ? (
              <span className="text-lg leading-none">{rankDisplay.emoji}</span>
            ) : (
              <span className={cn(
                'text-sm font-bold tabular-nums',
                isDark ? 'text-white/30' : 'text-stone-400',
              )}>
                {rank}
              </span>
            )}
          </div>

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {entry.photoUrl ? (
              <img
                src={entry.photoUrl}
                alt=""
                className={cn(
                  'w-10 h-10 rounded-full object-cover',
                  rank === 1 && 'ring-2 ring-amber-400/50 ring-offset-1',
                  rank === 1 && (isDark ? 'ring-offset-slate-900' : 'ring-offset-amber-50'),
                )}
                loading="lazy"
              />
            ) : (
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                isDark ? 'bg-white/10 text-white/50' : 'bg-stone-100 text-stone-400',
              )}>
                {entry.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'font-semibold text-[15px] truncate leading-tight',
                theme.text.primary,
                isMe && 'text-amber-500',
              )}>
                {entry.name}
              </span>
              {isMe && (
                <span className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0',
                  isDark ? 'bg-amber-400/15 text-amber-400' : 'bg-amber-100 text-amber-600',
                )}>
                  вы
                </span>
              )}
            </div>
            <div className={cn('flex items-center gap-2 text-[11px] mt-0.5 leading-none', theme.text.muted)}>
              <span>Ур. {entry.level}</span>
              <span className={cn('w-0.5 h-0.5 rounded-full', isDark ? 'bg-white/20' : 'bg-stone-300')} />
              <span>⭐ {entry.totalStars}</span>
              {entry.currentStreak > 0 && (
                <>
                  <span className={cn('w-0.5 h-0.5 rounded-full', isDark ? 'bg-white/20' : 'bg-stone-300')} />
                  <span className="flex items-center gap-0.5">
                    <Flame size={9} className="text-orange-400" />
                    {entry.currentStreak}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Value */}
          <div className="text-right flex-shrink-0 pl-2">
            <div className={cn(
              'text-lg font-bold tabular-nums leading-tight',
              rank === 1 ? 'text-amber-500' : theme.text.accent,
            )}>
              {entry.value.toLocaleString()}
            </div>
            <div className={cn('text-[10px] leading-none mt-0.5', theme.text.dimmed)}>{getValueSuffix()}</div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Проверяем, есть ли текущий пользователь в видимом списке
  const isCurrentUserVisible = currentUser && entries.some(e => e.userId === currentUser.userId);

  return (
    <div className={cn(theme.backgrounds.primaryGradient, "min-h-[100dvh] flex flex-col relative overflow-hidden")}>
      {/* Sticky Header */}
      <StickyHeader
        title={isPrizeMode ? '🏆 Турнир месяца' : 'Рекорды'}
        onBack={() => goBack()}
        rightElement={<Trophy size={22} className={isDark ? "text-amber-400" : "text-amber-500"} />}
      />

      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-amber-500/10 via-steppe-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      {/* Hero-шапка */}
      <header className={cn(theme.header.bg, theme.header.text, "relative z-10 p-4 pb-4 overflow-hidden", !isDark && "rounded-b-3xl shadow-lg")}>
        <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2 relative z-10">
          <button onClick={() => goBack()} aria-label="Назад" className="p-2 -ml-2 rounded-xl active:bg-white/10">
            <ArrowLeft size={22} />
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">
            сообщество
          </span>
        </div>
        <div className="flex items-end justify-between gap-3 mt-1 mb-4 relative z-10">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight">
              {isPrizeMode ? 'Турнир месяца' : 'Рекорды'}
            </h1>
            <p className="text-xs opacity-70 mt-1">
              {isPrizeMode ? 'Топ-3 по опыту за месяц получают призы' : 'Лучшие игроки Буряад үгэнүүд'}
            </p>
          </div>
          <span className="text-3xl drop-shadow">{isPrizeMode ? '💰' : '🏆'}</span>
        </div>

        {/* Табы: тип рейтинга */}
        <div className="flex gap-2 mb-3">
          {TYPE_TABS.map((tab) => {
            const isActive = type === tab.id;
            const isXpTab = tab.id === 'xp';

            return (
              <button
                key={tab.id}
                onClick={() => setType(tab.id)}
                className={cn(
                  'relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white/90 text-stone-800 shadow-sm'
                    : 'bg-white/15 text-white/80 hover:bg-white/25'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>

                {/* Бейдж "💰" на табе Опыт — мерцает, привлекает внимание */}
                {isXpTab && !isActive && (
                  <motion.span
                    className="absolute -top-1.5 -right-0.5 text-xs"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    💰
                  </motion.span>
                )}
                {isXpTab && isActive && (
                  <span className="absolute -top-1.5 -right-0.5 text-xs">💰</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Табы: период */}
        <div className="flex gap-1.5">
          {PERIOD_TABS.map((tab) => {
            const isActive = period === tab.id;
            const isMonthTab = tab.id === 'month';
            // Когда выбран XP, таб "Месяц" подсвечивается золотым пульсом
            const isHighlighted = isMonthTab && type === 'xp' && !isActive;

            return (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all relative',
                  isActive
                    ? isPrizeMode
                      // Активный "Месяц" в призовом режиме — золотой
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 shadow-sm shadow-amber-400/30'
                      : 'bg-white/80 text-stone-800'
                    : isHighlighted
                      // Неактивный "Месяц" при XP — приглашающий пульс
                      ? 'bg-white/15 text-white/80 hover:bg-white/25'
                      : 'bg-white/15 text-white/70 hover:bg-white/25'
                )}
              >
                {/* Пульсирующая рамка-подсветка на "Месяц" когда XP активен */}
                {isHighlighted && (
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-amber-400/60"
                    animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  {isMonthTab && type === 'xp' && <span>🏆</span>}
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Кол-во участников */}
          {data && (
            <div className="ml-auto flex items-center text-xs text-white/50 px-2">
              {data.total} чел.
            </div>
          )}
        </div>
      </header>

      {/* Призовой баннер (XP + Месяц) */}
      <AnimatePresence>
        {isPrizeMode && !isLoading && <PrizeBanner />}
      </AnimatePresence>

      {/* Content */}
      <main className="flex-1 p-4 overflow-auto relative z-10 pb-24">
        {/* Loading: скелетоны с каскадным pulse */}
        {isLoading && (
          <div className="space-y-1.5 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-2xl px-3 py-2.5 flex items-center gap-3 animate-pulse',
                  isDark ? 'bg-white/[0.05]' : 'bg-white/70',
                )}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className={cn('w-7 h-4 rounded', isDark ? 'bg-white/10' : 'bg-stone-200')} />
                <div className={cn('w-10 h-10 rounded-full flex-shrink-0', isDark ? 'bg-white/10' : 'bg-stone-200')} />
                <div className="flex-1 space-y-1.5">
                  <div className={cn('h-3.5 rounded w-2/5', isDark ? 'bg-white/10' : 'bg-stone-200')} />
                  <div className={cn('h-2.5 rounded w-3/5', isDark ? 'bg-white/[0.07]' : 'bg-stone-100')} />
                </div>
                <div className={cn('w-12 h-5 rounded', isDark ? 'bg-white/10' : 'bg-stone-200')} />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", isDark ? "bg-red-500/20" : "bg-red-50")}>
              <AlertCircle size={32} className={isDark ? "text-red-400" : "text-red-500"} />
            </div>
            <h3 className={cn("text-lg font-semibold mb-1", theme.text.secondary)}>Ошибка</h3>
            <p className={cn("text-sm mb-4", theme.text.muted)}>{error}</p>
            <button
              onClick={() => fetchLeaderboard(type, period)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              )}
            >
              <RefreshCw size={16} />
              Повторить
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4", theme.backgrounds.card)}>
              <Trophy size={40} className={theme.text.muted} />
            </div>
            {isOfflineNow ? (
              <>
                <h3 className={cn("text-lg font-semibold mb-2", theme.text.secondary)}>
                  Нет подключения к интернету
                </h3>
                <p className={theme.text.muted}>
                  Лидерборд появится при подключении. Твой прогресс сохраняется и синхронизируется автоматически.
                </p>
              </>
            ) : (
              <>
                <h3 className={cn("text-lg font-semibold mb-2", theme.text.secondary)}>
                  {isPrizeMode ? 'Турнир только начался!' : 'Пока нет рекордов'}
                </h3>
                <p className={theme.text.muted}>
                  {isPrizeMode
                    ? 'Набирай XP первым и займи призовое место!'
                    : period !== 'all'
                      ? 'За этот период ещё никто не играл'
                      : 'Сыграй несколько игр, чтобы попасть в таблицу!'}
                </p>
              </>
            )}
          </motion.div>
        )}

        {/* Пьедестал топ-3 + остальной список */}
        {!isLoading && !error && entries.length >= 3 && (
          <>
            <div className="flex items-end justify-center gap-2 mb-5 pt-8">
              {[entries[1], entries[0], entries[2]].map((entry, i) => {
                const isWinner = i === 1; // центр — 1 место
                const place = isWinner ? 1 : i === 0 ? 2 : 3;
                const podiumH = isWinner ? 'h-20' : place === 2 ? 'h-14' : 'h-10';
                const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
                return (
                  <motion.button
                    key={entry.userId}
                    type="button"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    onClick={() => setSelectedUserId(entry.userId)}
                    className="flex-1 max-w-[110px] flex flex-col items-center"
                  >
                    <div className="relative mb-1.5">
                      {entry.photoUrl ? (
                        <img
                          src={entry.photoUrl}
                          alt=""
                          className={cn(
                            'rounded-full object-cover',
                            isWinner ? 'w-16 h-16 ring-2 ring-amber-400 ring-offset-2' : 'w-12 h-12',
                            isWinner && (isDark ? 'ring-offset-slate-900' : 'ring-offset-stone-50'),
                          )}
                        />
                      ) : (
                        <div className={cn(
                          'rounded-full flex items-center justify-center font-bold',
                          isWinner ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-base',
                          isDark ? 'bg-white/10 text-white/60' : 'bg-stone-200 text-stone-500',
                        )}>
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={cn('absolute -bottom-1.5 left-1/2 -translate-x-1/2 drop-shadow', isWinner ? 'text-xl' : 'text-base')}>
                        {medal}
                      </span>
                    </div>
                    <span className={cn('text-xs font-semibold truncate w-full text-center mt-1', theme.text.primary)}>
                      {entry.name}
                    </span>
                    <span className={cn('text-[11px] font-bold tabular-nums', place === 1 ? 'text-amber-500' : theme.text.muted)}>
                      {entry.value.toLocaleString()}
                    </span>
                    <div className={cn(
                      'w-full mt-1.5 rounded-t-xl bg-gradient-to-b',
                      podiumH,
                      place === 1
                        ? 'from-amber-400/80 to-amber-500/30'
                        : place === 2
                          ? (isDark ? 'from-slate-400/50 to-slate-500/15' : 'from-slate-300/80 to-slate-300/25')
                          : 'from-amber-700/50 to-amber-800/15',
                    )} />
                  </motion.button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {entries.slice(3).map((entry) => renderEntry(entry))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Меньше трёх участников — обычный список */}
        {!isLoading && !error && entries.length > 0 && entries.length < 3 && (
          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {entries.map((entry) => renderEntry(entry))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Sticky footer: текущий пользователь (если не виден в списке) */}
      <AnimatePresence>
        {!isLoading && currentUser && !isCurrentUserVisible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-30 p-3 pt-2 pb-6",
              "backdrop-blur-xl border-t",
              isDark
                ? "bg-slate-900/90 border-slate-700/50"
                : "bg-white/90 border-stone-200/50"
            )}
          >
            <div className={cn("text-xs font-medium mb-1.5 px-1", theme.text.muted)}>
              Ваша позиция
              {isPrizeMode && currentUser.rank <= 3 && (
                <span className="ml-1.5 text-amber-500 font-bold">— вы в призовой зоне! 🎉</span>
              )}
              {isPrizeMode && currentUser.rank > 3 && (
                <span className="ml-1.5 text-amber-500/70">— до топ-3 осталось чуть-чуть!</span>
              )}
            </div>
            {renderEntry(currentUser, true)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile Bottom Sheet */}
      <UserProfileSheet
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
};

export default LeaderboardScreen;

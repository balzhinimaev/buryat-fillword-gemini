// src/components/UserProfileSheet.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import {
  X, Loader2, AlertCircle, Star, Zap, Flame, BookOpen,
  CheckCircle2, Calendar, TrendingUp, Clock,
} from 'lucide-react';
import { cn } from './ui';
import { useTheme } from '../theme/ThemeContext';
import { api, type UserProfileResponse, type UserProfileXpHistoryItem } from '../services/api';

interface UserProfileSheetProps {
  userId: string | null;
  onClose: () => void;
}

// XP type labels
const XP_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  campaign_level_complete: { label: 'Прохождение уровней', emoji: '🎮' },
  level_mode_complete: { label: 'Уровневый режим', emoji: '🏅' },
  campaign_star_record: { label: 'Рекорд звёзд', emoji: '⭐' },
  campaign_time_record: { label: 'Рекорд времени', emoji: '⏱️' },
  word_added: { label: 'Добавление слов', emoji: '📝' },
  word_verified: { label: 'Проверка слов', emoji: '✅' },
  word_approved: { label: 'Одобренные слова', emoji: '🏅' },
  daily_login: { label: 'Ежедневный вход', emoji: '📅' },
  daily_word_complete: { label: 'Филлворд дня', emoji: '☀️' },
  streak_bonus: { label: 'Бонус за серию', emoji: '🔥' },
  textbook_theory: { label: 'Теория учебника', emoji: '📖' },
  textbook_quiz: { label: 'Квизы учебника', emoji: '🎯' },
  textbook_exam: { label: 'Экзамен курса', emoji: '🎓' },
  audio_approved: { label: 'Одобренные озвучки', emoji: '🎙️' },
  report_confirmed: { label: 'Полезные жалобы', emoji: '🚩' },
  referral_inviter: { label: 'Приглашённые друзья', emoji: '🤝' },
  referral_invitee: { label: 'Бонус за приглашение', emoji: '🎁' },
  achievement_unlocked: { label: 'Достижения', emoji: '🏆' },
  admin_adjustment: { label: 'Корректировка', emoji: '⚙️' },
};

// Format date relative
function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Format registration date
function formatRegDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const UserProfileSheet: React.FC<UserProfileSheetProps> = ({ userId, onClose }) => {
  const { theme, isDark } = useTheme();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isOpen = userId !== null;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setProfile(null);

    api.getUserProfile(userId)
      .then(setProfile)
      .catch((e) => {
        const msg = e instanceof Error ? e.message : (e as { message?: string })?.message || 'Не удалось загрузить профиль';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  // Swipe-to-dismiss logic
  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    // If swiped down > 100px or fast velocity, close
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  }, [onClose]);

  // Check if content is scrolled to top (allow drag only when at top)
  const [canDrag, setCanDrag] = useState(true);
  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      setCanDrag(contentRef.current.scrollTop <= 0);
    }
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag={canDrag ? 'y' : false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl flex flex-col',
              'max-h-[92dvh]',
              isDark ? 'bg-slate-900' : 'bg-stone-100',
            )}
            style={{ touchAction: canDrag ? 'none' : 'pan-y' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className={cn(
                'w-10 h-1 rounded-full',
                isDark ? 'bg-white/20' : 'bg-stone-400/40',
              )} />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className={cn(
                'absolute top-3 right-3 p-2 rounded-full z-10 transition-colors',
                isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-stone-200 text-stone-500',
              )}
            >
              <X size={20} />
            </button>

            {/* Content area */}
            <div
              ref={contentRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8"
            >
              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 size={32} className={cn('animate-spin mb-3', theme.text.muted)} />
                  <p className={theme.text.muted}>Загрузка профиля...</p>
                </div>
              )}

              {/* Error */}
              {!isLoading && error && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className={cn('w-14 h-14 rounded-full flex items-center justify-center mb-3',
                    isDark ? 'bg-red-500/20' : 'bg-red-50')}>
                    <AlertCircle size={28} className={isDark ? 'text-red-400' : 'text-red-500'} />
                  </div>
                  <p className={cn('text-sm', theme.text.muted)}>{error}</p>
                </div>
              )}

              {/* Profile content */}
              {!isLoading && !error && profile && (
                <ProfileContent profile={profile} theme={theme} isDark={isDark} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Profile content ─────────────────────────────────────────────
interface ProfileContentProps {
  profile: UserProfileResponse;
  theme: ReturnType<typeof useTheme>['theme'];
  isDark: boolean;
}

export const ProfileContent: React.FC<ProfileContentProps> = ({ profile, theme, isDark }) => {
  const { user, xp, streak, campaign, dictionary, xpByType, recentXpHistory } = profile;

  return (
    <div className="space-y-5 pb-4">
      {/* ─── Header: Avatar + Name + Level ─── */}
      <div className="flex items-center gap-4 pt-1">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-offset-2 ring-amber-400"
              style={{ ringOffsetColor: isDark ? '#0f172a' : '#f5f5f4' } as React.CSSProperties}
            />
          ) : (
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold',
              isDark ? 'bg-slate-700 text-white/70' : 'bg-stone-200 text-stone-500',
            )}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Level badge */}
          <div className={cn(
            'absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center',
            'text-xs font-bold text-white shadow-md bg-gradient-to-br',
            getLevelColor(xp.level),
          )}>
            {xp.level}
          </div>
        </div>

        {/* Name + info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={cn('text-lg font-bold truncate', theme.text.primary)}>
              {user.name}
            </h2>
            {user.isLanguageKeeper && (
              <span title="Хранитель языка" className="text-base flex-shrink-0">🛡️</span>
            )}
          </div>
          {user.telegramUsername && (
            <p className={cn('text-sm truncate', theme.text.muted)}>@{user.telegramUsername}</p>
          )}
          <p className={cn('text-xs mt-0.5', theme.text.dimmed)}>
            <Calendar size={10} className="inline mr-1" />
            с {formatRegDate(user.registeredAt)}
          </p>
        </div>
      </div>

      {/* ─── XP Progress Bar ─── */}
      <div className={cn('rounded-2xl p-4', isDark ? 'bg-slate-800/80' : 'bg-white border border-stone-200/80 shadow-sm')}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap size={16} className="text-amber-500" />
            <span className={cn('text-sm font-semibold', theme.text.primary)}>
              {xp.totalXp.toLocaleString()} XP
            </span>
          </div>
          <span className={cn('text-xs font-medium', theme.text.muted)}>
            Уровень {xp.level}
          </span>
        </div>
        <div className={cn('h-2.5 rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-stone-200/80')}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(xp.progressPercent, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn('h-full rounded-full bg-gradient-to-r', getLevelColor(xp.level))}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className={cn('text-xs', theme.text.dimmed)}>
            {xp.xpInCurrentLevel} / {xp.xpToNextLevel}
          </span>
          <span className={cn('text-xs', theme.text.dimmed)}>
            {xp.progressPercent.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-3 gap-2">
        {/* Stars */}
        <StatBox
          icon={<Star size={18} className="text-amber-500 fill-amber-500" />}
          value={campaign.totalStars}
          label="Звёзд"
          isDark={isDark}
          theme={theme}
        />
        {/* Streak */}
        <StatBox
          icon={<Flame size={18} className={streak.isStreakActive ? 'text-orange-500' : 'text-gray-400'} />}
          value={streak.currentStreak}
          label="Серия дней"
          sublabel={`рекорд: ${streak.longestStreak}`}
          isDark={isDark}
          theme={theme}
        />
        {/* Levels */}
        <StatBox
          icon={<CheckCircle2 size={18} className="text-emerald-500" />}
          value={campaign.levelsCompleted}
          label="Уровней"
          sublabel={`из ${campaign.levelsPlayed} сыгр.`}
          isDark={isDark}
          theme={theme}
        />
      </div>

      {/* ─── Dictionary contribution ─── */}
      {(dictionary.wordsAdded > 0 || dictionary.wordsVerified > 0 || dictionary.wordsApproved > 0) && (
        <div className={cn('rounded-2xl p-4', isDark ? 'bg-slate-800/80' : 'bg-white border border-stone-200/80 shadow-sm')}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className={isDark ? 'text-blue-400' : 'text-blue-500'} />
            <span className={cn('text-sm font-semibold', theme.text.primary)}>Вклад в словарь</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className={cn('text-lg font-bold', theme.text.accent)}>{dictionary.wordsAdded}</div>
              <div className={cn('text-xs', theme.text.dimmed)}>добавлено</div>
            </div>
            <div>
              <div className={cn('text-lg font-bold', theme.text.accent)}>{dictionary.wordsVerified}</div>
              <div className={cn('text-xs', theme.text.dimmed)}>проверено</div>
            </div>
            <div>
              <div className={cn('text-lg font-bold', theme.text.accent)}>{dictionary.wordsApproved}</div>
              <div className={cn('text-xs', theme.text.dimmed)}>одобрено</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── XP Breakdown ─── */}
      {xpByType.length > 0 && (
        <div className={cn('rounded-2xl p-4', isDark ? 'bg-slate-800/80' : 'bg-white border border-stone-200/80 shadow-sm')}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className={isDark ? 'text-purple-400' : 'text-purple-500'} />
            <span className={cn('text-sm font-semibold', theme.text.primary)}>Откуда XP</span>
          </div>
          <div className="space-y-2">
            {xpByType.slice(0, 6).map((item) => {
              const info = XP_TYPE_LABELS[item.type] || { label: item.type, emoji: '✨' };
              const maxAmount = xpByType[0]?.totalAmount || 1;
              const widthPercent = Math.max((item.totalAmount / maxAmount) * 100, 4);

              return (
                <div key={item.type}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn('text-xs flex items-center gap-1', theme.text.secondary)}>
                      <span>{info.emoji}</span>
                      {info.label}
                    </span>
                    <span className={cn('text-xs font-semibold', theme.text.accent)}>
                      +{item.totalAmount} XP
                    </span>
                  </div>
                  <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-stone-200')}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPercent}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-purple-400 to-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Recent XP History ─── */}
      {recentXpHistory.length > 0 && (
        <div className={cn('rounded-2xl p-4', isDark ? 'bg-slate-800/80' : 'bg-white border border-stone-200/80 shadow-sm')}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className={isDark ? 'text-cyan-400' : 'text-cyan-500'} />
            <span className={cn('text-sm font-semibold', theme.text.primary)}>Последняя активность</span>
          </div>
          <div className="space-y-1">
            {recentXpHistory.slice(0, 10).map((item) => (
              <HistoryItem key={item.id} item={item} isDark={isDark} theme={theme} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── History item with rich metadata ─────────────────────────────
interface HistoryItemProps {
  item: UserProfileXpHistoryItem;
  isDark: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
}

// Stars display as text
function starsText(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 3 - count));
}

// Format seconds nicely
function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}с`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}м ${secs}с` : `${mins}м`;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ item, isDark, theme }) => {
  const info = XP_TYPE_LABELS[item.type] || { label: item.type, emoji: '✨' };
  const isPositive = item.amount > 0;
  const meta = item.metadata;

  // Line 1: title, Line 2: detail chips + date
  let title = '';
  const chips: React.ReactNode[] = [];

  if (item.type === 'campaign_level_complete' && meta) {
    const levelName = meta.levelName as string | undefined;
    const stars = meta.stars as number | undefined;
    const timeSeconds = meta.timeSeconds as number | undefined;
    const isFirst = meta.isFirstComplete as boolean | undefined;

    title = levelName ? `${levelName}` : info.label;
    if (stars != null) chips.push(<span key="s" className="text-amber-500">{starsText(stars)}</span>);
    if (timeSeconds != null) chips.push(<span key="t">{formatTime(timeSeconds)}</span>);
    if (isFirst) chips.push(
      <span key="f" className={cn(
        'px-1 py-px rounded font-medium',
        isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
      )}>
        первое
      </span>
    );
  } else if (item.type === 'level_mode_complete' && meta) {
    const levelNumber = meta.levelNumber as number | undefined;
    const stars = meta.stars as number | undefined;
    const timeSeconds = meta.timeSeconds as number | undefined;
    const isFirst = meta.isFirstComplete as boolean | undefined;

    title = levelNumber != null ? `Уровень ${levelNumber}` : info.label;
    if (stars != null) chips.push(<span key="s" className="text-amber-500">{starsText(stars)}</span>);
    if (timeSeconds != null) chips.push(<span key="t">{formatTime(timeSeconds)}</span>);
    if (isFirst) chips.push(
      <span key="f" className={cn(
        'px-1 py-px rounded font-medium',
        isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
      )}>
        первое
      </span>
    );
  } else if ((item.type === 'word_added' || item.type === 'word_approved' || item.type === 'word_verified') && meta) {
    const word = meta.word as string | undefined;
    title = info.label;
    if (word) chips.push(
      <span key="w" className={cn(
        'font-medium px-1 py-px rounded',
        isDark ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-600',
      )}>
        {word}
      </span>
    );
  } else if (item.type === 'streak_bonus' && meta) {
    const days = meta.streakDays as number | undefined;
    title = info.label;
    if (days) chips.push(<span key="d">{days} дн.</span>);
  } else {
    title = item.description || info.label;
  }

  return (
    <div className={cn(
      'flex items-center gap-2.5 py-2 border-b last:border-b-0',
      isDark ? 'border-slate-700/40' : 'border-stone-100',
    )}>
      <span className="text-sm flex-shrink-0">{info.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs leading-tight truncate', theme.text.secondary)}>{title}</p>
        <div className={cn('flex items-center gap-1.5 text-[10px] mt-0.5 leading-none', theme.text.dimmed)}>
          {chips.map((chip, i) => (
            <React.Fragment key={i}>
              {chip}
              <span className={cn('w-0.5 h-0.5 rounded-full flex-shrink-0', isDark ? 'bg-white/15' : 'bg-stone-300')} />
            </React.Fragment>
          ))}
          <span>{formatRelativeDate(item.createdAt)}</span>
        </div>
      </div>
      <span className={cn(
        'text-xs font-bold flex-shrink-0',
        isPositive ? 'text-emerald-500' : 'text-red-400',
      )}>
        {isPositive ? '+' : ''}{item.amount}
      </span>
    </div>
  );
};

// ─── Stat box mini-card ──────────────────────────────────────────
interface StatBoxProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  sublabel?: string;
  isDark: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
}

const StatBox: React.FC<StatBoxProps> = ({ icon, value, label, sublabel, isDark, theme }) => (
  <div className={cn(
    'rounded-xl p-3 text-center',
    isDark ? 'bg-slate-800/80' : 'bg-white border border-stone-200/80 shadow-sm',
  )}>
    <div className="flex justify-center mb-1">{icon}</div>
    <div className={cn('text-xl font-bold', theme.text.accent)}>{value}</div>
    <div className={cn('text-xs', theme.text.muted)}>{label}</div>
    {sublabel && <div className={cn('text-[10px]', theme.text.dimmed)}>{sublabel}</div>}
  </div>
);

// Level color helper (used in ProfileContent)
function getLevelColor(level: number) {
  if (level >= 50) return 'from-amber-400 to-yellow-500';
  if (level >= 25) return 'from-purple-400 to-indigo-500';
  if (level >= 10) return 'from-blue-400 to-cyan-500';
  return 'from-emerald-400 to-teal-500';
}

export default UserProfileSheet;

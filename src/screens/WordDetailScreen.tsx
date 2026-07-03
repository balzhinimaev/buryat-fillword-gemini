// src/screens/WordDetailScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, RefreshCw, Eye, Search as SearchIcon, ThumbsUp, ThumbsDown,
  MessageSquare, BookOpen, Volume2, Link2, User, ChevronRight,
  Globe, Sparkles, Hash, Clock, CheckCircle2, AlertTriangle, Archive,
  Send, Pencil, Trash2, X, Check,
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';
import type { GameStore } from '../store/gameStore';
import {
  getWordDetail, voteWord, addComment, editComment, deleteComment,
  type ApiWordDetailResponse,
} from '../services/api';

interface WordDetailScreenProps {
  store: GameStore;
}

/* ==============================
   Утилиты
   ============================== */

/** Относительное время: «только что», «5 мин назад», «2 дня назад» */
const relativeTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'только что';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} дн назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед назад`;
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateFull = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/* ==============================
   Статус-конфигурация
   ============================== */
const statusCfg: Record<string, {
  label: string;
  icon: React.ReactNode;
  light: string;
  dark: string;
}> = {
  verified: {
    label: 'Проверено',
    icon: <CheckCircle2 size={12} />,
    light: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dark: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  },
  pending: {
    label: 'На проверке',
    icon: <Clock size={12} />,
    light: 'bg-amber-100 text-amber-700 border-amber-200',
    dark: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  },
  rejected: {
    label: 'Отклонено',
    icon: <AlertTriangle size={12} />,
    light: 'bg-red-100 text-red-700 border-red-200',
    dark: 'bg-red-500/15 text-red-400 border-red-500/20',
  },
  archived: {
    label: 'В архиве',
    icon: <Archive size={12} />,
    light: 'bg-stone-100 text-stone-600 border-stone-200',
    dark: 'bg-stone-500/15 text-stone-400 border-stone-500/20',
  },
};

/* ==============================
   Difficulty dots
   ============================== */
const DifficultyDots: React.FC<{ value: number; isDark: boolean }> = ({ value, isDark }) => {
  const filled = Math.min(10, Math.max(0, value));
  const color = filled <= 3 ? 'bg-emerald-400' : filled <= 6 ? 'bg-amber-400' : 'bg-red-400';
  const emptyColor = isDark ? 'bg-white/10' : 'bg-stone-200';
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={cn('w-1.5 h-1.5 rounded-full transition-colors', i < filled ? color : emptyColor)} />
      ))}
    </div>
  );
};

/* ==============================
   Переиспользуемые UI-компоненты
   (вынесены за пределы render-тела,
    чтобы React не перемонтировал дерево
    при каждом изменении стейта)
   ============================== */

// eslint-disable-next-line react/display-name
const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
  isDark: boolean;
}> = React.memo(({ children, className, delay = 0, isDark }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className={cn(
      'rounded-2xl overflow-hidden',
      isDark
        ? 'bg-white/[0.05] border border-white/[0.07]'
        : 'bg-white/90 border border-stone-200/50 shadow-sm',
      className,
    )}
  >
    {children}
  </motion.div>
));
Card.displayName = 'Card';

const Pill: React.FC<{
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
  isDark: boolean;
}> = React.memo(({ children, accent, className, isDark }) => (
  <span className={cn(
    'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border',
    accent
      ? (isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/15' : 'bg-amber-50 text-amber-700 border-amber-200/60')
      : (isDark ? 'bg-white/[0.06] text-white/50 border-white/[0.06]' : 'bg-stone-50 text-stone-500 border-stone-200/50'),
    className,
  )}>
    {children}
  </span>
));
Pill.displayName = 'Pill';

interface ThemeText {
  primary: string;
  secondary: string;
  muted: string;
  dimmed: string;
}

const InfoRow: React.FC<{
  label: string;
  value: React.ReactNode;
  themeText: ThemeText;
}> = React.memo(({ label, value, themeText }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className={cn('text-[12px]', themeText.muted)}>{label}</span>
    <span className={cn('text-[12px] font-medium text-right max-w-[60%]', themeText.primary)}>{value}</span>
  </div>
));
InfoRow.displayName = 'InfoRow';

/* ==============================
   Компонент
   ============================== */

export const WordDetailScreen: React.FC<WordDetailScreenProps> = ({ store }) => {
  const { state, goBack, navigateToWord } = store;
  const { isDark, theme } = useTheme();
  const { state: authState } = useAuth();
  const wordId = state.selectedWordId;
  const currentUserId = authState.user?._id ?? null;
  const isAuthenticated = authState.isAuthenticated;

  useBackButton(() => goBack());

  // Основные данные
  const [data, setData] = useState<ApiWordDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Голосование
  const [voteLoading, setVoteLoading] = useState<'upvote' | 'downvote' | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!wordId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getWordDetail(wordId);
      setData(result);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message : 'Ошибка загрузки';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [wordId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Текущий голос пользователя
  const userVote = useMemo(() => {
    if (!data?.word || !currentUserId) return null;
    if (data.word.upvotes.includes(currentUserId)) return 'upvote' as const;
    if (data.word.downvotes.includes(currentUserId)) return 'downvote' as const;
    return null;
  }, [data, currentUserId]);

  // Голосовать
  const handleVote = useCallback(async (type: 'upvote' | 'downvote') => {
    if (!wordId || voteLoading || !isAuthenticated) return;
    setVoteLoading(type);
    try {
      await voteWord({ wordId, type });
      const result = await getWordDetail(wordId);
      setData(result);
    } catch (err) {
      console.error('Vote error:', err);
    } finally {
      setVoteLoading(null);
    }
  }, [wordId, voteLoading, isAuthenticated]);

  /* ==============================
     Комментарии — CRUD
     ============================== */
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Клиентская пагинация комментариев
  const COMMENTS_PER_PAGE = 5;
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(COMMENTS_PER_PAGE);

  const allComments = data?.word?.comments ?? [];
  const visibleComments = useMemo(
    () => allComments.slice(0, visibleCommentsCount),
    [allComments, visibleCommentsCount],
  );
  const hasMoreComments = allComments.length > visibleCommentsCount;
  const hiddenCount = allComments.length - visibleCommentsCount;

  const showMoreComments = useCallback(() => {
    setVisibleCommentsCount((prev) => prev + COMMENTS_PER_PAGE);
  }, []);

  const collapseComments = useCallback(() => {
    setVisibleCommentsCount(COMMENTS_PER_PAGE);
  }, []);

  const userRole = authState.user?.role ?? 'user';
  const canModerate = userRole === 'moderator' || userRole === 'admin';

  // Добавить комментарий
  const handleAddComment = useCallback(async () => {
    if (!wordId || !commentText.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      await addComment(wordId, commentText.trim());
      // Перезагружаем полные данные (API возвращает только объект слова, не обёртку)
      const result = await getWordDetail(wordId);
      setData(result);
      setCommentText('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message : 'Ошибка при отправке комментария';
      setCommentError(msg);
    } finally {
      setCommentSubmitting(false);
    }
  }, [wordId, commentText, commentSubmitting]);

  // Начать редактирование
  const startEditing = useCallback((commentId: string, text: string) => {
    setEditingCommentId(commentId);
    setEditingText(text);
    setCommentError(null);
  }, []);

  // Отмена редактирования
  const cancelEditing = useCallback(() => {
    setEditingCommentId(null);
    setEditingText('');
  }, []);

  // Сохранить редактирование
  const handleEditComment = useCallback(async () => {
    if (!wordId || !editingCommentId || !editingText.trim() || editSubmitting) return;
    setEditSubmitting(true);
    setCommentError(null);
    try {
      await editComment(wordId, editingCommentId, editingText.trim());
      // Перезагружаем полные данные
      const result = await getWordDetail(wordId);
      setData(result);
      setEditingCommentId(null);
      setEditingText('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message : 'Ошибка при редактировании';
      setCommentError(msg);
    } finally {
      setEditSubmitting(false);
    }
  }, [wordId, editingCommentId, editingText, editSubmitting]);

  // Удалить комментарий
  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!wordId || deletingCommentId) return;
    setDeletingCommentId(commentId);
    setCommentError(null);
    try {
      await deleteComment(wordId, commentId);
      // Перезагружаем данные
      const result = await getWordDetail(wordId);
      setData(result);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message : 'Ошибка при удалении';
      setCommentError(msg);
    } finally {
      setDeletingCommentId(null);
    }
  }, [wordId, deletingCommentId]);

  /* ==============================
     Пустой wordId
     ============================== */
  if (!wordId) {
    return (
      <div className={cn(theme.backgrounds.primaryGradient, 'min-h-[100dvh] flex items-center justify-center')}>
        <p className={theme.text.muted}>Слово не выбрано</p>
      </div>
    );
  }

  const word = data?.word;
  const status = word ? statusCfg[word.status] ?? statusCfg.pending : null;
  const isLearned = word ? state.stats.learnedWords.includes(word.bur) : false;

  /* ==============================
     Рендер
     ============================== */
  return (
    <div className={cn(theme.backgrounds.primaryGradient, 'min-h-[100dvh] flex flex-col relative overflow-x-hidden')}>
      <StickyHeader
        title={word ? capitalize(word.bur) : 'Слово'}
        onBack={() => goBack()}
      />

      {/* Декор */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-gradient-to-b from-steppe-500/8 via-terra-500/4 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-20 w-48 h-48 bg-terra-500/5 rounded-full blur-3xl" />
      </div>

      {/* Хедер */}
      <header className={cn(theme.header.bg, theme.header.text, 'relative z-10 p-4 pb-6 rounded-b-3xl shadow-lg')}>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => goBack()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={22} />
          </motion.button>

          {word ? (
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate leading-tight">{capitalize(word.bur)}</h1>
              <p className="text-sm text-white/60 truncate mt-0.5">{word.ru}</p>
            </div>
          ) : (
            <h1 className="text-xl font-bold flex-1">Загрузка…</h1>
          )}

          {/* Статус-бейдж в хедере */}
          {word && status && (
            <span className={cn(
              'flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0',
              isDark ? status.dark : status.light,
            )}>
              {status.icon}
              {status.label}
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 overflow-auto relative z-10 pb-28 space-y-3">

        {/* ── Loading ── */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-64">
            <Loader2 size={36} className={cn('animate-spin mb-3', theme.text.muted)} />
            <p className={cn('text-sm', theme.text.muted)}>Загрузка слова…</p>
          </motion.div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mb-4', theme.backgrounds.card)}>
              <BookOpen size={32} className={theme.text.muted} />
            </div>
            <h3 className={cn('text-base font-semibold mb-1', theme.text.secondary)}>Ошибка загрузки</h3>
            <p className={cn('mb-4 text-sm', theme.text.muted)}>{error}</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={fetchDetail}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors',
                isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-stone-100 text-stone-700 hover:bg-stone-200',
              )}
            >
              <RefreshCw size={15} />
              Попробовать снова
            </motion.button>
          </motion.div>
        )}

        {/* ── Данные ── */}
        {!loading && !error && word && data && (
          <>
            {/* ═══════════════════════════════
               1. HERO-КАРТОЧКА СЛОВА
               ═══════════════════════════════ */}
            <Card isDark={isDark} delay={0}>
              <div className="px-5 pt-5 pb-4">
                {/* Слово */}
                <div className="text-center mb-3">
                  <h2 className={cn('text-3xl font-extrabold tracking-tight', theme.text.primary)}>
                    {capitalize(word.bur)}
                  </h2>
                  <p className={cn('text-base mt-1', theme.text.secondary)}>{word.ru}</p>
                  {word.translations?.en && (
                    <p className={cn('text-sm mt-0.5', theme.text.muted)}>
                      English: {word.translations.en}
                    </p>
                  )}

                  {/* Произношение */}
                  {word.pronunciation && (
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <Volume2 size={13} className={isDark ? 'text-steppe-400' : 'text-steppe-600'} />
                      <span className={cn('text-sm italic', theme.text.muted)}>[{word.pronunciation}]</span>
                    </div>
                  )}
                </div>

                {/* Мета-пилы */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
                  {word.partOfSpeechId && (
                    <Pill isDark={isDark}>
                      <span>{word.partOfSpeechId.emoji}</span>
                      {word.partOfSpeechId.name}
                    </Pill>
                  )}
                  {word.dialectId && <Pill isDark={isDark}>{word.dialectId.name}</Pill>}
                  {word.categoryId && <Pill isDark={isDark}>{word.categoryId.name}</Pill>}
                  {isLearned && (
                    <Pill isDark={isDark} className={isDark ? '!bg-emerald-500/10 !text-emerald-400 !border-emerald-500/20' : '!bg-emerald-50 !text-emerald-700 !border-emerald-200/60'}>
                      <CheckCircle2 size={10} /> Выучено
                    </Pill>
                  )}
                </div>

                {/* Теги */}
                {word.tags.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
                    {word.tags.map(tag => (
                      <Pill key={tag} isDark={isDark} accent><Hash size={10} />{tag}</Pill>
                    ))}
                  </div>
                )}

                {/* Сложность */}
                {word.difficulty > 0 && (
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className={cn('text-[10px] uppercase tracking-wider font-semibold', theme.text.dimmed)}>Сложность</span>
                    <DifficultyDots value={word.difficulty} isDark={isDark} />
                  </div>
                )}
              </div>

              {/* ── Статистика ── */}
              <div className={cn(
                'grid grid-cols-4 divide-x',
                isDark ? 'bg-white/[0.03] divide-white/[0.06] border-t border-white/[0.06]' : 'bg-stone-50/60 divide-stone-200/40 border-t border-stone-200/40',
              )}>
                {[
                  { icon: <Eye size={13} />, value: word.viewCount, label: 'Просм.' },
                  { icon: <SearchIcon size={13} />, value: word.lookupCount, label: 'Поиск' },
                  { icon: <ThumbsUp size={13} />, value: data.votesUp, label: 'За' },
                  { icon: <MessageSquare size={13} />, value: data.commentsCount, label: 'Коммент.' },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center py-3 gap-0.5">
                    <span className={theme.text.dimmed}>{stat.icon}</span>
                    <span className={cn('text-sm font-bold tabular-nums', theme.text.primary)}>{stat.value}</span>
                    <span className={cn('text-[9px] uppercase tracking-wider', theme.text.dimmed)}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ═══════════════════════════════
               2. ГОЛОСОВАНИЕ
               ═══════════════════════════════ */}
            <Card isDark={isDark} delay={0.05}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('text-[11px] font-semibold uppercase tracking-wider', theme.text.dimmed)}>
                    Оценка перевода
                  </span>
                  {!isAuthenticated && (
                    <span className={cn('text-[10px] ml-auto', theme.text.dimmed)}>Войдите для голосования</span>
                  )}
                </div>

                <div className="flex items-stretch gap-2">
                  {/* Upvote */}
                  <motion.button
                    whileTap={isAuthenticated ? { scale: 0.95 } : {}}
                    onClick={() => handleVote('upvote')}
                    disabled={!isAuthenticated || !!voteLoading}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all border',
                      userVote === 'upvote'
                        ? (isDark
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/5 shadow-lg'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-emerald-100 shadow-md')
                        : (isDark
                            ? 'bg-white/[0.04] text-white/50 border-white/[0.06] hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                            : 'bg-stone-50 text-stone-500 border-stone-200/50 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'),
                      !isAuthenticated && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    {voteLoading === 'upvote' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ThumbsUp size={16} className={userVote === 'upvote' ? 'fill-current' : ''} />
                    )}
                    <span className="tabular-nums">{data.votesUp}</span>
                  </motion.button>

                  {/* Downvote */}
                  <motion.button
                    whileTap={isAuthenticated ? { scale: 0.95 } : {}}
                    onClick={() => handleVote('downvote')}
                    disabled={!isAuthenticated || !!voteLoading}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all border',
                      userVote === 'downvote'
                        ? (isDark
                            ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-red-500/5 shadow-lg'
                            : 'bg-red-50 text-red-700 border-red-300 shadow-red-100 shadow-md')
                        : (isDark
                            ? 'bg-white/[0.04] text-white/50 border-white/[0.06] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                            : 'bg-stone-50 text-stone-500 border-stone-200/50 hover:bg-red-50 hover:text-red-600 hover:border-red-200'),
                      !isAuthenticated && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    {voteLoading === 'downvote' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ThumbsDown size={16} className={userVote === 'downvote' ? 'fill-current' : ''} />
                    )}
                    <span className="tabular-nums">{data.votesDown}</span>
                  </motion.button>
                </div>

                {/* Рейтинг верификации */}
                <div className={cn(
                  'flex items-center justify-between mt-3 pt-3 border-t',
                  isDark ? 'border-white/[0.06]' : 'border-stone-100',
                )}>
                  <span className={cn('text-[11px]', theme.text.dimmed)}>Рейтинг верификации</span>
                  <span className={cn(
                    'text-[12px] font-bold tabular-nums',
                    word.verificationScore > 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') :
                    word.verificationScore < 0 ? (isDark ? 'text-red-400' : 'text-red-600') :
                    theme.text.muted,
                  )}>
                    {word.verificationScore > 0 ? '+' : ''}{word.verificationScore}
                  </span>
                </div>
              </div>
            </Card>

            {/* ═══════════════════════════════
               3. ПРИМЕР ИСПОЛЬЗОВАНИЯ
               ═══════════════════════════════ */}
            {(word.exampleBur || word.exampleRu) && (
              <Card isDark={isDark} delay={0.1}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <BookOpen size={14} className={isDark ? 'text-steppe-400' : 'text-steppe-600'} />
                    <span className={cn('text-[11px] font-semibold uppercase tracking-wider', theme.text.dimmed)}>
                      Пример использования
                    </span>
                  </div>
                  <div className={cn(
                    'rounded-xl px-3.5 py-3 border-l-[3px]',
                    isDark ? 'bg-white/[0.03] border-l-steppe-500/40' : 'bg-stone-50/60 border-l-steppe-400',
                  )}>
                    {word.exampleBur && (
                      <p className={cn('text-[13px] leading-relaxed font-medium', theme.text.primary)}>
                        «{word.exampleBur}»
                      </p>
                    )}
                    {word.exampleRu && (
                      <p className={cn('text-[12px] leading-relaxed mt-1 italic', theme.text.muted)}>
                        {word.exampleRu}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* ═══════════════════════════════
               4. ДРУГИЕ ПЕРЕВОДЫ
               ═══════════════════════════════ */}
            {data.otherTranslations.length > 0 && (
              <Card isDark={isDark} delay={0.12}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Globe size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                    <span className={cn('text-[11px] font-semibold uppercase tracking-wider', theme.text.dimmed)}>
                      Другие значения «{capitalize(word.bur)}»
                    </span>
                  </div>
                  <div className="space-y-1">
                    {data.otherTranslations.map(t => (
                      <motion.button
                        key={t._id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigateToWord(t._id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group',
                          isDark ? 'hover:bg-white/[0.06] active:bg-white/[0.10]' : 'hover:bg-stone-50 active:bg-stone-100',
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                          isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600',
                        )}>
                          {capitalize(t.bur).charAt(0)}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <span className={cn('text-[13px] font-medium', theme.text.primary)}>{t.ru}</span>
                        </div>
                        <ChevronRight size={14} className={cn(
                          'flex-shrink-0 transition-transform group-hover:translate-x-0.5',
                          theme.text.dimmed,
                        )} />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* ═══════════════════════════════
               5. ЛЕКСИЧЕСКИЕ СВЯЗИ (синонимы, антонимы)
               ═══════════════════════════════ */}
            {(word.synonyms.length > 0 || word.antonyms.length > 0) && (
              <Card isDark={isDark} delay={0.15}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 size={14} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
                    <span className={cn('text-[11px] font-semibold uppercase tracking-wider', theme.text.dimmed)}>
                      Лексические связи
                    </span>
                  </div>

                  {word.synonyms.length > 0 && (
                    <div className="mb-3">
                      <div className={cn(
                        'text-[10px] uppercase tracking-widest font-semibold mb-1.5',
                        isDark ? 'text-emerald-400/60' : 'text-emerald-600/70',
                      )}>
                        ≈ Синонимы
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {word.synonyms.map((s, i) => (
                          <span key={i} className={cn(
                            'text-[12px] font-medium px-2.5 py-1 rounded-lg border',
                            isDark ? 'bg-emerald-500/8 text-emerald-400/80 border-emerald-500/12' : 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
                          )}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {word.antonyms.length > 0 && (
                    <div>
                      <div className={cn(
                        'text-[10px] uppercase tracking-widest font-semibold mb-1.5',
                        isDark ? 'text-red-400/60' : 'text-red-600/70',
                      )}>
                        ↔ Антонимы
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {word.antonyms.map((a, i) => (
                          <span key={i} className={cn(
                            'text-[12px] font-medium px-2.5 py-1 rounded-lg border',
                            isDark ? 'bg-red-500/8 text-red-400/80 border-red-500/12' : 'bg-red-50 text-red-700 border-red-200/50',
                          )}>
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* ═══════════════════════════════
               6. СВЯЗАННЫЕ СЛОВА
               ═══════════════════════════════ */}
            {data.relatedWords.length > 0 && (
              <Card isDark={isDark} delay={0.18}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                    <span className={cn('text-[11px] font-semibold uppercase tracking-wider', theme.text.dimmed)}>
                      Связанные слова
                    </span>
                  </div>
                  <div className="space-y-1">
                    {data.relatedWords.map(rw => (
                      <motion.button
                        key={rw._id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigateToWord(rw._id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group',
                          isDark ? 'hover:bg-white/[0.06] active:bg-white/[0.10]' : 'hover:bg-stone-50 active:bg-stone-100',
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                          isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600',
                        )}>
                          {capitalize(rw.bur).charAt(0)}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className={cn('text-[13px] font-medium truncate', theme.text.primary)}>
                            {capitalize(rw.bur)}
                          </div>
                          <div className={cn('text-[11px] truncate', theme.text.muted)}>{rw.ru}</div>
                        </div>
                        {rw.tags.length > 0 && (
                          <span className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded-full hidden sm:block',
                            isDark ? 'bg-white/[0.06] text-white/40' : 'bg-stone-100 text-stone-400',
                          )}>
                            {rw.tags[0]}
                          </span>
                        )}
                        <ChevronRight size={14} className={cn(
                          'flex-shrink-0 transition-transform group-hover:translate-x-0.5',
                          theme.text.dimmed,
                        )} />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* ═══════════════════════════════
               7. КОММЕНТАРИИ
               ═══════════════════════════════ */}
            <Card isDark={isDark} delay={0.22}>
              <div className="p-4">
                {/* Заголовок секции */}
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={14} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
                  <span className={cn('text-[11px] font-semibold uppercase tracking-wider', theme.text.dimmed)}>
                    Комментарии
                  </span>
                  {data.commentsCount > 0 && (
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto tabular-nums',
                      isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-100 text-sky-700',
                    )}>
                      {data.commentsCount}
                    </span>
                  )}
                </div>

                {/* ── Ошибка комментариев ── */}
                {commentError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'text-[12px] px-3 py-2 rounded-lg mb-3 border',
                      isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200',
                    )}
                  >
                    {commentError}
                  </motion.div>
                )}

                {/* ── Форма добавления комментария ── */}
                {isAuthenticated ? (
                  <div className="mb-3">
                    <div className={cn(
                      'flex items-end gap-2 rounded-xl p-2 border transition-colors',
                      isDark
                        ? 'bg-white/[0.03] border-white/[0.08] focus-within:border-sky-500/30'
                        : 'bg-stone-50/60 border-stone-200/50 focus-within:border-sky-300',
                    )}>
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value.slice(0, 1000))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                        placeholder="Напишите комментарий…"
                        rows={1}
                        className={cn(
                          'flex-1 bg-transparent text-[13px] leading-relaxed resize-none outline-none placeholder:text-stone-400',
                          isDark ? 'text-white/90 placeholder:text-white/25' : 'text-stone-800',
                        )}
                        style={{ minHeight: 36, maxHeight: 120 }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                        }}
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleAddComment}
                        disabled={!commentText.trim() || commentSubmitting}
                        className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-lg transition-all flex-shrink-0',
                          commentText.trim()
                            ? (isDark
                                ? 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30'
                                : 'bg-sky-100 text-sky-600 hover:bg-sky-200')
                            : (isDark ? 'bg-white/[0.04] text-white/20' : 'bg-stone-100 text-stone-300'),
                          commentSubmitting && 'opacity-50',
                        )}
                      >
                        {commentSubmitting
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Send size={14} />}
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between mt-1 px-1">
                      <span className={cn('text-[10px]', theme.text.dimmed)}>
                        Enter — отправить, Shift+Enter — новая строка
                      </span>
                      {commentText.length > 0 && (
                        <span className={cn(
                          'text-[10px] tabular-nums',
                          commentText.length > 900
                            ? (isDark ? 'text-amber-400' : 'text-amber-600')
                            : theme.text.dimmed,
                        )}>
                          {commentText.length}/1000
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    'text-center py-3 rounded-xl mb-3 border',
                    isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-stone-50/40 border-stone-200/30',
                  )}>
                    <p className={cn('text-[12px]', theme.text.muted)}>
                      Войдите, чтобы оставить комментарий
                    </p>
                  </div>
                )}

                {/* ── Список комментариев / пустое состояние ── */}
                {allComments.length === 0 ? (
                  <div className={cn(
                    'flex flex-col items-center py-6 rounded-xl',
                    isDark ? 'bg-white/[0.02]' : 'bg-stone-50/40',
                  )}>
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center mb-2',
                      isDark ? 'bg-white/[0.06]' : 'bg-stone-100',
                    )}>
                      <MessageSquare size={18} className={theme.text.dimmed} />
                    </div>
                    <p className={cn('text-[12px] font-medium', theme.text.muted)}>Пока нет комментариев</p>
                    <p className={cn('text-[11px] mt-0.5', theme.text.dimmed)}>Будьте первым, кто оставит заметку</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visibleComments.map((comment, idx) => {
                      const isOwn = !!(currentUserId && comment.userId === currentUserId);
                      const canEdit = isOwn || canModerate;
                      const isEditing = editingCommentId === comment._id;
                      const isDeleting = deletingCommentId === comment._id;
                      const wasEdited = comment.updatedAt && comment.createdAt !== comment.updatedAt;

                      return (
                        <motion.div
                          key={comment._id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05, duration: 0.2 }}
                          className={cn(
                            'rounded-xl px-3.5 py-3 border transition-colors',
                            isDeleting && 'opacity-50 pointer-events-none',
                            isOwn
                              ? (isDark ? 'bg-sky-500/8 border-sky-500/15' : 'bg-sky-50/60 border-sky-200/40')
                              : (isDark ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-stone-50/50 border-stone-200/30'),
                          )}
                        >
                          {/* Шапка: аватар + имя + время + действия */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                              isDark ? 'bg-white/10 text-white/60' : 'bg-stone-200 text-stone-500',
                            )}>
                              {comment.userName?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <span className={cn('text-[12px] font-semibold truncate', theme.text.primary)}>
                              {comment.userName}
                              {isOwn && (
                                <span className={cn('text-[9px] font-normal ml-1', theme.text.dimmed)}>(вы)</span>
                              )}
                            </span>

                            <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                              {wasEdited && (
                                <span className={cn('text-[9px] italic', theme.text.dimmed)}>ред.</span>
                              )}
                              <span className={cn('text-[10px]', theme.text.dimmed)}>
                                {relativeTime(comment.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Текст / Режим редактирования */}
                          {isEditing ? (
                            <div className="mt-1">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value.slice(0, 1000))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleEditComment();
                                  }
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                                rows={2}
                                autoFocus
                                className={cn(
                                  'w-full bg-transparent text-[13px] leading-relaxed resize-none outline-none rounded-lg p-2 border transition-colors',
                                  isDark
                                    ? 'border-sky-500/30 text-white/90 focus:border-sky-500/50'
                                    : 'border-sky-200 text-stone-800 focus:border-sky-400',
                                )}
                                style={{ minHeight: 48, maxHeight: 120 }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                                }}
                              />
                              <div className="flex items-center justify-between mt-1.5">
                                <span className={cn('text-[10px] tabular-nums', theme.text.dimmed)}>
                                  {editingText.length}/1000
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={cancelEditing}
                                    className={cn(
                                      'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors',
                                      isDark ? 'text-white/50 hover:bg-white/[0.06]' : 'text-stone-500 hover:bg-stone-100',
                                    )}
                                  >
                                    <X size={12} /> Отмена
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleEditComment}
                                    disabled={!editingText.trim() || editSubmitting}
                                    className={cn(
                                      'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
                                      editingText.trim()
                                        ? (isDark
                                            ? 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30'
                                            : 'bg-sky-100 text-sky-600 hover:bg-sky-200')
                                        : (isDark ? 'bg-white/[0.04] text-white/20' : 'bg-stone-100 text-stone-300'),
                                      editSubmitting && 'opacity-50',
                                    )}
                                  >
                                    {editSubmitting
                                      ? <Loader2 size={12} className="animate-spin" />
                                      : <Check size={12} />}
                                    Сохранить
                                  </motion.button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className={cn('text-[13px] leading-relaxed whitespace-pre-wrap', theme.text.secondary)}>
                                {comment.text}
                              </p>

                              {/* Кнопки действий */}
                              {canEdit && isAuthenticated && (
                                <div className={cn(
                                  'flex items-center gap-1 mt-2 pt-1.5 border-t',
                                  isDark ? 'border-white/[0.05]' : 'border-stone-200/20',
                                )}>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => startEditing(comment._id, comment.text)}
                                    className={cn(
                                      'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors',
                                      isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100',
                                    )}
                                  >
                                    <Pencil size={11} /> Изменить
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                      if (window.confirm('Удалить комментарий?')) {
                                        handleDeleteComment(comment._id);
                                      }
                                    }}
                                    disabled={isDeleting}
                                    className={cn(
                                      'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors',
                                      isDark ? 'text-red-400/50 hover:text-red-400 hover:bg-red-500/10' : 'text-red-300 hover:text-red-500 hover:bg-red-50',
                                    )}
                                  >
                                    {isDeleting
                                      ? <Loader2 size={11} className="animate-spin" />
                                      : <Trash2 size={11} />}
                                    Удалить
                                  </motion.button>
                                </div>
                              )}
                            </>
                          )}
                        </motion.div>
                      );
                    })}

                    {/* Кнопки пагинации */}
                    {(hasMoreComments || visibleCommentsCount > COMMENTS_PER_PAGE) && (
                      <div className="flex items-center justify-center gap-2 pt-1">
                        {hasMoreComments && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={showMoreComments}
                            className={cn(
                              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium transition-colors',
                              isDark
                                ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white/80 border border-white/[0.06]'
                                : 'bg-stone-50 text-stone-500 hover:bg-stone-100 hover:text-stone-700 border border-stone-200/40',
                            )}
                          >
                            <MessageSquare size={12} />
                            Показать ещё {Math.min(hiddenCount, COMMENTS_PER_PAGE)} из {hiddenCount}
                          </motion.button>
                        )}
                        {visibleCommentsCount > COMMENTS_PER_PAGE && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={collapseComments}
                            className={cn(
                              'flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors',
                              isDark
                                ? 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50',
                            )}
                          >
                            Свернуть
                          </motion.button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* ═══════════════════════════════
               8. ИСТОЧНИКИ
               ═══════════════════════════════ */}
            {word.sources.length > 0 && (
              <Card isDark={isDark} delay={0.25}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <BookOpen size={14} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
                    <span className={cn('text-[11px] font-semibold uppercase tracking-wider', theme.text.dimmed)}>
                      Источники
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {word.sources.map((s, i) => (
                      <div key={i} className={cn(
                        'flex items-start gap-2 px-3 py-2 rounded-lg',
                        isDark ? 'bg-white/[0.03]' : 'bg-stone-50/50',
                      )}>
                        <span className={cn('text-[11px] mt-0.5 flex-shrink-0', theme.text.dimmed)}>📖</span>
                        <span className={cn('text-[12px] leading-relaxed', theme.text.secondary)}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* ═══════════════════════════════
               9. ИНФОРМАЦИЯ / МЕТА
               ═══════════════════════════════ */}
            <Card isDark={isDark} delay={0.28}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <User size={14} className={theme.text.muted} />
                  <span className={cn('text-[11px] font-semibold uppercase tracking-wider', theme.text.dimmed)}>
                    Информация
                  </span>
                </div>

                <div className={cn(
                  'divide-y',
                  isDark ? 'divide-white/[0.05]' : 'divide-stone-100',
                )}>
                  {word.contributor && (
                    <InfoRow themeText={theme.text} label="Автор" value={word.contributor.name} />
                  )}
                  {word.categoryId && (
                    <InfoRow themeText={theme.text} label="Категория" value={word.categoryId.name} />
                  )}
                  <InfoRow
                    themeText={theme.text}
                    label="В филворде"
                    value={
                      <span className={cn(
                        'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                        word.isActiveInGame
                          ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                          : (isDark ? 'bg-stone-500/15 text-stone-400' : 'bg-stone-100 text-stone-500'),
                      )}>
                        {word.isActiveInGame ? 'Активно' : 'Нет'}
                      </span>
                    }
                  />
                  <InfoRow themeText={theme.text} label="Просмотров" value={word.viewCount} />
                  <InfoRow themeText={theme.text} label="Поисковых запросов" value={word.lookupCount} />

                  {word.rejectionReason && (
                    <div className="py-1.5">
                      <span className={cn('text-[12px] block mb-0.5', theme.text.muted)}>Причина отклонения</span>
                      <span className={cn('text-[12px]', isDark ? 'text-red-400' : 'text-red-600')}>
                        {word.rejectionReason}
                      </span>
                    </div>
                  )}
                </div>

                {/* Даты */}
                <div className={cn(
                  'mt-3 pt-3 border-t space-y-1',
                  isDark ? 'border-white/[0.06]' : 'border-stone-100',
                )}>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-[11px]', theme.text.dimmed)}>Добавлено</span>
                    <span className={cn('text-[11px]', theme.text.muted)}>{formatDateFull(word.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-[11px]', theme.text.dimmed)}>Обновлено</span>
                    <span className={cn('text-[11px]', theme.text.muted)}>{formatDateFull(word.updatedAt)}</span>
                  </div>
                  {word.moderatedAt && (
                    <div className="flex items-center justify-between">
                      <span className={cn('text-[11px]', theme.text.dimmed)}>Модерировано</span>
                      <span className={cn('text-[11px]', theme.text.muted)}>{formatDateFull(word.moderatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default WordDetailScreen;

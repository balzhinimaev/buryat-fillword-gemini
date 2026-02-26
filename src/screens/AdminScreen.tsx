// src/screens/AdminScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  LayoutGrid,
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Shield,
  Activity,
  Database,
  Bug,
  BarChart3,
  AlertTriangle,
  Eye,
  Loader2,
  Megaphone,
  Layers,
  CalendarDays,
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import {
  api,
  type WordsStats,
  type ProjectStats,
  type ApiWord,
  type ApiWordsResponse,
} from '../services/api';

interface AdminScreenProps {
  store: GameStore;
}

// ─── Stat Card ──────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  isDark: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, isDark }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "p-4 rounded-2xl border",
      isDark
        ? "bg-white/5 border-white/10"
        : "bg-white border-stone-200"
    )}
  >
    <div className="flex items-center gap-2 mb-2">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
        {icon}
      </div>
    </div>
    <div className={cn(
      "text-2xl font-bold",
      isDark ? "text-white" : "text-stone-900"
    )}>
      {value}
    </div>
    <div className={cn(
      "text-xs mt-0.5",
      isDark ? "text-white/50" : "text-stone-500"
    )}>
      {label}
    </div>
  </motion.div>
);

// ─── Section Header ─────────────────────────────────────────────────
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  isDark: boolean;
  action?: React.ReactNode;
}> = ({ icon, title, isDark, action }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <span className={cn("opacity-60", isDark ? "text-white" : "text-stone-700")}>{icon}</span>
      <h2 className={cn(
        "text-base font-bold",
        isDark ? "text-white" : "text-stone-900"
      )}>
        {title}
      </h2>
    </div>
    {action}
  </div>
);

// ─── Word Row for pending words ─────────────────────────────────────
interface WordRowProps {
  word: ApiWord;
  isDark: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onView: (id: string) => void;
  loading: boolean;
}

const WordRow: React.FC<WordRowProps> = ({ word, isDark, onApprove, onReject, onView, loading }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 10 }}
    className={cn(
      "p-3 rounded-xl border flex items-center gap-3",
      isDark
        ? "bg-white/5 border-white/10"
        : "bg-white border-stone-200"
    )}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className={cn(
          "font-bold text-sm truncate",
          isDark ? "text-white" : "text-stone-900"
        )}>
          {word.bur}
        </span>
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded",
          isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"
        )}>
          pending
        </span>
      </div>
      <div className={cn(
        "text-xs mt-0.5 truncate",
        isDark ? "text-white/50" : "text-stone-500"
      )}>
        {word.ru}
      </div>
      <div className={cn(
        "text-[10px] mt-1 flex items-center gap-2",
        isDark ? "text-white/30" : "text-stone-400"
      )}>
        <span>{word.contributor?.name || '?'}</span>
        <span>·</span>
        <span className="flex items-center gap-0.5">
          <ThumbsUp size={9} /> {word.upvotes?.length || 0}
        </span>
        <span className="flex items-center gap-0.5">
          <ThumbsDown size={9} /> {word.downvotes?.length || 0}
        </span>
        <span>·</span>
        <span>score: {word.verificationScore}</span>
      </div>
    </div>

    <div className="flex items-center gap-1.5 shrink-0">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onView(word._id)}
        disabled={loading}
        className={cn(
          "p-2 rounded-lg transition-colors",
          isDark ? "bg-white/10 hover:bg-white/20" : "bg-stone-100 hover:bg-stone-200"
        )}
      >
        <Eye size={14} className={isDark ? "text-white/60" : "text-stone-500"} />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onApprove(word._id)}
        disabled={loading}
        className={cn(
          "p-2 rounded-lg transition-colors",
          "bg-emerald-500/20 hover:bg-emerald-500/30"
        )}
      >
        <CheckCircle2 size={14} className="text-emerald-500" />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onReject(word._id)}
        disabled={loading}
        className={cn(
          "p-2 rounded-lg transition-colors",
          "bg-red-500/20 hover:bg-red-500/30"
        )}
      >
        <XCircle size={14} className="text-red-500" />
      </motion.button>
    </div>
  </motion.div>
);

// ─── Navigation Card ────────────────────────────────────────────────
interface NavCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  isDark: boolean;
  color: string;
}

const NavCard: React.FC<NavCardProps> = ({ icon, title, subtitle, onClick, isDark, color }) => (
  <motion.button
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "w-full p-4 rounded-2xl border transition-all flex items-center gap-3 group text-left",
      isDark
        ? "bg-white/5 border-white/10 hover:border-white/20"
        : "bg-white border-stone-200 hover:border-stone-300"
    )}
  >
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform",
      color
    )}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className={cn(
        "font-semibold text-sm",
        isDark ? "text-white" : "text-stone-900"
      )}>
        {title}
      </div>
      {subtitle && (
        <div className={cn(
          "text-xs mt-0.5",
          isDark ? "text-white/50" : "text-stone-500"
        )}>
          {subtitle}
        </div>
      )}
    </div>
    <ChevronRight size={16} className={isDark ? "text-white/30" : "text-stone-400"} />
  </motion.button>
);

// ─── Tab Button ─────────────────────────────────────────────────────
interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
  count?: number;
}

const TabButton: React.FC<TabButtonProps> = ({ label, active, onClick, isDark, count }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
      active
        ? isDark
          ? "bg-violet-500/30 text-violet-300"
          : "bg-violet-100 text-violet-700"
        : isDark
          ? "bg-white/5 text-white/50 hover:bg-white/10"
          : "bg-stone-100 text-stone-500 hover:bg-stone-200"
    )}
  >
    {label}
    {count !== undefined && (
      <span className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-bold",
        active
          ? isDark ? "bg-violet-500/40 text-violet-200" : "bg-violet-200 text-violet-800"
          : isDark ? "bg-white/10 text-white/40" : "bg-stone-200 text-stone-600"
      )}>
        {count}
      </span>
    )}
  </motion.button>
);

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════

type WordTab = 'pending' | 'verified' | 'rejected';

export const AdminScreen: React.FC<AdminScreenProps> = ({ store }) => {
  const { goBack, navigate } = store;
  const { theme, isDark } = useTheme();

  useBackButton(() => goBack());

  // State
  const [wordsStats, setWordsStats] = useState<WordsStats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [words, setWords] = useState<ApiWord[]>([]);
  const [wordsTotal, setWordsTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<WordTab>('pending');
  const [loading, setLoading] = useState(true);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Load stats ───────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ws, ps] = await Promise.all([
        api.getWordsStats(),
        api.getProjectStats(),
      ]);
      setWordsStats(ws);
      setProjectStats(ps);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError('Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Load words by tab ────────────────────────────────────────────
  const loadWords = useCallback(async (tab: WordTab) => {
    try {
      setWordsLoading(true);
      const response: ApiWordsResponse = await api.getWords({
        status: tab,
        limit: 20,
        offset: 0,
        sortBy: 'createdAt',
      });
      setWords(response.words);
      setWordsTotal(response.total);
    } catch (err) {
      console.error('Failed to load words:', err);
    } finally {
      setWordsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadWords(activeTab);
  }, [activeTab, loadWords]);

  // ─── Admin actions ────────────────────────────────────────────────
  const handleApprove = useCallback(async (wordId: string) => {
    try {
      setActionLoading(true);
      await api.post(`/words/${wordId}/vote`, { type: 'upvote' });
      // Remove from local list
      setWords(prev => prev.filter(w => w._id !== wordId));
      setWordsTotal(prev => Math.max(0, prev - 1));
      // Refresh stats
      loadStats();
    } catch (err) {
      console.error('Failed to approve word:', err);
    } finally {
      setActionLoading(false);
    }
  }, [loadStats]);

  const handleReject = useCallback(async (wordId: string) => {
    try {
      setActionLoading(true);
      await api.post(`/words/${wordId}/vote`, { type: 'downvote', reason: 'admin_rejected' });
      setWords(prev => prev.filter(w => w._id !== wordId));
      setWordsTotal(prev => Math.max(0, prev - 1));
      loadStats();
    } catch (err) {
      console.error('Failed to reject word:', err);
    } finally {
      setActionLoading(false);
    }
  }, [loadStats]);

  const handleViewWord = useCallback((wordId: string) => {
    store.navigate('wordDetail');
    // Use navigateToWord if it sets the selected word
    store.navigateToWord(wordId);
  }, [store]);

  const handleTabChange = (tab: WordTab) => {
    setActiveTab(tab);
  };

  return (
    <div className={cn("min-h-[100dvh] flex flex-col", theme.backgrounds.primaryGradient)}>
      <StickyHeader title="Админ-панель" onBack={goBack} />

      {/* Header */}
      <header className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={goBack}
            className={cn(
              "p-2 rounded-xl transition-colors",
              isDark ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"
            )}
          >
            <ArrowLeft size={22} className={theme.text.primary} />
          </motion.button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Shield size={20} className={cn(isDark ? "text-violet-400" : "text-violet-600")} />
              <h1 className={cn("text-xl font-bold", theme.text.primary)}>
                Админ-панель
              </h1>
            </div>
            <p className={cn("text-xs mt-0.5", isDark ? "text-white/40" : "text-stone-500")}>
              Управление словарём и статистика
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              loadStats();
              loadWords(activeTab);
            }}
            disabled={loading}
            className={cn(
              "p-2.5 rounded-xl transition-colors",
              isDark ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"
            )}
          >
            <RefreshCw
              size={18}
              className={cn(
                theme.text.primary,
                loading && "animate-spin"
              )}
            />
          </motion.button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 pb-8 space-y-6">

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-3 rounded-xl border flex items-center gap-2",
              isDark
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-red-50 border-red-200 text-red-600"
            )}
          >
            <AlertTriangle size={16} />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {/* ═══ Stats Grid ═══ */}
        <section>
          <SectionHeader
            icon={<BarChart3 size={16} />}
            title="Обзор"
            isDark={isDark}
          />

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className={cn("animate-spin", isDark ? "text-white/30" : "text-stone-400")} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<BookOpen size={16} className="text-white" />}
                label="Всего слов"
                value={wordsStats?.total ?? '—'}
                color={isDark ? "bg-violet-500/30" : "bg-violet-100"}
                isDark={isDark}
              />
              <StatCard
                icon={<Clock size={16} className="text-white" />}
                label="Ожидают проверки"
                value={wordsStats?.pending ?? '—'}
                color={isDark ? "bg-amber-500/30" : "bg-amber-100"}
                isDark={isDark}
              />
              <StatCard
                icon={<CheckCircle2 size={16} className="text-white" />}
                label="Подтверждено"
                value={wordsStats?.verified ?? '—'}
                color={isDark ? "bg-emerald-500/30" : "bg-emerald-100"}
                isDark={isDark}
              />
              <StatCard
                icon={<XCircle size={16} className="text-white" />}
                label="Отклонено"
                value={wordsStats?.rejected ?? '—'}
                color={isDark ? "bg-red-500/30" : "bg-red-100"}
                isDark={isDark}
              />
              <StatCard
                icon={<Users size={16} className="text-white" />}
                label="Участников"
                value={projectStats?.participantsCount ?? '—'}
                color={isDark ? "bg-blue-500/30" : "bg-blue-100"}
                isDark={isDark}
              />
              <StatCard
                icon={<Activity size={16} className="text-white" />}
                label="В игре"
                value={wordsStats?.activeInGame ?? '—'}
                color={isDark ? "bg-cyan-500/30" : "bg-cyan-100"}
                isDark={isDark}
              />
            </div>
          )}
        </section>

        {/* ═══ Words Management ═══ */}
        <section>
          <SectionHeader
            icon={<Database size={16} />}
            title="Управление словами"
            isDark={isDark}
            action={
              <span className={cn(
                "text-xs",
                isDark ? "text-white/30" : "text-stone-400"
              )}>
                {wordsTotal} шт.
              </span>
            }
          />

          {/* Tabs */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            <TabButton
              label="Ожидают"
              active={activeTab === 'pending'}
              onClick={() => handleTabChange('pending')}
              isDark={isDark}
              count={wordsStats?.pending}
            />
            <TabButton
              label="Подтверждены"
              active={activeTab === 'verified'}
              onClick={() => handleTabChange('verified')}
              isDark={isDark}
              count={wordsStats?.verified}
            />
            <TabButton
              label="Отклонены"
              active={activeTab === 'rejected'}
              onClick={() => handleTabChange('rejected')}
              isDark={isDark}
              count={wordsStats?.rejected}
            />
          </div>

          {/* Words List */}
          {wordsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className={cn("animate-spin", isDark ? "text-white/30" : "text-stone-400")} />
            </div>
          ) : words.length === 0 ? (
            <div className={cn(
              "text-center py-8 rounded-2xl border",
              isDark ? "bg-white/5 border-white/10" : "bg-white border-stone-200"
            )}>
              <div className="text-3xl mb-2">
                {activeTab === 'pending' ? '✅' : activeTab === 'verified' ? '📚' : '🗑️'}
              </div>
              <div className={cn(
                "text-sm",
                isDark ? "text-white/40" : "text-stone-500"
              )}>
                {activeTab === 'pending'
                  ? 'Нет слов на проверке'
                  : activeTab === 'verified'
                    ? 'Нет подтверждённых слов'
                    : 'Нет отклонённых слов'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {words.map((word) => (
                  <WordRow
                    key={word._id}
                    word={word}
                    isDark={isDark}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onView={handleViewWord}
                    loading={actionLoading}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* ═══ Tools ═══ */}
        <section>
          <SectionHeader
            icon={<LayoutGrid size={16} />}
            title="Инструменты"
            isDark={isDark}
          />

          <div className="space-y-2">
            <NavCard
              icon={<Layers size={18} className="text-white" />}
              title="Кампании"
              subtitle="Главы и уроки кампании"
              onClick={() => navigate('adminCampaign')}
              isDark={isDark}
              color={isDark ? "bg-indigo-500/30" : "bg-indigo-100"}
            />
            <NavCard
              icon={<Layers size={18} className="text-white" />}
              title="Управление уровнями"
              subtitle="Создание и редактирование ручных уровней"
              onClick={() => store.navigateToLevelEditor(null)}
              isDark={isDark}
              color={isDark ? "bg-violet-500/30" : "bg-violet-100"}
            />
            <NavCard
              icon={<CalendarDays size={18} className="text-white" />}
              title="Филлворд дня"
              subtitle="Ежедневные паззлы для игроков"
              onClick={() => store.navigateToDailyWordEditor(null)}
              isDark={isDark}
              color={isDark ? "bg-orange-500/30" : "bg-orange-100"}
            />
            <NavCard
              icon={<Megaphone size={18} className="text-white" />}
              title="Рассылка"
              subtitle="Отправка сообщений через Telegram"
              onClick={() => navigate('broadcast')}
              isDark={isDark}
              color={isDark ? "bg-pink-500/30" : "bg-pink-100"}
            />
            <NavCard
              icon={<Bug size={18} className="text-white" />}
              title="Debug Grid"
              subtitle="Тестирование генерации сеток"
              onClick={() => navigate('debug')}
              isDark={isDark}
              color={isDark ? "bg-cyan-500/30" : "bg-cyan-100"}
            />
            <NavCard
              icon={<BookOpen size={18} className="text-white" />}
              title="Словарь"
              subtitle="Просмотр всех слов"
              onClick={() => navigate('dictionary')}
              isDark={isDark}
              color={isDark ? "bg-violet-500/30" : "bg-violet-100"}
            />
            <NavCard
              icon={<BarChart3 size={18} className="text-white" />}
              title="Статистика"
              subtitle="Общая статистика игры"
              onClick={() => navigate('stats')}
              isDark={isDark}
              color={isDark ? "bg-emerald-500/30" : "bg-emerald-100"}
            />
            <NavCard
              icon={<Users size={18} className="text-white" />}
              title="Рекорды"
              subtitle="Лидерборд игроков"
              onClick={() => navigate('leaderboard')}
              isDark={isDark}
              color={isDark ? "bg-amber-500/30" : "bg-amber-100"}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminScreen;

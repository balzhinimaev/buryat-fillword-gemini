// src/components/contribution/StatsView.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Plus,
  Check,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Star,
  Trophy,
  Shield,
  BookOpen,
  Loader2
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { cn } from '../ui';
import type { UserStats, WordsStats, LanguageKeeperLeaderboardItem } from '../../services/api';

interface ContributionStats {
  totalWords: number;
  pendingWords: number;
  verifiedWords: number;
  rejectedWords: number;
  topContributors: { name: string; count: number }[];
}

interface StatsViewProps {
  stats: ContributionStats;
  wordsStats: WordsStats | null;
  wordsStatsLoading: boolean;
  userStats: UserStats | null;
  userStatsLoading: boolean;
  leaderboard: LanguageKeeperLeaderboardItem[];
  leaderboardLoading: boolean;
  onExport: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ 
  stats, 
  wordsStats,
  wordsStatsLoading,
  userStats, 
  userStatsLoading,
  leaderboard,
  leaderboardLoading,
  onExport 
}) => {
  const { theme, isDark } = useTheme();

  return (
    <div className="space-y-6">
      {/* Личная статистика */}
      <div className={cn(
        "p-4 rounded-2xl border",
        isDark 
          ? "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20"
          : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm"
      )}>
        <div className={cn("flex items-center gap-2 mb-4", isDark ? "text-amber-300" : "text-amber-800")}>
          <Star size={18} className={isDark ? "text-amber-400" : "text-amber-600"} />
          <span className="font-semibold">Ваша статистика</span>
        </div>
        
        {userStatsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={24} className={cn("animate-spin", isDark ? "text-amber-400" : "text-amber-600")} />
          </div>
        ) : userStats ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Добавлено слов */}
              <div className={cn(
                "p-3 rounded-xl border",
                isDark ? "bg-stone-800/60 border-stone-700/50" : "bg-white border-stone-200"
              )}>
                <div className={cn("flex items-center gap-2 text-xs mb-1", theme.text.muted)}>
                  <Plus size={12} />
                  Добавлено
                </div>
                <p className={cn("text-xl font-bold", theme.text.primary)}>{userStats.wordsAdded}</p>
              </div>
              
              {/* Проверено слов */}
              <div className={cn(
                "p-3 rounded-xl border",
                isDark ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"
              )}>
                <div className={cn("flex items-center gap-2 text-xs mb-1", isDark ? "text-blue-400" : "text-blue-600")}>
                  <Check size={12} />
                  Проверено
                </div>
                <p className={cn("text-xl font-bold", isDark ? "text-blue-400" : "text-blue-600")}>{userStats.wordsVerified}</p>
              </div>
              
              {/* Одобрено */}
              <div className={cn(
                "p-3 rounded-xl border",
                isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
              )}>
                <div className={cn("flex items-center gap-2 text-xs mb-1", isDark ? "text-emerald-400" : "text-emerald-600")}>
                  <CheckCircle2 size={12} />
                  Одобрено
                </div>
                <p className={cn("text-xl font-bold", isDark ? "text-emerald-400" : "text-emerald-600")}>{userStats.wordsApproved}</p>
              </div>
              
              {/* Отклонено */}
              <div className={cn(
                "p-3 rounded-xl border",
                isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
              )}>
                <div className={cn("flex items-center gap-2 text-xs mb-1", isDark ? "text-red-400" : "text-red-600")}>
                  <XCircle size={12} />
                  Отклонено
                </div>
                <p className={cn("text-xl font-bold", isDark ? "text-red-400" : "text-red-600")}>{userStats.wordsRejected}</p>
              </div>
            </div>
            
            {/* Точность верификации */}
            <div className={cn(
              "p-3 rounded-xl border",
              isDark ? "bg-violet-500/10 border-violet-500/30" : "bg-violet-50 border-violet-200"
            )}>
              <div className="flex items-center justify-between">
                <div className={cn("flex items-center gap-2 text-sm", isDark ? "text-violet-400" : "text-violet-600")}>
                  <Shield size={14} />
                  Точность проверок
                </div>
                <p className={cn("text-xl font-bold", isDark ? "text-violet-400" : "text-violet-600")}>
                  {userStats.verificationAccuracy}%
                </p>
              </div>
              {userStats.wordsVerified > 0 && (
                <div className="mt-2">
                  <div className={cn(
                    "w-full h-2 rounded-full overflow-hidden",
                    isDark ? "bg-stone-700" : "bg-violet-100"
                  )}>
                    <div 
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${userStats.verificationAccuracy}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className={cn("text-center py-4", theme.text.dimmed)}>
            Не удалось загрузить статистику
          </p>
        )}
      </div>

      {/* Общая статистика проекта */}
      <div>
        <div className={cn("flex items-center gap-2 mb-3", theme.text.secondary)}>
          <Users size={16} />
          <span className="font-medium text-sm">Статистика проекта</span>
        </div>
        
        <div className={cn(
          "p-4 rounded-2xl border",
          isDark ? "bg-stone-800/60 border-stone-700/50" : "bg-white border-stone-200 shadow-sm"
        )}>
          {wordsStatsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={24} className={cn("animate-spin", theme.text.muted)} />
            </div>
          ) : wordsStats ? (
            <div className="grid grid-cols-2 gap-3">
              <div className={cn(
                "p-3 rounded-xl border",
                isDark ? "bg-stone-800/50 border-stone-700/50" : "bg-amber-50 border-amber-200"
              )}>
                <div className={cn("flex items-center gap-2 text-sm mb-1", theme.text.muted)}>
                  <BookOpen size={14} />
                  Всего слов
                </div>
                <p className={cn("text-2xl font-bold", theme.text.primary)}>{wordsStats.total}</p>
              </div>

              <div className={cn(
                "p-3 rounded-xl border",
                isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
              )}>
                <div className={cn("flex items-center gap-2 text-sm mb-1", isDark ? "text-emerald-400" : "text-emerald-600")}>
                  <CheckCircle2 size={14} />
                  Проверено
                </div>
                <p className={cn("text-2xl font-bold", isDark ? "text-emerald-400" : "text-emerald-600")}>{wordsStats.verified}</p>
              </div>

              <div className={cn(
                "p-3 rounded-xl border",
                isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"
              )}>
                <div className={cn("flex items-center gap-2 text-sm mb-1", isDark ? "text-amber-400" : "text-amber-600")}>
                  <Clock size={14} />
                  На проверке
                </div>
                <p className={cn("text-2xl font-bold", isDark ? "text-amber-400" : "text-amber-600")}>{wordsStats.pending}</p>
              </div>

              <div className={cn(
                "p-3 rounded-xl border",
                isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
              )}>
                <div className={cn("flex items-center gap-2 text-sm mb-1", isDark ? "text-red-400" : "text-red-600")}>
                  <XCircle size={14} />
                  Отклонено
                </div>
                <p className={cn("text-2xl font-bold", isDark ? "text-red-400" : "text-red-600")}>{wordsStats.rejected}</p>
              </div>

              <div className={cn(
                "p-3 rounded-xl border",
                "col-span-2",
                isDark ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"
              )}>
                <div className={cn("flex items-center gap-2 text-sm mb-1", isDark ? "text-blue-400" : "text-blue-600")}>
                  <Shield size={14} />
                  В игре
                </div>
                <p className={cn("text-2xl font-bold", isDark ? "text-blue-400" : "text-blue-600")}>{wordsStats.activeInGame}</p>
              </div>
            </div>
          ) : (
            <p className={cn("text-center py-4", theme.text.dimmed)}>
              Не удалось загрузить статистику
            </p>
          )}
        </div>
      </div>

      {/* Топ хранителей */}
      <div className={cn(
        "p-4 rounded-2xl border",
        isDark ? "bg-stone-800/60 border-stone-700/50" : "bg-white border-stone-200 shadow-sm"
      )}>
        <div className={cn("flex items-center gap-2 mb-4", theme.text.accent)}>
          <Trophy size={18} />
          <span className="font-semibold">Топ хранителей</span>
        </div>
        
        {leaderboardLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={24} className={cn("animate-spin", theme.text.muted)} />
          </div>
        ) : leaderboard.filter(k => k.role !== 'admin').length > 0 ? (
          <div className="space-y-3">
            {leaderboard.filter(k => k.role !== 'admin').map((keeper, index) => (
              <div 
                key={keeper._id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-colors",
                  index === 0 
                    ? isDark 
                      ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30" 
                      : "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200"
                    : isDark 
                      ? "bg-stone-800/40 border border-stone-700/30" 
                      : "bg-stone-50 border border-stone-200"
                )}
              >
                {/* Позиция */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                  index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30' : 
                  index === 1 ? 'bg-gradient-to-br from-stone-300 to-stone-400 text-white' : 
                  index === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' : 
                  isDark ? 'bg-stone-700 text-stone-400' : 'bg-stone-200 text-stone-600'
                )}>
                  {index + 1}
                </div>
                
                {/* Аватар */}
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 p-0.5">
                  {keeper.photoUrl ? (
                    <img 
                      src={keeper.photoUrl} 
                      alt={keeper.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className={cn(
                      "w-full h-full rounded-full flex items-center justify-center font-bold text-sm",
                      isDark ? "bg-stone-800 text-amber-400" : "bg-white text-amber-600"
                    )}>
                      {keeper.name[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                
                {/* Имя и статистика */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("font-medium truncate", theme.text.primary)}>
                      {keeper.name}
                    </p>
                  </div>
                  <div className={cn("flex items-center gap-3 text-xs mt-0.5", theme.text.muted)}>
                    <span className="flex items-center gap-1">
                      <Plus size={10} />
                      {keeper.stats.wordsAdded}
                    </span>
                    <span className="flex items-center gap-1">
                      <Check size={10} />
                      {keeper.stats.wordsVerified}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      {keeper.stats.wordsApproved}
                    </span>
                  </div>
                </div>
                
                {/* Общий счёт */}
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-lg font-bold", index === 0 ? "text-amber-500" : theme.text.primary)}>
                    {keeper.stats.wordsAdded + keeper.stats.wordsVerified}
                  </p>
                  <p className={cn("text-xs", theme.text.dimmed)}>вклад</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={cn("text-center py-4", theme.text.dimmed)}>
            Пока нет хранителей в рейтинге
          </p>
        )}
      </div>

      {/* Кнопка экспорта */}
      {stats.verifiedWords > 0 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onExport}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 
                     text-white font-bold shadow-lg shadow-violet-500/30
                     hover:from-violet-400 hover:to-purple-500 transition-all
                     flex items-center justify-center gap-2"
        >
          <Download size={20} />
          Экспортировать проверенные слова
        </motion.button>
      )}
    </div>
  );
};


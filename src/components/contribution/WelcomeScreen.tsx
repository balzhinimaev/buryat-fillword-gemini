// src/components/contribution/WelcomeScreen.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Trophy, 
  AlertCircle, 
  Heart, 
  Loader2 
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { cn } from '../ui';
import { ACHIEVEMENTS } from './constants';
import type { ProjectStats, UserResponse } from '../../services/api';

interface WelcomeScreenProps {
  onJoinKeepers: () => Promise<UserResponse>;
  telegramUser: { 
    first_name?: string; 
    last_name?: string; 
    username?: string; 
    photo_url?: string; 
  } | null;
  projectStats: ProjectStats | null;
  statsLoading: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onJoinKeepers, 
  telegramUser, 
  projectStats, 
  statsLoading 
}) => {
  const { theme, isDark } = useTheme();
  
  const displayName = telegramUser 
    ? [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || telegramUser.username || 'Гость'
    : 'Гость';
  
  const initials = telegramUser?.first_name?.[0]?.toUpperCase() || '?';
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  const handleJoin = async () => {
    setIsJoining(true);
    setJoinError(null);
    
    try {
      // Вызываем API для присоединения к хранителям
      await onJoinKeepers();
    } catch (error) {
      console.error('Ошибка при присоединении к хранителям:', error);
      const message = error instanceof Error ? error.message : 'Не удалось присоединиться';
      setJoinError(message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 flex flex-col min-h-[70vh]"
    >
      {/* Героический блок */}
      <div className="text-center mb-8">
        {/* Аватар пользователя или fallback */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 0.2 }}
          className="w-28 h-28 mx-auto mb-6 rounded-full relative"
        >
          {/* Градиентная рамка */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-1 shadow-2xl shadow-orange-500/40">
            {telegramUser?.photo_url ? (
              <img 
                src={telegramUser.photo_url} 
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className={cn(
                "w-full h-full rounded-full flex items-center justify-center",
                isDark ? "bg-stone-800" : "bg-white"
              )}>
                <span className={cn("text-3xl font-bold", isDark ? "text-amber-400" : "text-amber-600")}>{initials}</span>
              </div>
            )}
          </div>
          {/* Анимированное свечение */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 blur-xl -z-10"
          />
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn("text-2xl font-bold mb-2", theme.text.primary)}
        >
          Сайн байна, {displayName}! 👋
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={cn("leading-relaxed", theme.text.muted)}
        >
          Станьте <span className={cn("font-semibold", theme.text.accent)}>Хранителем бурятского языка</span>. 
          Каждое слово — это мост между поколениями.
        </motion.p>
      </div>

      {/* Блок миссии */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={cn(
          "p-5 rounded-2xl border mb-6",
          isDark 
            ? "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20"
            : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 shadow-md"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            isDark ? "bg-amber-500/20" : "bg-amber-200/80"
          )}>
            <Sparkles className={isDark ? "text-amber-400" : "text-amber-700"} size={24} />
          </div>
          <div>
            <h3 className={cn("font-semibold mb-1", isDark ? "text-amber-300" : "text-amber-900")}>Ваша миссия</h3>
            <p className={cn("text-sm leading-relaxed", isDark ? "text-stone-400" : "text-amber-800/70")}>
              Добавляйте слова из своего словарного запаса, проверяйте слова других участников 
              и помогайте сохранить родной язык для будущих поколений.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Достижения */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-8"
      >
        <h3 className={cn("font-semibold mb-3 flex items-center gap-2", isDark ? "text-stone-300" : "text-stone-700")}>
          <Trophy size={16} className={isDark ? "text-amber-400" : "text-amber-600"} />
          Достижения, которые вас ждут
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((ach, idx) => (
            <motion.div
              key={ach.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + idx * 0.1 }}
              className={cn(
                "p-3.5 rounded-xl border",
                isDark ? "bg-stone-800/50 border-stone-700/50" : "bg-white border-stone-200 shadow-sm"
              )}
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${ach.color} 
                              flex items-center justify-center mb-2 ${isDark ? 'opacity-50' : 'opacity-70'}`}>
                <ach.icon size={16} className="text-white" />
              </div>
              <p className={cn("text-sm font-medium", theme.text.primary)}>{ach.name}</p>
              <p className={cn("text-xs", theme.text.dimmed)}>{ach.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Статистика сообщества */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className={cn(
          "flex items-center justify-center gap-4 mb-8 py-5 px-4 rounded-2xl",
          isDark 
            ? "bg-stone-800/40 border border-stone-700/50" 
            : "bg-white border border-stone-200 shadow-sm"
        )}
      >
        <div className="text-center flex-1">
          {statsLoading ? (
            <Loader2 size={24} className={cn("animate-spin mx-auto mb-1", isDark ? "text-stone-500" : "text-stone-400")} />
          ) : (
            <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-amber-600")}>
              {projectStats?.wordsCount?.toLocaleString('ru-RU') ?? '—'}
            </p>
          )}
          <p className={cn("text-xs", isDark ? "text-stone-500" : "text-stone-500")}>слов в базе</p>
        </div>
        <div className={cn("w-px h-10", isDark ? "bg-stone-700" : "bg-stone-200")} />
        <div className="text-center flex-1">
          {statsLoading ? (
            <Loader2 size={24} className={cn("animate-spin mx-auto mb-1", isDark ? "text-stone-500" : "text-stone-400")} />
          ) : (
            <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-amber-600")}>
              {projectStats?.languageKeepersCount?.toLocaleString('ru-RU') ?? '—'}
            </p>
          )}
          <p className={cn("text-xs", isDark ? "text-stone-500" : "text-stone-500")}>хранителей</p>
        </div>
        <div className={cn("w-px h-10", isDark ? "bg-stone-700" : "bg-stone-200")} />
        <div className="text-center flex-1">
          {statsLoading ? (
            <Loader2 size={24} className={cn("animate-spin mx-auto mb-1", isDark ? "text-stone-500" : "text-stone-400")} />
          ) : (
            <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-amber-600")}>
              {projectStats?.categoriesCount?.toLocaleString('ru-RU') ?? '—'}
            </p>
          )}
          <p className={cn("text-xs", isDark ? "text-stone-500" : "text-stone-500")}>категорий</p>
        </div>
      </motion.div>

      {/* Ошибка присоединения */}
      <AnimatePresence>
        {joinError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "mb-4 p-3 rounded-xl border flex items-center gap-2",
              isDark 
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-red-50 border-red-200 text-red-600"
            )}
          >
            <AlertCircle size={18} />
            <span className="text-sm">{joinError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопка присоединения */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-auto"
      >
        <motion.button
          whileHover={{ scale: isJoining ? 1 : 1.02 }}
          whileTap={{ scale: isJoining ? 1 : 0.98 }}
          onClick={handleJoin}
          disabled={isJoining}
          className={cn(
            "w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500",
            "text-white font-bold text-lg shadow-xl shadow-orange-500/30",
            "hover:shadow-orange-500/50 transition-all relative overflow-hidden group",
            isJoining && "opacity-80 cursor-not-allowed"
          )}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isJoining ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Присоединяемся...
              </>
            ) : (
              <>
                <Heart size={20} />
                Стать Хранителем языка
              </>
            )}
          </span>
          {!isJoining && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.5 }}
            />
          )}
        </motion.button>
        
        <p className={cn("text-center text-xs mt-3", theme.text.dimmed)}>
          Присоединяясь, вы вносите вклад в сохранение культурного наследия 🙏
        </p>
      </motion.div>
    </motion.div>
  );
};


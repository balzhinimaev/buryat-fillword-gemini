// src/screens/LeaderboardScreen.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Clock, Crown, Filter, ArrowLeft } from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import type { GameStore } from '../store/gameStore';
import { categories, getCategoryById } from '../data/words';

interface LeaderboardScreenProps {
  store: GameStore;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ store }) => {
  const { state, navigate } = store;
  const { leaderboard } = state;
  const { theme, isDark } = useTheme();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Фильтрация по категории
  const filteredLeaderboard = selectedCategory
    ? leaderboard.filter(e => e.categoryId === selectedCategory)
    : leaderboard;

  // Сортировка по очкам
  const sortedLeaderboard = [...filteredLeaderboard].sort((a, b) => b.score - a.score);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'from-amber-400 to-yellow-500';
      case 1: return isDark ? 'from-slate-400 to-slate-500' : 'from-slate-300 to-slate-400';
      case 2: return 'from-amber-600 to-amber-700';
      default: return isDark ? 'from-stone-600 to-stone-700' : 'from-slate-100 to-slate-200';
    }
  };

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown size={18} className="text-amber-900" />;
      case 1: return <Medal size={18} className={isDark ? "text-slate-200" : "text-slate-600"} />;
      case 2: return <Medal size={18} className="text-amber-800" />;
      default: return <span className={cn("font-bold", theme.text.muted)}>{index + 1}</span>;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <div className={cn(theme.backgrounds.primaryGradient, "min-h-[100dvh] flex flex-col relative overflow-hidden")}>
      {/* Sticky Header при скролле */}
      <StickyHeader 
        title="Рекорды" 
        onBack={() => navigate('menu')}
        rightElement={<Trophy size={22} className={isDark ? "text-amber-400" : "text-amber-500"} />}
      />
      
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-amber-500/10 via-steppe-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className={cn(theme.header.bg, theme.header.text, "relative z-10 p-4 pb-6 rounded-b-3xl shadow-lg")}>
        <div className="flex items-center gap-4 mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('menu')}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={24} className={theme.header.text} />
          </motion.button>
          <h1 className="text-xl font-bold flex-1">Таблица рекордов</h1>
          <Trophy size={24} />
        </div>
        
        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Filter size={16} />
          <div className="flex-1 overflow-x-auto flex gap-2 pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                !selectedCategory
                  ? cn('bg-white/90', theme.text.accent)
                  : 'bg-white/20 text-white'
              )}
            >
              Все
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1',
                  selectedCategory === cat.id
                    ? cn('bg-white/90', theme.text.accent)
                    : 'bg-white/20 text-white'
                )}
              >
                <span>{cat.emoji}</span>
                <span className="hidden sm:inline">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 overflow-auto relative z-10">
        {sortedLeaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4", theme.backgrounds.card)}>
              <Trophy size={40} className={theme.text.muted} />
            </div>
            <h3 className={cn("text-lg font-semibold mb-2", theme.text.secondary)}>
              Пока нет рекордов
            </h3>
            <p className={theme.text.muted}>
              Сыграй несколько игр, чтобы попасть в таблицу!
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {sortedLeaderboard.slice(0, 50).map((entry, index) => {
                const category = getCategoryById(entry.categoryId);
                
                return (
                  <motion.div
                    key={`${entry.date}-${entry.score}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      theme.backgrounds.cardSolid,
                      'rounded-xl p-3 shadow-sm border',
                      theme.borders.subtle,
                      index < 3 && 'border-2',
                      index === 0 && 'border-amber-400',
                      index === 1 && (isDark ? 'border-slate-400' : 'border-slate-300'),
                      index === 2 && 'border-amber-600/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br',
                        getMedalColor(index)
                      )}>
                        {getMedalIcon(index)}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-semibold truncate", theme.text.primary)}>
                            {entry.playerName}
                          </span>
                          {category && (
                            <span className="text-sm" title={category.name}>
                              {category.emoji}
                            </span>
                          )}
                        </div>
                        <div className={cn("flex items-center gap-3 text-xs", theme.text.muted)}>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatTime(entry.time)}
                          </span>
                          <span>{formatDate(entry.date)}</span>
                        </div>
                      </div>
                      
                      {/* Score */}
                      <div className="text-right">
                        <div className={cn("text-xl font-bold", theme.text.accent)}>
                          {entry.score}
                        </div>
                        <div className={cn("text-xs", theme.text.muted)}>очков</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default LeaderboardScreen;


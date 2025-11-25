// src/screens/LeaderboardScreen.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Clock, Crown, Filter } from 'lucide-react';
import { BackButton, cn } from '../components/ui';
import type { GameStore } from '../store/gameStore';
import { categories, getCategoryById } from '../data/words';

interface LeaderboardScreenProps {
  store: GameStore;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ store }) => {
  const { state, navigate } = store;
  const { leaderboard } = state;
  
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
      case 1: return 'from-slate-300 to-slate-400';
      case 2: return 'from-amber-600 to-amber-700';
      default: return 'from-slate-100 to-slate-200';
    }
  };

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown size={18} className="text-amber-900" />;
      case 1: return <Medal size={18} className="text-slate-600" />;
      case 2: return <Medal size={18} className="text-amber-800" />;
      default: return <span className="text-slate-500 font-bold">{index + 1}</span>;
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
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <BackButton onClick={() => navigate('menu')} />
          <h1 className="text-xl font-bold flex-1">Таблица рекордов</h1>
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
                  ? 'bg-white text-amber-600'
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
                    ? 'bg-white text-amber-600'
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
      <main className="flex-1 p-4 overflow-auto">
        {sortedLeaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Trophy size={40} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              Пока нет рекордов
            </h3>
            <p className="text-slate-400">
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
                      'bg-white rounded-xl p-3 shadow-sm border border-slate-100',
                      index < 3 && 'border-2',
                      index === 0 && 'border-amber-300',
                      index === 1 && 'border-slate-300',
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
                          <span className="font-semibold text-slate-800 truncate">
                            {entry.playerName}
                          </span>
                          {category && (
                            <span className="text-sm" title={category.name}>
                              {category.emoji}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatTime(entry.time)}
                          </span>
                          <span>{formatDate(entry.date)}</span>
                        </div>
                      </div>
                      
                      {/* Score */}
                      <div className="text-right">
                        <div className="text-xl font-bold text-baikal-600">
                          {entry.score}
                        </div>
                        <div className="text-xs text-slate-400">очков</div>
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


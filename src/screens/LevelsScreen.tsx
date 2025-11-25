// src/screens/LevelsScreen.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { BackButton, CategoryCard, cn } from '../components/ui';
import type { GameStore } from '../store/gameStore';
import { categories } from '../data/words';

interface LevelsScreenProps {
  store: GameStore;
}

export const LevelsScreen: React.FC<LevelsScreenProps> = ({ store }) => {
  const { state, navigate, selectCategory, getLevelProgress, isLevelUnlocked } = store;

  const difficultyGroups = {
    easy: categories.filter(c => c.difficulty === 'easy'),
    medium: categories.filter(c => c.difficulty === 'medium'),
    hard: categories.filter(c => c.difficulty === 'hard'),
  };

  const groupLabels = {
    easy: { label: 'Начинающий', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    medium: { label: 'Продолжающий', color: 'text-amber-600', bg: 'bg-amber-50' },
    hard: { label: 'Эксперт', color: 'text-rose-600', bg: 'bg-rose-50' },
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-baikal-700 text-white p-4 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <BackButton onClick={() => navigate('menu')} />
          <h1 className="text-xl font-bold flex-1">Выбор категории</h1>
        </div>
        
        {/* Stars progress */}
        <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
          <div className="w-10 h-10 rounded-full bg-sun flex items-center justify-center">
            <Star size={20} className="text-baikal-900 fill-baikal-900" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-baikal-200 mb-1">Собрано звёзд</div>
            <div className="h-2 bg-baikal-900/30 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-sun"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (state.stats.totalStars / 36) * 100)}%` }}
              />
            </div>
          </div>
          <div className="text-2xl font-bold">{state.stats.totalStars}/36</div>
        </div>
      </header>

      {/* Categories list */}
      <main className="flex-1 p-4 overflow-auto">
        {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
          <div key={difficulty} className="mb-6">
            <div className={cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3',
              groupLabels[difficulty].bg
            )}>
              <span className={cn('font-semibold text-sm', groupLabels[difficulty].color)}>
                {groupLabels[difficulty].label}
              </span>
            </div>
            
            <div className="space-y-3">
              {difficultyGroups[difficulty].map((category, index) => {
                const progress = getLevelProgress(category.id);
                const unlocked = isLevelUnlocked(category.unlockRequirement);
                
                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <CategoryCard
                      emoji={category.emoji}
                      name={category.name}
                      description={category.description}
                      stars={progress?.stars || 0}
                      isLocked={!unlocked}
                      difficulty={category.difficulty}
                      onClick={() => selectCategory(category.id)}
                    />
                    {!unlocked && (
                      <div className="text-xs text-slate-400 text-center mt-1">
                        Нужно {category.unlockRequirement} ⭐ для разблокировки
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default LevelsScreen;


// src/screens/LevelsScreen.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Star, ArrowLeft, Layers } from 'lucide-react';
import { CategoryCard, cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import type { GameStore } from '../store/gameStore';
import { categories } from '../data/words';

interface LevelsScreenProps {
  store: GameStore;
}

export const LevelsScreen: React.FC<LevelsScreenProps> = ({ store }) => {
  const { state, navigate, selectCategory, getLevelProgress, isLevelUnlocked } = store;
  const { theme } = useTheme();

  const difficultyGroups = {
    easy: categories.filter(c => c.difficulty === 'easy'),
    medium: categories.filter(c => c.difficulty === 'medium'),
    hard: categories.filter(c => c.difficulty === 'hard'),
  };

  return (
    <div className={cn(theme.backgrounds.primaryGradient, "min-h-[100dvh] flex flex-col relative overflow-hidden")}>
      {/* Sticky Header при скролле */}
      <StickyHeader 
        title="Выбор категории" 
        onBack={() => navigate('menu')}
        rightElement={<Layers size={22} className={theme.text.accent} />}
      />
      
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-amber-500/10 via-steppe-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-terra-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className={cn(theme.header.bg, theme.header.text, "relative z-10 p-4 pb-6 rounded-b-3xl shadow-lg overflow-hidden")}>
        {/* Декоративный элемент */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('menu')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={24} className={theme.header.text} />
            </motion.button>
            <h1 className="text-xl font-bold flex-1">Выбор категории</h1>
            <Layers size={24} />
          </div>
          
          {/* Stars progress */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Star size={20} className="text-white fill-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-white/70 mb-1">Собрано звёзд</div>
              <div className={cn("h-2 rounded-full overflow-hidden", theme.progress.track)}>
                <motion.div 
                  className={theme.progress.fill.amber}
                  style={{ height: '100%' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (state.stats.totalStars / 36) * 100)}%` }}
                />
              </div>
            </div>
            <div className="text-2xl font-bold">
              <span className="text-amber-400">{state.stats.totalStars}</span>
              <span className="text-white/50">/36</span>
            </div>
          </div>
        </div>
      </header>

      {/* Categories list */}
      <main className="flex-1 p-4 overflow-auto relative z-10">
        {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
          <div key={difficulty} className="mb-6">
            <div className={cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3',
              theme.difficultyBadge[difficulty].bg
            )}>
              <span className={cn('font-semibold text-sm', theme.difficultyBadge[difficulty].text)}>
                {difficulty === 'easy' ? 'Начинающий' : difficulty === 'medium' ? 'Продолжающий' : 'Эксперт'}
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
                      <div className={cn("text-xs text-center mt-1", theme.text.muted)}>
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

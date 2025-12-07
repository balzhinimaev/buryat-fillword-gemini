// src/screens/DictionaryScreen.tsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Check, Volume2, ArrowLeft } from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import { categories, getAllWords } from '../data/words';

interface DictionaryScreenProps {
  store: GameStore;
}

export const DictionaryScreen: React.FC<DictionaryScreenProps> = ({ store }) => {
  const { state, navigate } = store;
  const { stats } = state;
  const { theme, isDark } = useTheme();
  
  useBackButton(() => navigate('menu'));
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showLearnedOnly, setShowLearnedOnly] = useState(false);

  const allWords = useMemo(() => getAllWords(), []);

  // Фильтрация слов
  const filteredWords = useMemo(() => {
    let words = selectedCategory
      ? categories.find(c => c.id === selectedCategory)?.words || []
      : allWords;

    if (showLearnedOnly) {
      words = words.filter(w => stats.learnedWords.includes(w.bur));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      words = words.filter(
        w => w.bur.toLowerCase().includes(query) || w.ru.toLowerCase().includes(query)
      );
    }

    return words;
  }, [allWords, selectedCategory, showLearnedOnly, searchQuery, stats.learnedWords]);

  // Группировка по категориям для отображения
  const wordsByCategory = useMemo(() => {
    if (selectedCategory) {
      return [{ 
        category: categories.find(c => c.id === selectedCategory)!, 
        words: filteredWords 
      }];
    }
    
    return categories.map(category => ({
      category,
      words: filteredWords.filter(w => category.words.some(cw => cw.bur === w.bur))
    })).filter(g => g.words.length > 0);
  }, [selectedCategory, filteredWords]);

  const speakWord = (word: string) => {
    // В будущем можно добавить озвучку через Web Speech API
    // Пока просто показываем подсказку
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'ru-RU'; // Бурятского нет, используем русский как fallback
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className={cn(theme.backgrounds.primaryGradient, "min-h-[100dvh] flex flex-col relative overflow-hidden")}>
      {/* Sticky Header при скролле */}
      <StickyHeader 
        title="Словарь" 
        onBack={() => navigate('menu')}
        rightElement={
          <div className={cn(
            "text-sm px-3 py-1 rounded-full flex items-center gap-1",
            isDark ? "bg-white/20 text-white" : "bg-black/10 text-stone-700"
          )}>
            <BookOpen size={14} />
            {stats.learnedWords.length}/{allWords.length}
          </div>
        }
      />
      
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-terra-500/10 via-steppe-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-terra-500/10 rounded-full blur-3xl" />
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
          <h1 className="text-xl font-bold flex-1">Словарь</h1>
          <div className="text-sm bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
            <BookOpen size={14} />
            {stats.learnedWords.length}/{allWords.length}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            placeholder="Поиск слова..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setShowLearnedOnly(!showLearnedOnly)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1',
              showLearnedOnly
                ? cn('bg-white/90', theme.text.accent)
                : 'bg-white/20 text-white'
            )}
          >
            <Check size={14} />
            Выученные
          </button>
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
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1',
                selectedCategory === cat.id
                  ? cn('bg-white/90', theme.text.accent)
                  : 'bg-white/20 text-white'
              )}
            >
              <span>{cat.emoji}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 overflow-auto relative z-10">
        {filteredWords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4", theme.backgrounds.card)}>
              <BookOpen size={40} className={theme.text.muted} />
            </div>
            <h3 className={cn("text-lg font-semibold mb-2", theme.text.secondary)}>
              Слов не найдено
            </h3>
            <p className={theme.text.muted}>
              Попробуйте изменить фильтры поиска
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {wordsByCategory.map(({ category, words }) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Category header */}
                {!selectedCategory && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{category.emoji}</span>
                    <span className={cn("font-semibold", theme.text.primary)}>{category.name}</span>
                    <span className={cn("text-sm", theme.text.muted)}>({words.length})</span>
                  </div>
                )}
                
                {/* Words list */}
                <div className="grid gap-2">
                  <AnimatePresence>
                    {words.map((word, index) => {
                      const isLearned = stats.learnedWords.includes(word.bur);
                      const findCount = stats.wordFindCounts[word.bur] || 0;
                      
                      return (
                        <motion.div
                          key={word.bur}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: index * 0.02 }}
                          className={cn(
                            theme.backgrounds.cardSolid,
                            'rounded-xl p-3 shadow-sm border-2 transition-all',
                            isLearned 
                              ? (isDark ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50/50')
                              : theme.borders.subtle
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {/* Status indicator */}
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center',
                              isLearned 
                                ? (isDark ? 'bg-emerald-500/20' : 'bg-emerald-100')
                                : (isDark ? 'bg-stone-700/50' : 'bg-slate-100')
                            )}>
                              {isLearned ? (
                                <Check size={20} className={isDark ? "text-emerald-400" : "text-emerald-600"} />
                              ) : (
                                <span className={cn("text-sm font-medium", theme.text.muted)}>
                                  {findCount}/3
                                </span>
                              )}
                            </div>
                            
                            {/* Word info */}
                            <div className="flex-1 min-w-0">
                              <div className={cn("font-bold text-lg", theme.text.primary)}>
                                {word.bur}
                              </div>
                              <div className={cn("text-sm", theme.text.secondary)}>
                                {word.ru}
                              </div>
                            </div>
                            
                            {/* Speak button */}
                            <button
                              onClick={() => speakWord(word.bur)}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                isDark 
                                  ? "bg-stone-700/50 hover:bg-stone-600/50" 
                                  : "bg-slate-100 hover:bg-slate-200"
                              )}
                              title="Произнести"
                            >
                              <Volume2 size={18} className={theme.text.muted} />
                            </button>
                          </div>
                          
                          {/* Progress bar */}
                          {!isLearned && findCount > 0 && (
                            <div className={cn("mt-2 h-1.5 rounded-full overflow-hidden", theme.progress.track)}>
                              <motion.div
                                className={theme.progress.fill.primary}
                                style={{ height: '100%' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(findCount / 3) * 100}%` }}
                              />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DictionaryScreen;


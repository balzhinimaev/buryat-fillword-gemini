// src/screens/DictionaryScreen.tsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Check, Filter, Volume2 } from 'lucide-react';
import { BackButton, cn } from '../components/ui';
import type { GameStore } from '../store/gameStore';
import { categories, getAllWords } from '../data/words';

interface DictionaryScreenProps {
  store: GameStore;
}

export const DictionaryScreen: React.FC<DictionaryScreenProps> = ({ store }) => {
  const { state, navigate } = store;
  const { stats } = state;
  
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
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-4 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <BackButton onClick={() => navigate('menu')} />
          <h1 className="text-xl font-bold flex-1">Словарь</h1>
          <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
            {stats.learnedWords.length}/{allWords.length}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
          <input
            type="text"
            placeholder="Поиск слова..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-purple-300 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setShowLearnedOnly(!showLearnedOnly)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1',
              showLearnedOnly
                ? 'bg-white text-purple-600'
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
                ? 'bg-white text-purple-600'
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
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white'
              )}
            >
              <span>{cat.emoji}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 overflow-auto">
        {filteredWords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen size={40} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              Слов не найдено
            </h3>
            <p className="text-slate-400">
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
                    <span className="font-semibold text-slate-700">{category.name}</span>
                    <span className="text-sm text-slate-400">({words.length})</span>
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
                            'bg-white rounded-xl p-3 shadow-sm border-2 transition-all',
                            isLearned 
                              ? 'border-emerald-200 bg-emerald-50/50' 
                              : 'border-slate-100'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {/* Status indicator */}
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center',
                              isLearned 
                                ? 'bg-emerald-100' 
                                : 'bg-slate-100'
                            )}>
                              {isLearned ? (
                                <Check size={20} className="text-emerald-600" />
                              ) : (
                                <span className="text-slate-400 text-sm font-medium">
                                  {findCount}/3
                                </span>
                              )}
                            </div>
                            
                            {/* Word info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-lg text-slate-800">
                                {word.bur}
                              </div>
                              <div className="text-sm text-slate-500">
                                {word.ru}
                              </div>
                            </div>
                            
                            {/* Speak button */}
                            <button
                              onClick={() => speakWord(word.bur)}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                              title="Произнести"
                            >
                              <Volume2 size={18} className="text-slate-500" />
                            </button>
                          </div>
                          
                          {/* Progress bar */}
                          {!isLearned && findCount > 0 && (
                            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-baikal-400 to-baikal-500"
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


// src/screens/StatsScreen.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Clock, 
  Target, 
  Flame, 
  Trophy,
  BookOpen,
  TrendingUp,
  Calendar,
  Star
} from 'lucide-react';
import { BackButton, StatCard, XPBar } from '../components/ui';
import type { GameStore } from '../store/gameStore';
import { categories, getAllWords } from '../data/words';

interface StatsScreenProps {
  store: GameStore;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ store }) => {
  const { state, navigate, xpProgress, xpToNextLevel } = store;
  const { stats, levelProgress } = state;

  // Форматирование времени
  const formatPlayTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} сек`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours} ч ${mins} м`;
  };

  // Расчёт процента выученных слов
  const allWords = getAllWords();
  const learnedPercent = Math.round((stats.learnedWords.length / allWords.length) * 100);

  // Количество пройденных уровней
  const completedLevels = Object.values(levelProgress).filter(p => p.completed).length;
  const totalLevels = categories.length;

  // Достижения
  const achievements = [
    { 
      id: 'first_word', 
      name: 'Первое слово', 
      icon: '🎯', 
      condition: stats.totalWordsFound >= 1,
      description: 'Найти первое слово'
    },
    { 
      id: 'ten_words', 
      name: 'Десятка', 
      icon: '🔟', 
      condition: stats.totalWordsFound >= 10,
      description: 'Найти 10 слов'
    },
    { 
      id: 'fifty_words', 
      name: 'Полтинник', 
      icon: '5️⃣0️⃣', 
      condition: stats.totalWordsFound >= 50,
      description: 'Найти 50 слов'
    },
    { 
      id: 'hundred_words', 
      name: 'Сотня', 
      icon: '💯', 
      condition: stats.totalWordsFound >= 100,
      description: 'Найти 100 слов'
    },
    { 
      id: 'first_level', 
      name: 'Первая победа', 
      icon: '🏆', 
      condition: completedLevels >= 1,
      description: 'Пройти первый уровень'
    },
    { 
      id: 'streak_3', 
      name: 'Три дня подряд', 
      icon: '🔥', 
      condition: stats.longestStreak >= 3,
      description: 'Играть 3 дня подряд'
    },
    { 
      id: 'streak_7', 
      name: 'Неделя!', 
      icon: '📅', 
      condition: stats.longestStreak >= 7,
      description: 'Играть 7 дней подряд'
    },
    { 
      id: 'learned_10', 
      name: 'Ученик', 
      icon: '📚', 
      condition: stats.learnedWords.length >= 10,
      description: 'Выучить 10 слов'
    },
    { 
      id: 'all_stars', 
      name: 'Коллекционер', 
      icon: '⭐', 
      condition: stats.totalStars >= 36,
      description: 'Собрать все звёзды'
    },
    { 
      id: 'level_5', 
      name: 'Прокачанный', 
      icon: '⬆️', 
      condition: stats.level >= 5,
      description: 'Достигнуть 5 уровня'
    },
  ];

  const unlockedAchievements = achievements.filter(a => a.condition);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <BackButton onClick={() => navigate('menu')} />
          <h1 className="text-xl font-bold flex-1">Статистика</h1>
        </div>
        
        {/* XP Bar */}
        <div className="bg-white rounded-xl p-3">
          <XPBar 
            level={stats.level} 
            progress={xpProgress} 
            xpToNext={xpToNextLevel} 
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 space-y-4 overflow-auto">
        {/* Main stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <StatCard
            icon={<Target size={18} className="text-baikal-500" />}
            label="Слов найдено"
            value={stats.totalWordsFound}
            color="bg-baikal-50"
          />
          <StatCard
            icon={<Clock size={18} className="text-purple-500" />}
            label="Время в игре"
            value={formatPlayTime(stats.totalTimePlayed)}
            color="bg-purple-50"
          />
          <StatCard
            icon={<Flame size={18} className="text-orange-500" />}
            label="Серия дней"
            value={stats.currentStreak}
            subValue={`Рекорд: ${stats.longestStreak}`}
            color="bg-orange-50"
          />
          <StatCard
            icon={<BarChart3 size={18} className="text-emerald-500" />}
            label="Игр сыграно"
            value={stats.totalGamesPlayed}
            color="bg-emerald-50"
          />
        </motion.div>

        {/* Progress section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
        >
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-baikal-500" />
            Прогресс обучения
          </h3>
          
          <div className="space-y-4">
            {/* Words learned */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Выученные слова</span>
                <span className="font-medium">{stats.learnedWords.length}/{allWords.length}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${learnedPercent}%` }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Слово считается выученным после 3 находок
              </p>
            </div>

            {/* Levels completed */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Пройдено уровней</span>
                <span className="font-medium">{completedLevels}/{totalLevels}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-baikal-400 to-baikal-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedLevels / totalLevels) * 100}%` }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                />
              </div>
            </div>

            {/* Stars */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Собрано звёзд</span>
                <span className="font-medium">{stats.totalStars}/36</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-sun to-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.totalStars / 36) * 100}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
        >
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            Достижения ({unlockedAchievements.length}/{achievements.length})
          </h3>
          
          <div className="grid grid-cols-5 gap-2">
            {achievements.map((achievement) => (
              <motion.div
                key={achievement.id}
                whileHover={{ scale: 1.1 }}
                className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${
                  achievement.condition
                    ? 'bg-gradient-to-br from-amber-100 to-amber-200 shadow-sm'
                    : 'bg-slate-100 grayscale opacity-40'
                }`}
                title={`${achievement.name}: ${achievement.description}`}
              >
                {achievement.icon}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Category Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
        >
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-purple-500" />
            По категориям
          </h3>
          
          <div className="space-y-2 max-h-48 overflow-auto">
            {categories.map((category) => {
              const progress = levelProgress[category.id];
              return (
                <div 
                  key={category.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-slate-50"
                >
                  <span className="text-xl">{category.emoji}</span>
                  <span className="flex-1 text-sm text-slate-600 truncate">{category.name}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={
                          progress && progress.stars >= star
                            ? 'fill-sun text-sun'
                            : 'fill-transparent text-slate-300'
                        }
                      />
                    ))}
                  </div>
                  {progress?.bestTime && (
                    <span className="text-xs text-slate-400">
                      {Math.floor(progress.bestTime / 60)}:{(progress.bestTime % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default StatsScreen;


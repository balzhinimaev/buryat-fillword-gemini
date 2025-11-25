// src/screens/MainMenu.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Settings, 
  BarChart3, 
  Trophy, 
  BookOpen,
  Flame 
} from 'lucide-react';
import { MenuButton, XPBar } from '../components/ui';
import type { GameStore } from '../store/gameStore';

interface MainMenuProps {
  store: GameStore;
}

export const MainMenu: React.FC<MainMenuProps> = ({ store }) => {
  const { state, navigate, xpProgress, xpToNextLevel } = store;
  const { stats } = state;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-baikal-700 via-baikal-600 to-baikal-800 flex flex-col">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-64 h-64 bg-sun/20 rounded-full blur-3xl" />
        <div className="absolute bottom-40 -right-20 w-80 h-80 bg-baikal-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Header with logo */}
      <header className="relative pt-12 pb-8 px-6 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-sun to-amber-400 rounded-3xl shadow-2xl flex items-center justify-center"
        >
          <span className="text-5xl">ᠪ</span>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Бурятский
        </motion.h1>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-baikal-200"
        >
          Филлворд
        </motion.h2>
      </header>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mx-6 mb-6 p-4 bg-white/10 backdrop-blur-sm rounded-2xl"
      >
        <div className="flex items-center justify-between text-white mb-3">
          <div className="flex items-center gap-2">
            <Flame className="text-orange-400" size={20} />
            <span className="font-medium">
              {stats.currentStreak} {stats.currentStreak === 1 ? 'день' : 'дней'} подряд
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="text-sun" size={18} />
            <span className="font-bold">{stats.totalStars}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-3">
          <XPBar 
            level={stats.level} 
            progress={xpProgress} 
            xpToNext={xpToNextLevel} 
          />
        </div>
      </motion.div>

      {/* Main content */}
      <main className="flex-1 px-6 pb-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <MenuButton
            icon={<Play size={24} className="text-baikal-600" />}
            label="Играть"
            sublabel={`${stats.learnedWords.length} слов выучено`}
            onClick={() => navigate('levels')}
            variant="primary"
          />

          <div className="grid grid-cols-2 gap-3">
            <MenuButton
              icon={<BarChart3 size={22} className="text-emerald-500" />}
              label="Статистика"
              onClick={() => navigate('stats')}
            />
            <MenuButton
              icon={<Trophy size={22} className="text-amber-500" />}
              label="Рекорды"
              onClick={() => navigate('leaderboard')}
            />
          </div>

          <MenuButton
            icon={<BookOpen size={22} className="text-purple-500" />}
            label="Словарь"
            sublabel={`${stats.learnedWords.length} из ${getAllWordsCount()} слов`}
            onClick={() => navigate('dictionary')}
          />

          <MenuButton
            icon={<Settings size={22} className="text-slate-500" />}
            label="Настройки"
            onClick={() => navigate('settings')}
            variant="outline"
          />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-baikal-300 text-sm">
        <p>Изучай бурятский язык играя!</p>
      </footer>
    </div>
  );
};

// Helper function
function getAllWordsCount(): number {
  // Simplified count - will be replaced with actual count from data
  return 95;
}

export default MainMenu;


// src/screens/MainMenu.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Settings, 
  BarChart3, 
  Trophy, 
  BookOpen,
  Flame,
  Bug,
  Sparkles,
  Star,
  HelpCircle,
  Heart
} from 'lucide-react';
import type { GameStore } from '../store/gameStore';

interface MainMenuProps {
  store: GameStore;
}

// Декоративный элемент - традиционный орнамент
const Ornament: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 20" className={className}>
    <path
      d="M0 10 L15 10 L20 5 L25 10 L35 10 L40 15 L45 10 L55 10 L60 5 L65 10 L75 10 L80 15 L85 10 L100 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Сетка филлворда для шапки - бурятские слова горизонтально
// НАРАН (солнце), УҺАН (вода), МОДОН (дерево), ТЭНГЭРИ (небо), ГАЗАР (земля)
type CellType = { letter: string; highlighted: 1 | 2 | false };
const STATIC_GRID: CellType[][] = [
  // 15 столбцов x 8 строк
  [{ letter: 'А', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'Н', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'Р', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'Н', highlighted: 1 }, { letter: 'Е', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Р', highlighted: false }],
  [{ letter: 'Р', highlighted: false }, { letter: 'Ү', highlighted: false }, { letter: 'М', highlighted: false }, { letter: 'Т', highlighted: false }, { letter: 'О', highlighted: false }, { letter: 'Л', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'А', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'И', highlighted: false }, { letter: 'Ц', highlighted: false }],
  [{ letter: 'У', highlighted: 2 }, { letter: 'Һ', highlighted: 2 }, { letter: 'А', highlighted: 2 }, { letter: 'Н', highlighted: 2 }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'А', highlighted: false }, { letter: 'В', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'Ж', highlighted: false }, { letter: 'М', highlighted: 1 }, { letter: 'О', highlighted: 1 }, { letter: 'Д', highlighted: 1 }, { letter: 'О', highlighted: 1 }, { letter: 'Н', highlighted: 1 }],
  [{ letter: 'О', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Э', highlighted: false }, { letter: 'Ь', highlighted: false }, { letter: 'Ы', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Й', highlighted: false }, { letter: 'З', highlighted: false }, { letter: 'Ч', highlighted: false }, { letter: 'У', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Р', highlighted: false }],
  [{ letter: 'Х', highlighted: false }, { letter: 'Т', highlighted: 2 }, { letter: 'Э', highlighted: 2 }, { letter: 'Н', highlighted: 2 }, { letter: 'Г', highlighted: 2 }, { letter: 'Э', highlighted: 2 }, { letter: 'Р', highlighted: 2 }, { letter: 'И', highlighted: 2 }, { letter: 'Д', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'Ж', highlighted: false }, { letter: 'И', highlighted: false }, { letter: 'Ц', highlighted: false }, { letter: 'У', highlighted: false }, { letter: 'А', highlighted: false }],
  [{ letter: 'Р', highlighted: false }, { letter: 'Ү', highlighted: false }, { letter: 'М', highlighted: false }, { letter: 'Т', highlighted: false }, { letter: 'О', highlighted: false }, { letter: 'Л', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'А', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Г', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'З', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'Р', highlighted: 1 }, { letter: 'Н', highlighted: false }],
  [{ letter: 'А', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ү', highlighted: false }, { letter: 'М', highlighted: false }, { letter: 'Т', highlighted: false }, { letter: 'О', highlighted: false }],
  [{ letter: 'О', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Э', highlighted: false }, { letter: 'Ь', highlighted: false }, { letter: 'Ы', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Й', highlighted: false }, { letter: 'З', highlighted: false }, { letter: 'Ч', highlighted: false }, { letter: 'У', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'А', highlighted: false }],
];

// Header компонент с сеткой филлворда как фон
const FillwordHeader: React.FC = () => {
  const cellSize = 24; // чуть больше ячейки
  const gap = 3;
  const cols = 15;
  
  // Цвета для двух типов выделения
  const getHighlightStyle = (highlighted: 1 | 2 | false) => {
    if (highlighted === 1) return 'bg-emerald-500/50 text-emerald-200/90'; // зелёный
    if (highlighted === 2) return 'bg-sky-500/50 text-sky-200/90'; // голубой
    return 'bg-stone-800/50 text-stone-600/60';
  };
  
  return (
    <header className="relative w-full overflow-hidden pt-12 pb-16">
      {/* Сетка филлворда - фоновый слой на всю ширину */}
      <div className="absolute inset-0 flex justify-center items-start pt-6 opacity-60">
        <div 
          className="relative w-full flex justify-center"
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
              gap: `${gap}px`,
            }}
          >
            {STATIC_GRID.flat().map((cell, index) => {
              const row = Math.floor(index / cols);
              const col = index % cols;
              
              return (
                <motion.div
                  key={`${row}-${col}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ 
                    delay: (row * 0.02) + (col * 0.01),
                    duration: 0.2
                  }}
                  className={`
                    flex items-center justify-center rounded font-semibold text-[10px]
                    ${getHighlightStyle(cell.highlighted)}
                  `}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {cell.letter}
                </motion.div>
              );
            })}
          </div>
        </div>
        
        {/* Виньетка - затемнение по краям */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 90% 80% at 50% 40%, 
                transparent 0%, 
                transparent 30%, 
                rgba(28, 25, 23, 0.3) 50%, 
                rgba(28, 25, 23, 0.7) 70%,
                rgba(28, 25, 23, 0.95) 100%
              )
            `
          }}
        />
      </div>
      
      {/* Плавный градиент перехода к основному фону */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(28, 25, 23, 0.5) 40%, rgb(28, 25, 23) 100%)'
        }}
      />
    </header>
  );
};

// Заголовок приложения - отдельный компонент под шапкой
const AppTitle: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="text-center py-4"
  >
    <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
      Бурятский
    </h1>
    <div className="flex items-center justify-center gap-3">
      <Ornament className="w-12 h-4 text-amber-500/60" />
      <h2 className="text-xl font-semibold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
        Филлворд
      </h2>
      <Ornament className="w-12 h-4 text-amber-500/60 scale-x-[-1]" />
    </div>
  </motion.div>
);

export const MainMenu: React.FC<MainMenuProps> = ({ store }) => {
  const { state, navigate, xpProgress, xpToNextLevel } = store;
  const { stats } = state;

  const menuItems = [
    {
      id: 'play',
      icon: Play,
      label: 'Играть',
      sublabel: `${stats.learnedWords.length} слов выучено`,
      onClick: () => navigate('levels'),
      gradient: 'from-amber-500 via-orange-500 to-terra-500',
      iconColor: 'text-white',
      primary: true,
    },
    {
      id: 'stats',
      icon: BarChart3,
      label: 'Статистика',
      onClick: () => navigate('stats'),
      color: 'bg-meadow-500/10',
      iconColor: 'text-meadow-600',
    },
    {
      id: 'leaderboard',
      icon: Trophy,
      label: 'Рекорды',
      onClick: () => navigate('leaderboard'),
      color: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
    },
    {
      id: 'dictionary',
      icon: BookOpen,
      label: 'Словарь',
      sublabel: `${stats.learnedWords.length} из ${getAllWordsCount()} слов`,
      onClick: () => navigate('dictionary'),
      color: 'bg-terra-500/10',
      iconColor: 'text-terra-600',
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Настройки',
      onClick: () => navigate('settings'),
      color: 'bg-stone-500/10',
      iconColor: 'text-stone-500',
      outline: true,
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-stone-900 flex flex-col relative overflow-hidden">
      {/* Плавающие кнопки справа сверху (отключено) */}
      {/* <FloatingButtons /> */}
      
      {/* Декоративный фон — тонкий паттерн букв */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Лёгкие световые акценты (приглушённые) */}
        <div className="absolute top-1/2 -left-32 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl" />
        
        {/* Тонкий паттерн сетки — продолжение темы филлворда */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `
              linear-gradient(to right, #57534e 1px, transparent 1px),
              linear-gradient(to bottom, #57534e 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px'
          }} 
        />
      </div>

      {/* Header с сеткой филлворда */}
      <FillwordHeader />
      
      {/* Заголовок под шапкой */}
      <AppTitle />

      {/* Stats card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mx-5 mb-5"
      >
        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-stone-800/80 to-stone-900/80 backdrop-blur-sm border border-stone-700/50 overflow-hidden">
          {/* Декоративный акцент */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
          
          <div className="relative z-10">
            {/* Streak и звёзды */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-terra-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Flame className="text-white" size={20} />
                </div>
                <div>
                  <div className="text-xs text-stone-400">Серия</div>
                  <div className="text-white font-bold">
                    {stats.currentStreak} {getDaysWord(stats.currentStreak)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-xs text-stone-400 text-right">Всего звёзд</div>
                  <div className="text-amber-400 font-bold text-right flex items-center gap-1 justify-end">
                    <Star size={16} className="fill-amber-400" />
                    {stats.totalStars}
                  </div>
                </div>
              </div>
            </div>
            
            {/* XP прогресс */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-steppe-500 to-steppe-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-steppe-500/20">
                {stats.level}
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-stone-300">Уровень {stats.level}</span>
                  <span className="text-stone-500">{xpToNextLevel} XP</span>
                </div>
                <div className="h-2.5 bg-stone-700/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-steppe-500 via-amber-500 to-steppe-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress * 100}%` }}
                    transition={{ type: 'spring', stiffness: 50 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Menu buttons */}
      <main className="flex-1 px-5 pb-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          {/* Главная кнопка "Играть" */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={menuItems[0].onClick}
            className="relative w-full p-5 rounded-2xl overflow-hidden group"
          >
            {/* Градиентный фон */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-terra-500 transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-terra-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Блик */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
            
            {/* Декоративные искры */}
            <Sparkles className="absolute top-3 right-3 text-white/30" size={20} />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <Play size={28} className="text-white ml-1" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-xl text-white">Играть</div>
                <div className="text-sm text-white/70">{stats.learnedWords.length} слов выучено</div>
              </div>
            </div>
          </motion.button>

          {/* Статистика и Рекорды */}
          <div className="grid grid-cols-2 gap-3">
            {menuItems.slice(1, 3).map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={item.onClick}
                className="p-4 rounded-2xl bg-stone-800/60 backdrop-blur-sm border border-stone-700/50 hover:border-stone-600/50 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  <item.icon size={22} className={item.iconColor} />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">{item.label}</div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Словарь */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={menuItems[3].onClick}
            className="w-full p-4 rounded-2xl bg-stone-800/60 backdrop-blur-sm border border-stone-700/50 hover:border-stone-600/50 transition-all flex items-center gap-4 group"
          >
            <div className={`w-12 h-12 rounded-xl ${menuItems[3].color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <BookOpen size={22} className={menuItems[3].iconColor} />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-white">{menuItems[3].label}</div>
              <div className="text-sm text-stone-400">{menuItems[3].sublabel}</div>
            </div>
          </motion.button>

          {/* Настройки */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={menuItems[4].onClick}
            className="w-full p-4 rounded-2xl border-2 border-stone-700/50 hover:border-stone-600 transition-all flex items-center gap-4 group"
          >
            <div className={`w-12 h-12 rounded-xl ${menuItems[4].color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <Settings size={22} className={menuItems[4].iconColor} />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-stone-300">{menuItems[4].label}</div>
            </div>
          </motion.button>

          {/* Үгын Дархан - Словарная мастерская - ЯРКАЯ КНОПКА */}
          <motion.button
            onClick={() => navigate('contribute')}
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            className="relative w-full p-4 rounded-2xl overflow-hidden flex items-center gap-4 group cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {/* Анимированный градиентный фон */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500"
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: 'linear'
              }}
              style={{ backgroundSize: '200% 200%' }}
            />
            
            {/* Блик сверху */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
            
            {/* Пульсирующее свечение */}
            <motion.div 
              className="absolute inset-0 rounded-2xl"
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(244, 63, 94, 0.4), 0 0 40px rgba(244, 63, 94, 0.2)',
                  '0 0 35px rgba(244, 63, 94, 0.6), 0 0 70px rgba(244, 63, 94, 0.3)',
                  '0 0 20px rgba(244, 63, 94, 0.4), 0 0 40px rgba(244, 63, 94, 0.2)',
                ]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
            
            {/* Иконка с анимацией пульсации */}
            <motion.div 
              className="relative z-10 w-14 h-14 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center"
              animate={{ 
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <Heart size={28} className="text-white fill-white/50" />
            </motion.div>
            
            <div className="relative z-10 text-left flex-1">
              <div className="font-bold text-lg text-white flex items-center gap-2">
                Үгын Дархан
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                >
                  ✨
                </motion.span>
              </div>
              <div className="text-sm text-white/90">Помоги сохранить бурятский язык!</div>
            </div>
            
            {/* Стрелка */}
            <motion.div 
              className="relative z-10 text-white font-bold text-xl"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.div>
          </motion.button>

          {/* Вопросы и ответы */}
          <motion.a
            href="https://t.me/buryat_words"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 rounded-2xl bg-stone-800/60 backdrop-blur-sm border border-stone-700/50 
                       hover:border-violet-500/50 transition-all flex items-center gap-4 group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center 
                            group-hover:scale-110 transition-transform">
              <HelpCircle size={22} className="text-violet-400" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-white">Вопросы и ответы</div>
              <div className="text-sm text-stone-400">Telegram: @buryat_words</div>
            </div>
          </motion.a>

          {/* Debug (мелким текстом) */}
          <motion.button
            whileHover={{ opacity: 0.8 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('debug')}
            className="w-full py-2 text-stone-600 text-sm hover:text-stone-500 transition-colors flex items-center justify-center gap-2"
          >
            <Bug size={14} />
            Debug Grid
          </motion.button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center">
        <p className="text-stone-500 text-sm">Изучай бурятский язык играя! ✨</p>
      </footer>
    </div>
  );
};

// Helper functions
function getAllWordsCount(): number {
  return 95;
}

function getDaysWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'дней';
  if (lastDigit === 1) return 'день';
  if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
  return 'дней';
}

export default MainMenu;

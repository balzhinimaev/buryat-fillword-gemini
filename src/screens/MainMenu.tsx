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
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { cn } from '../components/ui';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';

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

// Сетка филлворда для шапки
type CellType = { letter: string; highlighted: 1 | 2 | false };
const STATIC_GRID: CellType[][] = [
  [{ letter: 'А', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'Н', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'Р', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'Н', highlighted: 1 }, { letter: 'Е', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Р', highlighted: false }],
  [{ letter: 'Р', highlighted: false }, { letter: 'Ү', highlighted: false }, { letter: 'М', highlighted: false }, { letter: 'Т', highlighted: false }, { letter: 'О', highlighted: false }, { letter: 'Л', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'А', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'И', highlighted: false }, { letter: 'Ц', highlighted: false }],
  [{ letter: 'У', highlighted: 2 }, { letter: 'Һ', highlighted: 2 }, { letter: 'А', highlighted: 2 }, { letter: 'Н', highlighted: 2 }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'А', highlighted: false }, { letter: 'В', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'Ж', highlighted: false }, { letter: 'М', highlighted: 1 }, { letter: 'О', highlighted: 1 }, { letter: 'Д', highlighted: 1 }, { letter: 'О', highlighted: 1 }, { letter: 'Н', highlighted: 1 }],
  [{ letter: 'О', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Э', highlighted: false }, { letter: 'Ь', highlighted: false }, { letter: 'Ы', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Й', highlighted: false }, { letter: 'З', highlighted: false }, { letter: 'Ч', highlighted: false }, { letter: 'У', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Р', highlighted: false }],
  [{ letter: 'Х', highlighted: false }, { letter: 'Т', highlighted: 2 }, { letter: 'Э', highlighted: 2 }, { letter: 'Н', highlighted: 2 }, { letter: 'Г', highlighted: 2 }, { letter: 'Э', highlighted: 2 }, { letter: 'Р', highlighted: 2 }, { letter: 'И', highlighted: 2 }, { letter: 'Д', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'Ж', highlighted: false }, { letter: 'И', highlighted: false }, { letter: 'Ц', highlighted: false }, { letter: 'У', highlighted: false }, { letter: 'А', highlighted: false }],
  [{ letter: 'Р', highlighted: false }, { letter: 'Ү', highlighted: false }, { letter: 'М', highlighted: false }, { letter: 'Т', highlighted: false }, { letter: 'О', highlighted: false }, { letter: 'Л', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'А', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Г', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'З', highlighted: 1 }, { letter: 'А', highlighted: 1 }, { letter: 'Р', highlighted: 1 }, { letter: 'Н', highlighted: false }],
  [{ letter: 'А', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Х', highlighted: false }, { letter: 'Д', highlighted: false }, { letter: 'Е', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ү', highlighted: false }, { letter: 'М', highlighted: false }, { letter: 'Т', highlighted: false }, { letter: 'О', highlighted: false }],
  [{ letter: 'О', highlighted: false }, { letter: 'Н', highlighted: false }, { letter: 'Э', highlighted: false }, { letter: 'Ь', highlighted: false }, { letter: 'Ы', highlighted: false }, { letter: 'Ө', highlighted: false }, { letter: 'Й', highlighted: false }, { letter: 'З', highlighted: false }, { letter: 'Ч', highlighted: false }, { letter: 'У', highlighted: false }, { letter: 'Р', highlighted: false }, { letter: 'Ш', highlighted: false }, { letter: 'К', highlighted: false }, { letter: 'Б', highlighted: false }, { letter: 'А', highlighted: false }],
];

// Header с сеткой филлворда
const FillwordHeader: React.FC<{ styles: ReturnType<typeof getMenuStyles>; isDark: boolean }> = ({ styles, isDark }) => {
  const cellSize = 24;
  const gap = 3;
  const cols = 15;
  
  const getHighlightStyle = (highlighted: 1 | 2 | false) => {
    if (highlighted === 1) return styles.fillwordGrid.highlight1;
    if (highlighted === 2) return styles.fillwordGrid.highlight2;
    return styles.fillwordGrid.default;
  };
  
  return (
    <header className="relative w-full overflow-hidden pt-12 pb-16">
      <div className={cn("absolute inset-0 flex justify-center items-start pt-6", isDark ? "opacity-60" : "opacity-80")}>
        <div className="relative w-full flex justify-center">
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
                  className={cn(
                    "flex items-center justify-center rounded font-semibold text-[10px]",
                    getHighlightStyle(cell.highlighted)
                  )}
                  style={{ width: cellSize, height: cellSize }}
                >
                  {cell.letter}
                </motion.div>
              );
            })}
          </div>
        </div>
        
        {/* Виньетка */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 90% 80% at 50% 40%, 
                transparent 0%, 
                transparent 30%, 
                ${styles.fillwordGrid.vignette}33 50%, 
                ${styles.fillwordGrid.vignette}b3 70%,
                ${styles.fillwordGrid.vignette}f2 100%
              )
            `
          }}
        />
      </div>
      
      {/* Градиент перехода */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, ${styles.fillwordGrid.bottomFade}80 40%, ${styles.fillwordGrid.bottomFade} 100%)`
        }}
      />
    </header>
  );
};

// Заголовок
const AppTitle: React.FC<{ styles: ReturnType<typeof getMenuStyles> }> = ({ styles }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="text-center py-4"
  >
    <h1 className={cn("text-3xl font-bold mb-1 tracking-tight", styles.title.primary)}>
      Бурятский
    </h1>
    <div className="flex items-center justify-center gap-3">
      <Ornament className={cn("w-12 h-4", styles.title.ornament)} />
      <h2 className={cn("text-xl font-semibold", styles.title.secondary)}>
        Филлворд
      </h2>
      <Ornament className={cn("w-12 h-4 scale-x-[-1]", styles.title.ornament)} />
    </div>
  </motion.div>
);

export const MainMenu: React.FC<MainMenuProps> = ({ store }) => {
  const { state, navigate, xpProgress, xpToNextLevel } = store;
  const { stats } = state;
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);
  const { openLink } = useTelegram();
  const { state: authState } = useAuth();
  const isAdmin = authState.user?.role === 'admin';

  // Streak — берём из бэка или fallback на локальное
  const currentStreak = authState.user?.streak?.current ?? stats.currentStreak;

  // XP/Level — берём из бэка или fallback на локальное
  const backendXp = authState.user?.xp;
  const displayLevel = backendXp?.level ?? stats.level;
  const displayXpProgress = backendXp
    ? backendXp.progressPercent / 100
    : xpProgress;
  const displayXpToNextLevel = backendXp?.xpToNextLevel ?? xpToNextLevel;

  // Звёзды кампании — берём из бэка или локальное
  const displayTotalStars = authState.user?.campaignStats?.totalStars ?? stats.totalStars;

  return (
    <div className={cn("min-h-[100dvh] flex flex-col relative overflow-hidden", styles.pageGradient)}>
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn("absolute top-1/2 -left-32 w-64 h-64 rounded-full blur-3xl", styles.decorativeOrbs.primary)} />
        <div className={cn("absolute bottom-1/3 -right-32 w-80 h-80 rounded-full blur-3xl", styles.decorativeOrbs.secondary)} />
        
        {/* Сетка */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `
              linear-gradient(to right, ${styles.gridPattern} 1px, transparent 1px),
              linear-gradient(to bottom, ${styles.gridPattern} 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px'
          }} 
        />
      </div>

      {/* Header */}
      <FillwordHeader styles={styles} isDark={isDark} />
      
      {/* Заголовок */}
      <AppTitle styles={styles} />

      {/* Stats card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mx-5 mb-5"
      >
        <div className={cn(
          "relative p-4 rounded-2xl border overflow-hidden",
          styles.statsCard.background,
          styles.statsCard.border
        )}>
          {/* Декор */}
          <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-bl-full", styles.statsCard.accent)} />
          
          <div className="relative z-10">
            {/* Streak и звёзды */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", styles.statsCard.streakIcon)}>
                  <Flame className="text-white" size={20} />
                </div>
                <div>
                  <div className={cn("text-xs", styles.statsCard.text.secondary)}>Серия</div>
                  <div className={cn("font-bold", styles.statsCard.text.primary)}>
                    {currentStreak} {getDaysWord(currentStreak)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div>
                  <div className={cn("text-xs text-right", styles.statsCard.text.secondary)}>Всего звёзд</div>
                  <div className={cn("font-bold text-right flex items-center gap-1 justify-end", styles.statsCard.text.accent)}>
                    <Star size={16} className="fill-current" />
                    {displayTotalStars}
                  </div>
                </div>
              </div>
            </div>
            
            {/* XP прогресс */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
                styles.statsCard.levelBadge
              )}>
                {displayLevel}
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className={cn("font-medium", styles.statsCard.text.primary)}>Уровень {displayLevel}</span>
                  <span className={styles.statsCard.text.secondary}>{displayXpToNextLevel} XP</span>
                </div>
                <div className={cn("h-2.5 rounded-full overflow-hidden", styles.statsCard.progressTrack)}>
                  <motion.div
                    className={cn("h-full rounded-full", styles.statsCard.progressFill)}
                    initial={{ width: 0 }}
                    animate={{ width: `${displayXpProgress * 100}%` }}
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
            onClick={() => navigate(state.settings.hasSeenHowTo ? 'gameMode' : 'howto')}
            className="relative w-full p-5 rounded-2xl overflow-hidden group"
          >
            <div className={cn("absolute inset-0 transition-all duration-300", styles.buttons.play.gradient)} />
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300", styles.buttons.play.gradientHover)} />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
            <Sparkles className="absolute top-3 right-3 text-white/30" size={20} />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className={cn("w-14 h-14 rounded-xl backdrop-blur-sm flex items-center justify-center shadow-inner", styles.buttons.play.iconBg)}>
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
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('stats')}
              className={cn(
                "p-4 rounded-2xl border transition-all group",
                styles.buttons.card.background,
                styles.buttons.card.border,
                styles.buttons.card.borderHover
              )}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", styles.buttons.iconColors.stats.bg)}>
                <BarChart3 size={22} className={styles.buttons.iconColors.stats.icon} />
              </div>
              <div className="text-left">
                <div className={cn("font-semibold", styles.buttons.text.primary)}>Статистика</div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('leaderboard')}
              className={cn(
                "p-4 rounded-2xl border transition-all group",
                styles.buttons.card.background,
                styles.buttons.card.border,
                styles.buttons.card.borderHover
              )}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", styles.buttons.iconColors.leaderboard.bg)}>
                <Trophy size={22} className={styles.buttons.iconColors.leaderboard.icon} />
              </div>
              <div className="text-left">
                <div className={cn("font-semibold", styles.buttons.text.primary)}>Рекорды</div>
              </div>
            </motion.button>
          </div>

          {/* Словарь */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('dictionary')}
            className={cn(
              "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 group",
              styles.buttons.card.background,
              styles.buttons.card.border,
              styles.buttons.card.borderHover
            )}
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", styles.buttons.iconColors.dictionary.bg)}>
              <BookOpen size={22} className={styles.buttons.iconColors.dictionary.icon} />
            </div>
            <div className="text-left flex-1">
              <div className={cn("font-semibold", styles.buttons.text.primary)}>Словарь</div>
              <div className={cn("text-sm", styles.buttons.text.muted)}>{stats.learnedWords.length} из {getAllWordsCount()} слов</div>
            </div>
          </motion.button>

          {/* Настройки */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('settings')}
            className={cn(
              "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 group",
              styles.buttons.card.background,
              styles.buttons.card.border,
              styles.buttons.card.borderHover
            )}
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", styles.buttons.iconColors.settings.bg)}>
              <Settings size={22} className={styles.buttons.iconColors.settings.icon} />
            </div>
            <div className="text-left flex-1">
              <div className={cn("font-semibold", styles.buttons.text.primary)}>Настройки</div>
            </div>
          </motion.button>

          {/* Как играть */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('howto')}
            className={cn(
              "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 group",
              styles.buttons.card.background,
              styles.buttons.card.border,
              styles.buttons.card.borderHover
            )}
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", styles.buttons.iconColors.help.bg)}>
              <HelpCircle size={22} className={styles.buttons.iconColors.help.icon} />
            </div>
            <div className="text-left flex-1">
              <div className={cn("font-semibold", styles.buttons.text.primary)}>Как играть</div>
              <div className={cn("text-sm", styles.buttons.text.muted)}>Пошаговое обучение</div>
            </div>
          </motion.button>

          {/* Үгын Дархан */}
          <motion.button
            onClick={() => navigate('contribute')}
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            className="relative w-full p-4 rounded-2xl overflow-hidden flex items-center gap-4 group cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500"
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              style={{ backgroundSize: '200% 200%' }}
            />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
            <motion.div 
              className="absolute inset-0 rounded-2xl"
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(244, 63, 94, 0.4), 0 0 40px rgba(244, 63, 94, 0.2)',
                  '0 0 35px rgba(244, 63, 94, 0.6), 0 0 70px rgba(244, 63, 94, 0.3)',
                  '0 0 20px rgba(244, 63, 94, 0.4), 0 0 40px rgba(244, 63, 94, 0.2)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            <motion.div 
              className="relative z-10 w-14 h-14 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Heart size={28} className="text-white fill-white/50" />
            </motion.div>
            
            <div className="relative z-10 text-left flex-1">
              <div className="font-bold text-lg text-white flex items-center gap-2">
                Үгын Дархан
                <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}>
                  ✨
                </motion.span>
              </div>
              <div className="text-sm text-white/90">Помоги сохранить бурятский язык!</div>
            </div>
            
            <motion.div 
              className="relative z-10 text-white font-bold text-xl"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.div>
          </motion.button>

          {/* Вопросы и ответы */}
          <motion.button
            onClick={() => {
              openLink('https://t.me/buryat_words');
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 group",
              styles.buttons.card.background,
              styles.buttons.card.border,
              "hover:border-violet-500/50"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", styles.buttons.iconColors.help.bg)}>
              <HelpCircle size={22} className={styles.buttons.iconColors.help.icon} />
            </div>
            <div className="text-left flex-1">
              <div className={cn("font-semibold", styles.buttons.text.primary)}>Вопросы и ответы</div>
              <div className={cn("text-sm", styles.buttons.text.muted)}>Telegram: @buryat_words</div>
            </div>
          </motion.button>

          {/* Debug (admin only) */}
          {isAdmin && (
            <motion.button
              whileHover={{ opacity: 0.8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('debug')}
              className={cn("w-full py-2 text-sm transition-colors flex items-center justify-center gap-2", styles.footer.text, "hover:opacity-80")}
            >
              <Bug size={14} />
              Debug Grid
            </motion.button>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center">
        <p className={cn("text-sm", styles.footer.text)}>Изучай бурятский язык играя! ✨</p>
      </footer>
    </div>
  );
};

// Helpers
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

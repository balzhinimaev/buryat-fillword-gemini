// src/App.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/gameStore';
import { useMemo } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { getTheme, isDarkTheme } from './theme';
import { TelegramThemeSync } from './components/TelegramThemeSync';

// Screens
import MainMenu from './screens/MainMenu';
import LevelsScreen from './screens/LevelsScreen';
import GameScreen from './screens/GameScreen';
import SettingsScreen from './screens/SettingsScreen';
import StatsScreen from './screens/StatsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import DictionaryScreen from './screens/DictionaryScreen';
import DebugGridScreen from './screens/DebugGridScreen';
import WordContributionScreen from './screens/WordContributionScreen';

// Плавный fade переход
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = {
  type: 'tween' as const,
  ease: 'easeOut' as const,
  duration: 0.15,
};

export default function App() {
  const store = useGameStore();
  const { currentScreen, settings } = store.state;
  const currentTheme = getTheme(settings.theme);

  // Определяем фон в зависимости от экрана и темы
  const screenBackground = useMemo(() => {
    const isDark = isDarkTheme(settings.theme);
    
    // Для тёмных тем
    if (isDark) {
      switch (currentScreen) {
        case 'menu':
        case 'stats':
          return currentTheme.backgrounds.primary;
        case 'game':
        case 'debug':
          return 'bg-slate-900';
        default:
          // Остальные экраны тоже тёмные для консистентности
          return currentTheme.backgrounds.primary;
      }
    }
    
    // Для светлой темы
    return currentTheme.backgrounds.primary;
  }, [currentScreen, settings.theme, currentTheme]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'menu':
        return <MainMenu store={store} />;
      case 'levels':
        return <LevelsScreen store={store} />;
      case 'game':
        return <GameScreen store={store} />;
      case 'settings':
        return <SettingsScreen store={store} />;
      case 'stats':
        return <StatsScreen store={store} />;
      case 'leaderboard':
        return <LeaderboardScreen store={store} />;
      case 'dictionary':
        return <DictionaryScreen store={store} />;
      case 'debug':
        return <DebugGridScreen store={store} />;
      case 'contribute':
        return <WordContributionScreen store={store} />;
      default:
        return <MainMenu store={store} />;
    }
  };

  return (
    <ThemeProvider themeId={settings.theme}>
      {/* Синхронизация темы с оболочкой Telegram */}
      <TelegramThemeSync themeId={settings.theme} screen={currentScreen} />
      
      <div 
        className={`min-h-[100dvh] max-w-md mx-auto shadow-2xl overflow-hidden relative transition-colors duration-150 ease-out ${screenBackground}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="min-h-[100dvh]"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>
    </ThemeProvider>
  );
}

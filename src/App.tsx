// src/App.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/gameStore';
import { useMemo, useEffect } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { getTheme } from './theme';
import { TelegramThemeSync } from './components/TelegramThemeSync';
import { useAuth } from './store/authStore';

// Screens
import MainMenu from './screens/MainMenu';
import GameModeSelectScreen from './screens/GameModeSelectScreen';
import LevelsScreen from './screens/LevelsScreen';
import LevelPackScreen from './screens/LevelPackScreen';
import GameScreen from './screens/GameScreen';
import SettingsScreen from './screens/SettingsScreen';
import StatsScreen from './screens/StatsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import DictionaryScreen from './screens/DictionaryScreen';
import DebugGridScreen from './screens/DebugGridScreen';
import WordContributionScreen from './screens/WordContributionScreen';
import OnboardingScreen from './screens/OnboardingScreen';

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
  const { state: authState } = useAuth();

  // Определяем нужно ли показывать онбординг
  const shouldShowOnboarding = useMemo(() => {
    // Показываем онбординг если:
    // 1. Пользователь авторизован
    // 2. Это новый пользователь ИЛИ онбординг не завершён
    if (!authState.isAuthenticated || authState.isLoading) {
      return false;
    }
    return authState.isNewUser || !authState.onboardingCompleted;
  }, [authState.isAuthenticated, authState.isLoading, authState.isNewUser, authState.onboardingCompleted]);

  // Определяем какой экран показывать
  const effectiveScreen = useMemo(() => {
    if (shouldShowOnboarding) {
      return 'onboarding';
    }
    return currentScreen;
  }, [shouldShowOnboarding, currentScreen]);

  // Прокручиваем страницу вверх при переходе на новый экран
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [effectiveScreen]);

  // Определяем фон в зависимости от темы
  // Каждый экран может устанавливать свой собственный фон поверх этого
  const screenBackground = useMemo(() => {
    return currentTheme.backgrounds.primary;
  }, [currentTheme]);

  const renderScreen = () => {
    switch (effectiveScreen) {
      case 'onboarding':
        return <OnboardingScreen store={store} />;
      case 'menu':
        return <MainMenu store={store} />;
      case 'gameMode':
        return <GameModeSelectScreen store={store} />;
      case 'levels':
        return <LevelsScreen store={store} />;
      case 'levelPack':
        return <LevelPackScreen store={store} />;
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
            key={effectiveScreen}
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

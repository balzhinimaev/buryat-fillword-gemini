// src/App.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/gameStore';
import { useMemo, useEffect, useRef } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { getTheme } from './theme';
import { TelegramThemeSync } from './components/TelegramThemeSync';
import { useAuth } from './store/authStore';
import { api } from './services/api';
import { getResumeFirstLevelSlug } from './utils/campaignResume';

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
import WordDetailScreen from './screens/WordDetailScreen';
import DebugGridScreen from './screens/DebugGridScreen';
import AdminScreen from './screens/AdminScreen';
import AdminCampaignScreen from './screens/AdminCampaignScreen';
import BroadcastScreen from './screens/BroadcastScreen';
import WordContributionScreen from './screens/WordContributionScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HowToPlayScreen from './screens/HowToPlayScreen';
import AdminLevelEditorScreen from './screens/AdminLevelEditorScreen';
import AdminDailyWordScreen from './screens/AdminDailyWordScreen';
import AdminCampaignMapVariantsScreen from './screens/AdminCampaignMapVariantsScreen';
import SupportScreen from './screens/SupportScreen';

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
  const { loadSettingsFromApi, setCampaignResumeSlug, navigate } = store;
  const currentTheme = getTheme(settings.theme);
  const { state: authState } = useAuth();
  const resumeFlowCheckedRef = useRef(false);

  // Загружаем настройки с сервера после авторизации
  useEffect(() => {
    if (authState.isAuthenticated && !authState.isLoading) {
      loadSettingsFromApi();
    }
  }, [authState.isAuthenticated, authState.isLoading, loadSettingsFromApi]);

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

  // Если пользователь разлогинился — сбрасываем флаг проверки resume-flow
  useEffect(() => {
    if (!authState.isAuthenticated) {
      resumeFlowCheckedRef.current = false;
      setCampaignResumeSlug(null);
    }
  }, [authState.isAuthenticated, setCampaignResumeSlug]);

  // Resume-first-flow:
  // если первый уровень кампании уже стартовали, но не завершили —
  // при следующем открытии приложения ведём пользователя сразу к prompt на экране выбора режима.
  useEffect(() => {
    if (!authState.isAuthenticated || authState.isLoading) return;
    if (shouldShowOnboarding) return;
    if (resumeFlowCheckedRef.current) return;

    resumeFlowCheckedRef.current = true;
    let isMounted = true;

    (async () => {
      try {
        const overview = await api.getCampaignOverview();
        if (!isMounted) return;

        const resumeSlug = getResumeFirstLevelSlug(overview);
        setCampaignResumeSlug(resumeSlug);

        if (resumeSlug && currentScreen === 'menu') {
          navigate('gameMode');
        }
      } catch {
        // Silent fail: resume-flow не должен ломать запуск приложения
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [
    authState.isAuthenticated,
    authState.isLoading,
    shouldShowOnboarding,
    currentScreen,
    setCampaignResumeSlug,
    navigate,
  ]);

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
      case 'howto':
        return <HowToPlayScreen store={store} />;
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
      case 'wordDetail':
        return <WordDetailScreen store={store} />;
      case 'debug':
        return <DebugGridScreen store={store} />;
      case 'admin':
        return <AdminScreen store={store} />;
      case 'adminCampaign':
        return <AdminCampaignScreen store={store} />;
      case 'broadcast':
        return <BroadcastScreen store={store} />;
      case 'contribute':
        return <WordContributionScreen store={store} />;
      case 'adminLevelEditor':
        return <AdminLevelEditorScreen store={store} />;
      case 'adminDailyWord':
        return <AdminDailyWordScreen store={store} />;
      case 'adminCampaignMaps':
        return <AdminCampaignMapVariantsScreen store={store} />;
      case 'support':
        return <SupportScreen store={store} />;
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

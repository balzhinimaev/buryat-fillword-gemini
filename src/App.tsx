// src/App.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/gameStore';
import { useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { getTheme } from './theme';
import { TelegramThemeSync } from './components/TelegramThemeSync';
import { useAuth } from './store/authStore';
import { api, type AnalyticsEventContext } from './services/api';
import { getResumeFirstLevelSlug } from './utils/campaignResume';
import { trackAnalyticsEventsNonBlocking } from './utils/analytics';
import { extractStartAppPayload, parseStartAppIntent } from './utils/startapp';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useTelegram } from './hooks/useTelegram';

// Screens (lazy-loaded для code splitting)
const MainMenu = lazy(() => import('./screens/MainMenu'));
const GameModeSelectScreen = lazy(() => import('./screens/GameModeSelectScreen'));
const LevelsScreen = lazy(() => import('./screens/LevelsScreen'));
const LevelPackScreen = lazy(() => import('./screens/LevelPackScreen'));
const GameScreen = lazy(() => import('./screens/GameScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const StatsScreen = lazy(() => import('./screens/StatsScreen'));
const LeaderboardScreen = lazy(() => import('./screens/LeaderboardScreen'));
const DictionaryScreen = lazy(() => import('./screens/DictionaryScreen'));
const WordDetailScreen = lazy(() => import('./screens/WordDetailScreen'));
const DebugGridScreen = lazy(() => import('./screens/DebugGridScreen'));
const AdminScreen = lazy(() => import('./screens/AdminScreen'));
const AdminCampaignScreen = lazy(() => import('./screens/AdminCampaignScreen'));
const BroadcastScreen = lazy(() => import('./screens/BroadcastScreen'));
const WordContributionScreen = lazy(() => import('./screens/WordContributionScreen'));
const OnboardingScreen = lazy(() => import('./screens/OnboardingScreen'));
const HowToPlayScreen = lazy(() => import('./screens/HowToPlayScreen'));
const AdminLevelEditorScreen = lazy(() => import('./screens/AdminLevelEditorScreen'));
const AdminDailyWordScreen = lazy(() => import('./screens/AdminDailyWordScreen'));
const AdminCampaignMapVariantsScreen = lazy(() => import('./screens/AdminCampaignMapVariantsScreen'));
const SupportScreen = lazy(() => import('./screens/SupportScreen'));
const AuthScreen = lazy(() => import('./screens/AuthScreen'));

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
  const {
    loadSettingsFromApi,
    setCampaignResumeSlug,
    setCampaignLandingView,
    setCampaignPreferredModuleId,
    startDailyGame,
    selectCategory,
    navigate,
  } = store;
  const currentTheme = getTheme(settings.theme);
  const { state: authState, refreshUser } = useAuth();
  const { isTelegram } = useTelegram();
  const startupFlowCheckedRef = useRef(false);

  const startAppIntent = useMemo(() => {
    const telegramStartParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? null;
    const raw = extractStartAppPayload({
      search: window.location.search,
      telegramStartParam,
    });
    return parseStartAppIntent(raw);
  }, []);

  const startupAnalyticsCtx = useMemo<AnalyticsEventContext>(() => {
    let source: AnalyticsEventContext['source'] = startAppIntent ? 'startapp' : 'unknown';
    let campaignId: string | undefined;

    try {
      const params = new URLSearchParams(window.location.search);
      const sourceParam = (params.get('source') || '').trim();
      const campaignParam = (params.get('campaign_id') || params.get('campaignId') || '').trim();

      if (sourceParam === 'menu' || sourceParam === 'startapp' || sourceParam === 'broadcast' || sourceParam === 'push' || sourceParam === 'unknown') {
        source = sourceParam;
      }

      if (campaignParam) {
        campaignId = campaignParam;
      }
    } catch {
      // ignore malformed query string
    }

    return {
      source,
      campaignId,
      startappIntent: startAppIntent?.type,
      platform: 'web',
    };
  }, [startAppIntent]);

  // Запрашиваем push-permission после завершения онбординга
  usePushNotifications(authState.isAuthenticated && authState.onboardingCompleted);

  // Загружаем настройки с сервера после авторизации
  useEffect(() => {
    if (authState.isAuthenticated && !authState.isLoading) {
      loadSettingsFromApi();
    }
  }, [authState.isAuthenticated, authState.isLoading, loadSettingsFromApi]);

  // Базовый heartbeat активности при входе в приложение
  useEffect(() => {
    if (!authState.isAuthenticated || authState.isLoading) return;

    let cancelled = false;

    const shouldMarkReactivationOpened =
      startupAnalyticsCtx.source === 'broadcast'
      || startupAnalyticsCtx.source === 'push'
      || (startupAnalyticsCtx.campaignId?.toLowerCase().startsWith('reactiv_') ?? false);

    trackAnalyticsEventsNonBlocking([
      {
        eventName: 'app_open',
        ctx: startupAnalyticsCtx,
      },
      ...(shouldMarkReactivationOpened
        ? [{ eventName: 'reactivation_opened' as const, ctx: startupAnalyticsCtx }]
        : []),
    ]);

    (async () => {
      try {
        await api.trackActivity('app_open');
        if (!cancelled) {
          void refreshUser();
        }
      } catch {
        // non-blocking
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authState.isAuthenticated, authState.isLoading, refreshUser, startupAnalyticsCtx]);

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

  // Если пользователь разлогинился — сбрасываем флаги стартовой маршрутизации
  useEffect(() => {
    if (!authState.isAuthenticated) {
      startupFlowCheckedRef.current = false;
      setCampaignResumeSlug(null);
      setCampaignPreferredModuleId(null);
    }
  }, [authState.isAuthenticated, setCampaignResumeSlug, setCampaignPreferredModuleId]);

  // Startup routing:
  // 1) deep-link startapp (daily/resume/module)
  // 2) fallback resume-first-flow
  useEffect(() => {
    if (!authState.isAuthenticated || authState.isLoading) return;
    if (shouldShowOnboarding) return;
    if (startupFlowCheckedRef.current) return;

    startupFlowCheckedRef.current = true;
    let isMounted = true;

    (async () => {
      let resumeSlug: string | null = null;

      try {
        const overview = await api.getCampaignOverview();
        if (!isMounted) return;

        resumeSlug = getResumeFirstLevelSlug(overview);
        setCampaignResumeSlug(resumeSlug);
      } catch {
        // Silent fail: стартовый flow не должен ломать запуск приложения
      }

      if (!isMounted) return;

      if (startAppIntent?.type === 'daily') {
        setCampaignLandingView(null);
        setCampaignPreferredModuleId(null);

        if (!settings.hasSeenHowTo) {
          navigate('howto');
          return;
        }

        startDailyGame();
        return;
      }

      if (startAppIntent?.type === 'module') {
        setCampaignLandingView('modules');
        setCampaignPreferredModuleId(startAppIntent.moduleId);
        navigate('levels');
        return;
      }

      if (startAppIntent?.type === 'resume') {
        if (!settings.hasSeenHowTo) {
          navigate('howto');
          return;
        }

        if (resumeSlug) {
          setCampaignLandingView(null);
          setCampaignPreferredModuleId(null);
          setCampaignResumeSlug(null);
          selectCategory(resumeSlug);
          return;
        }

        navigate('gameMode');
        return;
      }

      // Fallback: resume-first-flow для обычного старта без deep-link
      if (resumeSlug && currentScreen === 'menu') {
        navigate('gameMode');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [
    authState.isAuthenticated,
    authState.isLoading,
    shouldShowOnboarding,
    settings.hasSeenHowTo,
    startAppIntent,
    currentScreen,
    setCampaignResumeSlug,
    setCampaignLandingView,
    setCampaignPreferredModuleId,
    startDailyGame,
    selectCategory,
    navigate,
  ]);

  // Определяем какой экран показывать
  const effectiveScreen = useMemo(() => {
    if (authState.isCheckingSession && !authState.isAuthenticated) {
      return 'authLoading';
    }

    if (!authState.isAuthenticated) {
      return 'auth';
    }

    if (shouldShowOnboarding) {
      return 'onboarding';
    }

    return currentScreen;
  }, [
    authState.isAuthenticated,
    authState.isCheckingSession,
    shouldShowOnboarding,
    currentScreen,
  ]);

  // Прокручиваем страницу вверх при переходе на новый экран
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [effectiveScreen]);

  // Определяем фон в зависимости от темы
  // Каждый экран может устанавливать свой собственный фон поверх этого
  const screenBackground = useMemo(() => {
    return currentTheme.backgrounds.primary;
  }, [currentTheme]);

  const webNarrowScreens = new Set([
    'auth',
    'authLoading',
    'settings',
    'support',
    'onboarding',
    'howto',
  ]);

  const isWebNarrow = !isTelegram && webNarrowScreens.has(effectiveScreen);

  const renderScreen = () => {
    switch (effectiveScreen) {
      case 'authLoading':
        return (
          <div className={`min-h-[100dvh] flex items-center justify-center text-sm ${currentTheme.text.muted}`}>
            Проверяем сессию…
          </div>
        );
      case 'auth':
        return <AuthScreen />;
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
        className={`min-h-[100dvh] w-full ${isTelegram ? 'max-w-md shadow-2xl' : `${isWebNarrow ? 'max-w-2xl' : 'max-w-6xl'} px-0 md:px-4 lg:px-6`} mx-auto overflow-hidden relative transition-colors duration-150 ease-out ${screenBackground}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={effectiveScreen}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className={`min-h-[100dvh] ${isTelegram ? '' : 'md:my-4 md:rounded-3xl md:shadow-2xl md:border md:border-stone-200/60 dark:md:border-stone-700/60 overflow-hidden'}`}
          >
            <Suspense
              fallback={(
                <div className={`min-h-[100dvh] flex items-center justify-center text-sm ${currentTheme.text.muted}`}>
                  Загрузка…
                </div>
              )}
            >
              {renderScreen()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </ThemeProvider>
  );
}

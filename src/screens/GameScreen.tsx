// src/screens/GameScreen.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Trophy, 
  Clock, 
  Share2, 
  RotateCcw,
  Zap,
  ChevronRight,
  Sparkles,
  Lock,
  Info,
  Eye,
  Settings2
} from 'lucide-react';
import { cn, StarsDisplay } from '../components/ui';
import type { GameStore } from '../store/gameStore';
import { LEVEL_PACKS } from '../store/gameStore';
import { generateServerLevel, generateCampaignLevel, findWordByPath, isPalindromeWord, type PlacedWord } from '../gameEngine';
import type { Coord, CellStatus, WordData } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { getGameStyles, type GameThemeStyles } from '../theme/gameStyles';
import { api, type ApiError, type CampaignLevelResponse, type CampaignLevelResultResponse, type LevelModeLevelResponse, type LevelModeSubmitResponse, type DailyWordTodayResponse, type DailyWordSubmitResponse, type DailyWordLeaderboardResponse, clearStoredTokens, AUTH_REQUIRED_EVENT } from '../services/api';
import { trackAnalyticsEventNonBlocking } from '../utils/analytics';
import { useAuth } from '../store/authStore';

interface GameScreenProps {
  store: GameStore;
}

// Информация о найденной клетке (для красивого отображения слов)
type FoundCellInfo = {
  wordIndex: number;
  neighbors: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };
};

// Палитра цветов для слов (адаптивная к теме)
const getWordColors = (isDark: boolean) => isDark ? [
  { bg: '#ef4444', text: '#fff' }, // red
  { bg: '#f97316', text: '#fff' }, // orange
  { bg: '#eab308', text: '#1a1a1a' }, // yellow
  { bg: '#22c55e', text: '#fff' }, // green
  { bg: '#14b8a6', text: '#fff' }, // teal
  { bg: '#0ea5e9', text: '#fff' }, // sky
  { bg: '#3b82f6', text: '#fff' }, // blue
  { bg: '#8b5cf6', text: '#fff' }, // violet
  { bg: '#d946ef', text: '#fff' }, // fuchsia
  { bg: '#ec4899', text: '#fff' }, // pink
  { bg: '#06b6d4', text: '#fff' }, // cyan
  { bg: '#84cc16', text: '#1a1a1a' }, // lime
] : [
  { bg: '#dc2626', text: '#fff' }, // red
  { bg: '#ea580c', text: '#fff' }, // orange
  { bg: '#ca8a04', text: '#fff' }, // yellow (darker for light theme)
  { bg: '#16a34a', text: '#fff' }, // green
  { bg: '#0d9488', text: '#fff' }, // teal
  { bg: '#0284c7', text: '#fff' }, // sky
  { bg: '#2563eb', text: '#fff' }, // blue
  { bg: '#7c3aed', text: '#fff' }, // violet
  { bg: '#c026d3', text: '#fff' }, // fuchsia
  { bg: '#db2777', text: '#fff' }, // pink
  { bg: '#0891b2', text: '#fff' }, // cyan
  { bg: '#65a30d', text: '#fff' }, // lime
];

// Компонент слова с эффектом раскрытия
const FlippableWordChip = React.memo(({ 
  word, 
  isFound, 
  color, 
  styles,
  isDark,
  index,
  onHint
}: { 
  word: { bur: string; ru: string };
  isFound: boolean;
  color: { bg: string; text: string };
  styles: GameThemeStyles;
  isDark: boolean;
  index: number;
  onHint?: () => void;
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasBeenClicked, setHasBeenClicked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleClick = () => {
    if (isFound) return;
    
    if (isRevealed) {
      // Если уже раскрыто - скрываем
      setIsRevealed(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }
    
    setIsRevealed(true);
    setHasBeenClicked(true);
    onHint?.();
    
    // Автоматически скрываем через 2 секунды
    timeoutRef.current = setTimeout(() => {
      setIsRevealed(false);
    }, 2000);
  };
  
  // Очистка таймера при размонтировании или когда слово найдено
  useEffect(() => {
    if (isFound && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isFound]);

  // Показываем анимацию-подсказку только для первого незнайденного слова
  const showHintAnimation = !isFound && !hasBeenClicked && index === 0;

  // Найденное слово - компактный вид
  if (isFound) {
    return (
      <div
        className="px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all duration-300"
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        <span className="line-through opacity-60">{word.ru}</span>
        <span className="text-xs opacity-80">({word.bur})</span>
      </div>
    );
  }
  
  return (
    <motion.button
      onClick={handleClick}
      animate={isRevealed ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.2 }}
      className={cn(
        "px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-300",
        !isRevealed && styles.wordChip.idle.background,
        !isRevealed && styles.wordChip.idle.text,
        !isRevealed && "hover:shadow-md hover:ring-2 hover:ring-amber-400/30 hover:-translate-y-0.5",
        isRevealed && "bg-gradient-to-r shadow-lg",
        isRevealed && (isDark 
          ? "from-amber-500 to-orange-500 text-white shadow-amber-500/30" 
          : "from-amber-400 to-orange-400 text-white shadow-orange-400/30"),
        "active:scale-95",
        showHintAnimation && "animate-[gentle-bounce_2s_ease-in-out_infinite]"
      )}
    >
      {isRevealed ? (
        <span className="whitespace-nowrap font-bold">{word.bur}</span>
      ) : (
        <>
          <span className="whitespace-nowrap">{word.ru}</span>
          <Eye 
            size={14} 
            className={cn(
              "opacity-40 group-hover:opacity-70 transition-opacity flex-shrink-0",
              showHintAnimation && "animate-pulse"
            )} 
          />
        </>
      )}
    </motion.button>
  );
});

// Компонент клетки - оптимизированный с CSS анимациями
const LetterCell = React.memo(({ 
  char, 
  status, 
  r, c, 
  wordColor,
  isHint,
  neighbors,
  styles,
  onPointerDown 
}: { 
  char: string; 
  status: CellStatus; 
  r: number; 
  c: number;
  wordColor?: { bg: string; text: string };
  isHint?: boolean;
  neighbors?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  styles: GameThemeStyles;
  onPointerDown: (e: React.PointerEvent) => void; 
}) => {
  const isFound = status === 'found';
  const isSelected = status === 'selected';
  const isIdle = status === 'idle';

  // Вычисляем border-radius для найденных клеток (скругляем только внешние углы)
  const getBorderRadius = () => {
    if (!isFound || !neighbors) return undefined;
    const radius = '12px';
    const noRadius = '2px';
    
    // top-left, top-right, bottom-right, bottom-left
    const tl = (!neighbors.top && !neighbors.left) ? radius : noRadius;
    const tr = (!neighbors.top && !neighbors.right) ? radius : noRadius;
    const br = (!neighbors.bottom && !neighbors.right) ? radius : noRadius;
    const bl = (!neighbors.bottom && !neighbors.left) ? radius : noRadius;
    
    return `${tl} ${tr} ${br} ${bl}`;
  };

  // Вычисляем границы (только по внешнему краю слова)
  const getBorder = () => {
    if (!isFound || !neighbors) return undefined;
    const borderColor = styles.cell.found.borderColor;
    const borderWidth = '2px';
    
    return {
      borderTop: neighbors.top ? 'none' : `${borderWidth} solid ${borderColor}`,
      borderBottom: neighbors.bottom ? 'none' : `${borderWidth} solid ${borderColor}`,
      borderLeft: neighbors.left ? 'none' : `${borderWidth} solid ${borderColor}`,
      borderRight: neighbors.right ? 'none' : `${borderWidth} solid ${borderColor}`,
    };
  };

  return (
    <div
      className={cn(
        "select-none touch-none aspect-square flex items-center justify-center",
        "text-xl sm:text-2xl font-bold cursor-pointer relative",
        "transition-all duration-100 ease-out",
        "will-change-transform",
        isSelected && `${styles.cell.selected.background} ${styles.cell.selected.text} ${styles.cell.selected.shadow} ${styles.cell.selected.ring} rounded-xl scale-105 z-10`,
        isIdle && `${styles.cell.idle.background} ${styles.cell.idle.text} ${styles.cell.idle.shadow} ${styles.cell.idle.backgroundHover} active:scale-95 rounded-xl`,
        isHint && isIdle && `ring-2 ${styles.cell.hint.ring} ring-offset-1 ${styles.cell.hint.ringOffset}`,
        isFound && "shadow-md"
      )}
      style={{
        ...(isFound && wordColor 
          ? { backgroundColor: wordColor.bg, color: wordColor.text }
          : undefined),
        ...(isFound && { borderRadius: getBorderRadius() }),
        ...(isFound && getBorder()),
      }}
      data-r={r} 
      data-c={c}
      onDragStart={(e) => e.preventDefault()} 
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={onPointerDown}
    >
      {char}
      {isHint && isIdle && (
        <div className={cn("absolute -top-1 -left-1 w-3 h-3 rounded-full shadow-sm animate-[pulse_2s_ease-in-out_infinite]", styles.cell.hint.dot)} />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.char === nextProps.char &&
         prevProps.status === nextProps.status &&
         prevProps.r === nextProps.r &&
         prevProps.c === nextProps.c &&
         prevProps.wordColor?.bg === nextProps.wordColor?.bg &&
         prevProps.isHint === nextProps.isHint &&
         prevProps.neighbors?.top === nextProps.neighbors?.top &&
         prevProps.neighbors?.bottom === nextProps.neighbors?.bottom &&
         prevProps.neighbors?.left === nextProps.neighbors?.left &&
         prevProps.neighbors?.right === nextProps.neighbors?.right &&
         prevProps.styles === nextProps.styles;
});


export const GameScreen: React.FC<GameScreenProps> = ({ store }) => {
  const { state, navigate, goBack, completeEndlessLevel, addToLeaderboard, selectEndlessLevel, navigateToLevelEditor, updateSettings } = store;
  const { state: authState, refreshUser } = useAuth();
  const isAdmin = authState.user?.role === 'admin';
  
  // Определяем режим игры
  const isEndlessMode = state.gameMode === 'endless';
  const isDailyMode = state.gameMode === 'daily';
  const endlessLevel = state.selectedEndlessLevel || 1;
  const campaignSlug = (!isEndlessMode && !isDailyMode) ? (state.selectedCategory || null) : null;
  const isCampaignMode = !isEndlessMode && !isDailyMode;
  const isTimerEnabled = state.settings.timerEnabled !== false;
  const isFirstCampaignLesson = campaignSlug === 'greetings';
  const shouldAskTimerOnFirstLesson =
    isCampaignMode &&
    isFirstCampaignLesson &&
    state.settings.hasSeenTimerOnboarding !== true;

  // Campaign level data (server)
  const [campaignLevel, setCampaignLevel] = useState<CampaignLevelResponse | null>(null);
  const [campaignLevelLoading, setCampaignLevelLoading] = useState(false);
  const [campaignLevelError, setCampaignLevelError] = useState<string | null>(null);

  const [campaignSessionId, setCampaignSessionId] = useState<string | null>(null);
  const [campaignResult, setCampaignResult] = useState<CampaignLevelResultResponse | null>(null);
  const [isCampaignStarting, setIsCampaignStarting] = useState(false);
  const [isCampaignSubmitting, setIsCampaignSubmitting] = useState(false);

  // Level Mode (уровневый режим — server-driven)
  const [levelModeData, setLevelModeData] = useState<LevelModeLevelResponse | null>(null);
  const [levelModeLoading, setLevelModeLoading] = useState(false);
  const [levelModeError, setLevelModeError] = useState<string | null>(null);
  const [levelModeSessionId, setLevelModeSessionId] = useState<string | null>(null);
  const [levelModeResult, setLevelModeResult] = useState<LevelModeSubmitResponse | null>(null);
  const [isLevelModeSubmitting, setIsLevelModeSubmitting] = useState(false);

  // Daily Mode (филлворд дня — server-driven)
  const [dailyData, setDailyData] = useState<DailyWordTodayResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [dailySessionId, setDailySessionId] = useState<string | null>(null);
  const [dailyResult, setDailyResult] = useState<DailyWordSubmitResponse | null>(null);
  const [isDailySubmitting, setIsDailySubmitting] = useState(false);
  const [dailyResultTab, setDailyResultTab] = useState<'summary' | 'leaderboard'>('summary');
  const [dailyLeaderboard, setDailyLeaderboard] = useState<DailyWordLeaderboardResponse | null>(null);
  const [dailyLeaderboardLoading, setDailyLeaderboardLoading] = useState(false);
  const [dailyLeaderboardError, setDailyLeaderboardError] = useState<string | null>(null);

  const submitInFlightRef = useRef(false);

  const errorToMessage = (e: unknown): string => {
    if (!e) return 'Ошибка запроса';
    const apiError = e as Partial<ApiError>;

    if (apiError.statusCode === 401) {
      return 'Обновляем сессию… попробуйте ещё раз через пару секунд.';
    }

    if (typeof apiError.message === 'string' && apiError.message.length > 0) {
      if (apiError.message.toLowerCase() === 'unauthorized') {
        return 'Обновляем сессию… попробуйте ещё раз через пару секунд.';
      }
      return apiError.message;
    }

    if (e instanceof Error && e.message) {
      if (e.message.toLowerCase() === 'unauthorized') {
        return 'Обновляем сессию… попробуйте ещё раз через пару секунд.';
      }
      return e.message;
    }

    return 'Ошибка запроса';
  };

  const trackActivityNonBlocking = useCallback((type: string) => {
    void api.trackActivity(type)
      .then(() => {
        void refreshUser();
      })
      .catch(() => {
        // non-blocking
      });
  }, [refreshUser]);

  const trackGameEvent = useCallback((activityType: string, analyticsEventName: Parameters<typeof trackAnalyticsEventNonBlocking>[0]) => {
    trackActivityNonBlocking(activityType);
    trackAnalyticsEventNonBlocking(analyticsEventName, {
      ctx: {
        source: 'menu',
      },
    });
  }, [trackActivityNonBlocking]);

  const loadDailyLeaderboard = useCallback(async () => {
    try {
      setDailyLeaderboardLoading(true);
      setDailyLeaderboardError(null);
      const leaderboard = await api.getDailyWordTodayLeaderboard(50);
      setDailyLeaderboard(leaderboard);
    } catch (e) {
      const apiError = e as Partial<ApiError>;
      if (typeof apiError.message === 'string' && apiError.message.length > 0) {
        setDailyLeaderboardError(apiError.message);
      } else if (e instanceof Error && e.message) {
        setDailyLeaderboardError(e.message);
      } else {
        setDailyLeaderboardError('Не удалось загрузить рейтинг дня');
      }
    } finally {
      setDailyLeaderboardLoading(false);
    }
  }, []);

  // load campaign level when slug changes
  useEffect(() => {
    let isMounted = true;
    if (!isCampaignMode) return;
    if (!campaignSlug) {
      setCampaignLevel(null);
      setCampaignLevelError('Уровень не выбран');
      return;
    }

    setCampaignLevelLoading(true);
    setCampaignLevelError(null);
    setCampaignLevel(null);
    setCampaignSessionId(null);
    setCampaignResult(null);
    submitInFlightRef.current = false;

    (async () => {
      try {
        const data = await api.getCampaignLevel(campaignSlug);
        if (!isMounted) return;
        setCampaignLevel(data);
      } catch (e) {
        if (!isMounted) return;
        setCampaignLevelError(errorToMessage(e));
      } finally {
        if (isMounted) setCampaignLevelLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [isCampaignMode, campaignSlug]);
  
  // Получаем текущий пакет для бесконечного режима
  const currentPack = isEndlessMode 
    ? LEVEL_PACKS.find(p => endlessLevel >= p.levelStart && endlessLevel <= p.levelEnd) || LEVEL_PACKS[0]
    : null;
  
  // Получаем тему
  const { themeId, isDark } = useTheme();
  const styles = useMemo(() => getGameStyles(themeId), [themeId]);
  const wordColors = useMemo(() => getWordColors(isDark), [isDark]);
  
  const [gridLetters, setGridLetters] = useState<string[][]>([]);
  const [gridSize, setGridSize] = useState(5);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [foundWordIds, setFoundWordIds] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<Coord[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [foundCellsRegistry, setFoundCellsRegistry] = useState<Map<string, FoundCellInfo>>(new Map());
  const [manualHintCells, setManualHintCells] = useState<Set<string>>(new Set());
  const manualHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [showWinModal, setShowWinModal] = useState(false);
  const [showTimerOnboardingModal, setShowTimerOnboardingModal] = useState(false);
  const [time, setTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFoundTimeRef = useRef<number>(0);
  const lastFailedAttemptRef = useRef<string | null>(null); // Для отслеживания повторных неудачных попыток
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRectsRef = useRef<Map<string, DOMRect>>(new Map());

  // Инициализация уровневого режима (server-driven)
  const initLevelModeGame = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    setLevelModeLoading(true);
    setLevelModeError(null);
    setLevelModeData(null);
    setLevelModeSessionId(null);
    setLevelModeResult(null);
    setIsLevelModeSubmitting(false);
    submitInFlightRef.current = false;

    setFoundWordIds(new Set());
    setFoundCellsRegistry(new Map());
    setShowWinModal(false);
    setSelectedPath([]);
    setTime(0);
    setScore(0);
    setCombo(0);
    setMistakes(0);
    lastFoundTimeRef.current = Date.now();
    lastFailedAttemptRef.current = null;

    try {
      const data = await api.getLevelModeLevel(endlessLevel);
      setLevelModeData(data);
      setLevelModeSessionId(data.sessionId);
      trackGameEvent('level_started', 'level_started');

      // Маппим слова: API отдаёт поле "rus", а наш WordData использует "ru"
      const words: WordData[] = (data.words ?? [])
        .map(w => ({
          bur: String(w.bur ?? '').trim().toUpperCase(),
          ru: String(w.rus ?? '').trim(),
        }))
        .filter(w => w.bur.length >= 2);

      // Используем быстрый серверный генератор (без тяжёлого межсловного бэктрекинга)
      const result = data.gridSize
        ? generateServerLevel(data.gridSize, words)
        : generateCampaignLevel(words);

      setGridLetters(result.grid);
      setGridSize(result.size);
      setPlacedWords(result.placedWords);
    } catch (e) {
      setLevelModeError(errorToMessage(e));
    } finally {
      setLevelModeLoading(false);
    }
  }, [endlessLevel, trackGameEvent]);

  const initCampaignGame = useCallback(async (forceStart = false) => {
    if (!campaignSlug || !campaignLevel) return;

    if (!forceStart && shouldAskTimerOnFirstLesson) {
      setShowTimerOnboardingModal(true);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    setIsCampaignStarting(true);
    setCampaignSessionId(null);
    setCampaignResult(null);
    submitInFlightRef.current = false;

    setFoundWordIds(new Set());
    setFoundCellsRegistry(new Map());
    setShowWinModal(false);
    setSelectedPath([]);
    setTime(0);
    setScore(0);
    setCombo(0);
    setMistakes(0);
    lastFoundTimeRef.current = Date.now();
    lastFailedAttemptRef.current = null;

    try {
      const start = await api.startCampaignLevel(campaignSlug);
      setCampaignSessionId(start.sessionId);
      trackGameEvent('campaign_level_started', 'campaign_level_started');

      // Нормализуем слова на клиенте (на всякий случай)
      const words: WordData[] = (campaignLevel.words ?? [])
        .map(w => ({
          bur: String(w.bur ?? '').trim().toUpperCase(),
          ru: String(w.ru ?? '').trim(),
        }))
        .filter(w => w.bur.length >= 2);

      // Если backend прислал статичную карту варианта — используем её напрямую.
      if (
        Array.isArray(campaignLevel.grid) &&
        campaignLevel.grid.length > 0 &&
        Array.isArray(campaignLevel.wordPlacements) &&
        campaignLevel.wordPlacements.length > 0
      ) {
        try {
          const staticPlaced: PlacedWord[] = campaignLevel.wordPlacements.map(wp => ({
            word: { bur: String(wp.bur ?? '').trim().toUpperCase(), ru: String(wp.ru ?? '').trim() },
            path: Array.isArray(wp.path) ? wp.path : [],
          }));

          if (!staticPlaced.every(item => item.path.length > 0)) {
            throw new Error('Invalid campaign static map: empty path');
          }

          setGridLetters(campaignLevel.grid);
          setGridSize(
            typeof campaignLevel.gridSize === 'number' && campaignLevel.gridSize > 0
              ? campaignLevel.gridSize
              : campaignLevel.grid.length
          );
          setPlacedWords(staticPlaced);
        } catch (error) {
          console.warn('Failed to use campaign static map, fallback to local generation', error);
          const result = generateCampaignLevel(words);
          setGridLetters(result.grid);
          setGridSize(result.size);
          setPlacedWords(result.placedWords);
        }
      } else {
        // Фоллбэк: локальная генерация карты
        const result = generateCampaignLevel(words);
        setGridLetters(result.grid);
        setGridSize(result.size);
        setPlacedWords(result.placedWords);
      }
    } catch (e) {
      setToastMessage(errorToMessage(e));
      setCampaignSessionId(null);
    } finally {
      setIsCampaignStarting(false);
    }
  }, [campaignSlug, campaignLevel, shouldAskTimerOnFirstLesson, trackGameEvent]);

  // Инициализация филлворда дня (server-driven)
  const initDailyGame = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    setDailyLoading(true);
    setDailyError(null);
    setDailyData(null);
    setDailySessionId(null);
    setDailyResult(null);
    setDailyResultTab('summary');
    setDailyLeaderboard(null);
    setDailyLeaderboardError(null);
    setIsDailySubmitting(false);
    submitInFlightRef.current = false;

    setFoundWordIds(new Set());
    setFoundCellsRegistry(new Map());
    setShowWinModal(false);
    setSelectedPath([]);
    setTime(0);
    setScore(0);
    setCombo(0);
    setMistakes(0);
    lastFoundTimeRef.current = Date.now();
    lastFailedAttemptRef.current = null;

    try {
      const data = await api.getDailyWordToday();
      setDailyData(data);
      setDailySessionId(data.sessionId);
      trackGameEvent('daily_started', 'daily_started');

      // Маппим слова: API отдаёт поле "rus", наш WordData — "ru"
      const words: WordData[] = (data.words ?? [])
        .map(w => ({
          bur: String(w.bur ?? '').trim().toUpperCase(),
          ru: String(w.rus ?? '').trim(),
        }))
        .filter(w => w.bur.length >= 2);

      // Если сервер прислал статичную сетку — используем напрямую (без генерации)
      if (data.grid && data.wordPlacements && data.grid.length > 0) {
        const staticPlaced: PlacedWord[] = data.wordPlacements.map(wp => ({
          word: { bur: wp.bur.toUpperCase(), ru: wp.rus },
          path: wp.path,
        }));
        setGridLetters(data.grid);
        setGridSize(data.gridSize);
        setPlacedWords(staticPlaced);
      } else {
        // Фоллбэк: генерируем сетку на клиенте
        const result = data.gridSize
          ? generateServerLevel(data.gridSize, words)
          : generateCampaignLevel(words);
        setGridLetters(result.grid);
        setGridSize(result.size);
        setPlacedWords(result.placedWords);
      }
    } catch (e) {
      setDailyError(errorToMessage(e));
    } finally {
      setDailyLoading(false);
    }
  }, [trackGameEvent]);

  useEffect(() => {
    if (isEndlessMode) void initLevelModeGame();
  }, [isEndlessMode, initLevelModeGame]);

  useEffect(() => {
    if (isDailyMode) void initDailyGame();
  }, [isDailyMode, initDailyGame]);

  useEffect(() => {
    if (isCampaignMode && campaignLevel && campaignSlug) void initCampaignGame();
  }, [isCampaignMode, campaignLevel, campaignSlug, initCampaignGame]);

  useEffect(() => {
    if (!shouldAskTimerOnFirstLesson) {
      setShowTimerOnboardingModal(false);
    }
  }, [shouldAskTimerOnFirstLesson]);
  
  // Очистка таймера toast при размонтировании
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);
  
  // Показать toast-уведомление
  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const applyTimerOnboardingChoice = useCallback((timerEnabled: boolean) => {
    updateSettings({
      timerEnabled,
      hasSeenTimerOnboarding: true,
    });
    setShowTimerOnboardingModal(false);
    showToast(
      timerEnabled
        ? 'Включён режим с таймером. Это можно изменить в Настройках.'
        : 'Включён спокойный режим без таймера. Это можно изменить в Настройках.'
    );
    void initCampaignGame(true);
  }, [updateSettings, showToast, initCampaignGame]);

  // Таймер
  useEffect(() => {
    const canRunTimer = !showWinModal && !showTimerOnboardingModal && (
      (isEndlessMode && !!levelModeSessionId && !levelModeLoading && !isLevelModeSubmitting) ||
      (isDailyMode && !!dailySessionId && !dailyLoading && !isDailySubmitting) ||
      (isCampaignMode && !!campaignSessionId && !isCampaignStarting && !isCampaignSubmitting)
    );

    if (canRunTimer) {
      timerRef.current = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showWinModal, showTimerOnboardingModal, isEndlessMode, isDailyMode, levelModeSessionId, levelModeLoading, isLevelModeSubmitting, dailySessionId, dailyLoading, isDailySubmitting, isCampaignMode, campaignSessionId, isCampaignStarting, isCampaignSubmitting]);

  // Лидерборд дня на экране результата
  useEffect(() => {
    if (!showWinModal || !isDailyMode) return;

    setDailyResultTab('summary');
    void loadDailyLeaderboard();
  }, [showWinModal, isDailyMode, loadDailyLeaderboard]);

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Обработчики указателя
  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    e.preventDefault();
    if (e.button !== 0) return;
    if (foundCellsRegistry.has(`${r}-${c}`)) return;

    // Кешируем позиции клеток при начале выделения
    updateCellRects();
    
    setIsSelecting(true);
    setSelectedPath([{ r, c }]);
  };

  const finishGame = useCallback(async (finalFoundWords: Set<string>, reason: 'completed' | 'timeout') => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Конфетти — только при полной победе
    if (reason === 'completed') {
      const confettiColors = isDark 
        ? ['#FACC15', '#F97316', '#10B981', '#0EA5E9']
        : ['#F59E0B', '#EA580C', '#059669', '#0284C7'];

      confetti({ 
        particleCount: 150, 
        spread: 70, 
        origin: { y: 0.6 }, 
        colors: confettiColors
      });
    }

    const foundWordsArray = placedWords
      .filter(pw => finalFoundWords.has(pw.word.bur))
      .map(pw => pw.word.bur.toUpperCase());

    if (isDailyMode) {
      // Отправляем результат на сервер (Daily Word API)
      if (!dailySessionId) {
        showToast('Нет сессии филлворда дня');
        return;
      }
      if (submitInFlightRef.current) return;
      submitInFlightRef.current = true;
      setIsDailySubmitting(true);

      try {
        const result = await api.submitDailyWord({
          sessionId: dailySessionId,
          timeSeconds: Math.max(1, time),
          foundWords: foundWordsArray,
          mistakes: mistakes > 0 ? mistakes : undefined,
        });
        setDailyResult(result);
        trackGameEvent('daily_completed', 'daily_completed');
        setTimeout(() => setShowWinModal(true), 500);
      } catch (e) {
        showToast(errorToMessage(e));
        submitInFlightRef.current = false;
      } finally {
        setIsDailySubmitting(false);
      }
      return;
    }

    if (isEndlessMode) {
      // Отправляем результат на сервер (Level Mode API)
      if (!levelModeSessionId) {
        showToast('Нет сессии уровня');
        return;
      }
      if (submitInFlightRef.current) return;
      submitInFlightRef.current = true;
      setIsLevelModeSubmitting(true);

      try {
        const result = await api.submitLevelModeLevel(endlessLevel, {
          sessionId: levelModeSessionId,
          timeSeconds: Math.max(1, time),
          foundWords: foundWordsArray,
          mistakes: mistakes > 0 ? mistakes : undefined,
        });
        setLevelModeResult(result);
        trackGameEvent('level_completed', 'level_completed');

        // Обновляем локальный прогресс для UI-совместимости
        completeEndlessLevel(
          endlessLevel,
          foundWordsArray,
          time,
          placedWords.length
        );

        setTimeout(() => setShowWinModal(true), 500);
      } catch (e) {
        showToast(errorToMessage(e));
        submitInFlightRef.current = false;
      } finally {
        setIsLevelModeSubmitting(false);
      }
      return;
    }

    // Campaign: submit result to server
    if (!campaignSlug) {
      showToast('Уровень не выбран');
      return;
    }

    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setIsCampaignSubmitting(true);

    try {
      const result = await api.submitCampaignLevel(campaignSlug, {
        sessionId: campaignSessionId ?? undefined,
        timeSeconds: Math.max(1, time),
        foundWords: foundWordsArray,
        mistakes: mistakes > 0 ? mistakes : undefined,
      });
      setCampaignResult(result);
      trackGameEvent('campaign_level_completed', 'campaign_level_completed');

      // Локальный лидерборд оставим как "игровой счёт", но идентификатором будет slug
      addToLeaderboard({
        playerName: state.settings.playerName,
        score,
        categoryId: campaignSlug,
        time,
      });

      setTimeout(() => setShowWinModal(true), 500);
    } catch (e) {
      showToast(errorToMessage(e));
      submitInFlightRef.current = false;
    } finally {
      setIsCampaignSubmitting(false);
    }
  }, [
    isEndlessMode,
    endlessLevel,
    placedWords,
    time,
    isDark,
    completeEndlessLevel,
    campaignSlug,
    campaignSessionId,
    dailySessionId,
    isDailyMode,
    levelModeSessionId,
    mistakes,
    score,
    addToLeaderboard,
    state.settings.playerName,
    showToast,
    trackGameEvent,
  ]);

  // Таймаут уровня (кампания или level mode) — отправляем неполный результат
  useEffect(() => {
    if (!isTimerEnabled) return;
    if (showWinModal) return;
    if (submitInFlightRef.current) return;

    // Campaign timeout
    if (isCampaignMode) {
      const limit = campaignLevel?.timeLimitSeconds;
      if (!limit || limit <= 0) return;
      if (!campaignSessionId) return;
      if (time < limit) return;
      void finishGame(foundWordIds, 'timeout');
      return;
    }

    // Level Mode timeout
    if (isEndlessMode) {
      const limit = levelModeData?.timeLimitSeconds;
      if (!limit || limit <= 0) return;
      if (!levelModeSessionId) return;
      if (time < limit) return;
      void finishGame(foundWordIds, 'timeout');
    }

    // Daily Mode timeout
    if (isDailyMode) {
      const limit = dailyData?.timeLimitSeconds;
      if (!limit || limit <= 0) return;
      if (!dailySessionId) return;
      if (time < limit) return;
      void finishGame(foundWordIds, 'timeout');
    }
  }, [isTimerEnabled, isCampaignMode, isEndlessMode, isDailyMode, campaignLevel?.timeLimitSeconds, levelModeData?.timeLimitSeconds, dailyData?.timeLimitSeconds, time, showWinModal, campaignSessionId, levelModeSessionId, dailySessionId, finishGame, foundWordIds]);

  const handlePointerUp = useCallback(() => {
    setIsSelecting(false);
    if (selectedPath.length === 0) return;

    const matchedWord = findWordByPath(placedWords, selectedPath);
    const wordId = matchedWord ? matchedWord.word.bur : null;

    // Если путь не совпал точно, проверяем, не составил ли пользователь правильное слово другими буквами
    if (!matchedWord && selectedPath.length > 0) {
      // Получаем строку из выбранных букв
      const selectedLetters = selectedPath.map(p => gridLetters[p.r][p.c]).join('').toUpperCase();
      
      // Ищем слово с такими же буквами среди незнайденных слов
      const matchingWordByLetters = placedWords.find(pw => 
        !foundWordIds.has(pw.word.bur) && 
        pw.word.bur.toUpperCase() === selectedLetters
      );
      
      if (matchingWordByLetters) {
        // Пользователь правильно составил слово, но использовал не те клетки
        showToast(`Слово "${matchingWordByLetters.word.bur}" верное! Но найдите его в другом месте на поле 🔍`);
        lastFailedAttemptRef.current = null; // Сбрасываем, т.к. слово в целом правильное
      } else if (selectedLetters.length >= 2) {
        // Слово не найдено вообще — проверяем повторную попытку
        if (lastFailedAttemptRef.current === selectedLetters) {
          // Пользователь ввёл то же самое дважды — сообщаем, что такого слова нет
          showToast(`Слова "${selectedLetters.toLowerCase()}" нет в этом уровне ❌`);
          setMistakes(m => m + 1);
          lastFailedAttemptRef.current = null; // Сбрасываем после уведомления
        } else {
          // Запоминаем неудачную попытку
          lastFailedAttemptRef.current = selectedLetters;
        }
      }
    }

    if (matchedWord && wordId && !foundWordIds.has(wordId)) {
      // Успешно нашли слово — сбрасываем счётчик неудачных попыток
      lastFailedAttemptRef.current = null;
      const now = Date.now();
      const timeSinceLast = now - lastFoundTimeRef.current;
      lastFoundTimeRef.current = now;
      
      const newCombo = timeSinceLast < 5000 ? combo + 1 : 1;
      setCombo(newCombo);
      
      const basePoints = matchedWord.word.bur.length * 10;
      const comboBonus = newCombo > 1 ? basePoints * (newCombo - 1) * 0.5 : 0;
      const wordScore = Math.round(basePoints + comboBonus);
      setScore(s => s + wordScore);
      
      const newFoundWordIds = new Set(foundWordIds);
      newFoundWordIds.add(wordId);
      setFoundWordIds(newFoundWordIds);
      
      // Сохраняем индекс слова и информацию о соседях для каждой клетки
      const wordIndex = placedWords.findIndex(pw => pw.word.bur === wordId);
      const pathSet = new Set(matchedWord.path.map(p => `${p.r}-${p.c}`));
      
      setFoundCellsRegistry(prev => {
        const newMap = new Map(prev);
        matchedWord.path.forEach(p => {
          // Определяем соседей в том же слове
          const neighbors = {
            top: pathSet.has(`${p.r - 1}-${p.c}`),
            bottom: pathSet.has(`${p.r + 1}-${p.c}`),
            left: pathSet.has(`${p.r}-${p.c - 1}`),
            right: pathSet.has(`${p.r}-${p.c + 1}`),
          };
          newMap.set(`${p.r}-${p.c}`, { wordIndex, neighbors });
        });
        return newMap;
      });
      
      if (state.settings.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      if (newFoundWordIds.size === placedWords.length) {
        void finishGame(newFoundWordIds, 'completed');
      }
    }

    setSelectedPath([]);
  }, [selectedPath, placedWords, foundWordIds, combo, state.settings.vibrationEnabled, finishGame, gridLetters, showToast]);

  // Кеширование позиций клеток при начале выделения
  const updateCellRects = useCallback(() => {
    if (!gridRef.current) return;
    const cells = gridRef.current.querySelectorAll('[data-r][data-c]');
    const newRects = new Map<string, DOMRect>();
    cells.forEach(cell => {
      const r = cell.getAttribute('data-r');
      const c = cell.getAttribute('data-c');
      if (r && c) {
        newRects.set(`${r}-${c}`, cell.getBoundingClientRect());
      }
    });
    cellRectsRef.current = newRects;
  }, []);

  // Найти клетку по координатам курсора (включая "умное" определение)
  const findCellAtPoint = useCallback((clientX: number, clientY: number, lastCell: Coord | null): Coord | null => {
    // Сначала проверяем, находится ли курсор прямо над какой-то клеткой
    for (const [key, rect] of cellRectsRef.current.entries()) {
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        const [r, c] = key.split('-').map(Number);
        return { r, c };
      }
    }

    // Если курсор за пределами клеток, определяем направление от последней клетки
    if (lastCell) {
      const lastRect = cellRectsRef.current.get(`${lastCell.r}-${lastCell.c}`);
      if (!lastRect) return null;

      // Центр последней клетки
      const centerX = lastRect.left + lastRect.width / 2;
      const centerY = lastRect.top + lastRect.height / 2;

      // Вектор от центра последней клетки к курсору
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      // Минимальное расстояние для активации (половина размера клетки)
      const threshold = lastRect.width * 0.3;
      
      // Определяем преобладающее направление
      let targetR = lastCell.r;
      let targetC = lastCell.c;

      // Если горизонтальное смещение больше вертикального
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > threshold) {
          targetC = lastCell.c + 1;
        } else if (dx < -threshold) {
          targetC = lastCell.c - 1;
        }
      } else {
        if (dy > threshold) {
          targetR = lastCell.r + 1;
        } else if (dy < -threshold) {
          targetR = lastCell.r - 1;
        }
      }

      // Проверяем, что целевая клетка существует
      if (cellRectsRef.current.has(`${targetR}-${targetC}`)) {
        return { r: targetR, c: targetC };
      }

      // Если диагональное движение - пробуем вторичное направление
      if (Math.abs(dx) > threshold && Math.abs(dy) > threshold) {
        // Пробуем горизонтальное
        const altC = dx > 0 ? lastCell.c + 1 : lastCell.c - 1;
        if (cellRectsRef.current.has(`${lastCell.r}-${altC}`)) {
          return { r: lastCell.r, c: altC };
        }
        // Пробуем вертикальное
        const altR = dy > 0 ? lastCell.r + 1 : lastCell.r - 1;
        if (cellRectsRef.current.has(`${altR}-${lastCell.c}`)) {
          return { r: altR, c: lastCell.c };
        }
      }
    }

    return null;
  }, []);

  // Глобальные события движения
  useEffect(() => {
    const handleMove = (e: Event) => {
      if (!isSelecting) return;

      let clientX, clientY;
      if ((e as TouchEvent).touches?.length > 0) {
        clientX = (e as TouchEvent).touches[0].clientX;
        clientY = (e as TouchEvent).touches[0].clientY;
      } else if ((e as PointerEvent).clientX !== undefined) {
        clientX = (e as PointerEvent).clientX;
        clientY = (e as PointerEvent).clientY;
      } else return;

      setSelectedPath(prevPath => {
        if (prevPath.length === 0) return prevPath;
        
        const last = prevPath[prevPath.length - 1];
        const foundCell = findCellAtPoint(clientX, clientY, last);
        
        if (!foundCell) return prevPath;
        
        const { r, c } = foundCell;
        
        // Проверяем возврат назад
        if (prevPath.length > 1) {
          const preLast = prevPath[prevPath.length - 2];
          if (preLast.r === r && preLast.c === c) {
            return prevPath.slice(0, -1);
          }
        }

        // Если та же клетка - ничего не делаем
        if (last.r === r && last.c === c) return prevPath;
        
        // Проверяем соседство
        const isNeighbor = Math.abs(last.r - r) + Math.abs(last.c - c) === 1;
        
        const isAlreadySelected = prevPath.some(p => p.r === r && p.c === c);
        const isFound = foundCellsRegistry.has(`${r}-${c}`);
        
        if (isNeighbor && !isAlreadySelected && !isFound) {
          return [...prevPath, { r, c }];
        }

        return prevPath;
      });
    };

    const handleEnd = () => { if (isSelecting) handlePointerUp(); };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isSelecting, foundCellsRegistry, handlePointerUp, findCellAtPoint]);

  const getCellStatus = (r: number, c: number): CellStatus => {
    if (selectedPath.some(p => p.r === r && p.c === c)) return 'selected';
    if (foundCellsRegistry.has(`${r}-${c}`)) return 'found';
    return 'idle';
  };

  const getCellWordColor = (r: number, c: number): { bg: string; text: string } | undefined => {
    const cellInfo = foundCellsRegistry.get(`${r}-${c}`);
    if (cellInfo !== undefined) {
      return wordColors[cellInfo.wordIndex % wordColors.length];
    }
    return undefined;
  };

  const getCellNeighbors = (r: number, c: number) => {
    const cellInfo = foundCellsRegistry.get(`${r}-${c}`);
    return cellInfo?.neighbors;
  };

  // Вычисляем клетки-подсказки (первые буквы незнайденных слов)
  const hintCells = useMemo(() => {
    if (!state.settings.showHints) return new Set<string>();
    
    const hints = new Set<string>();
    placedWords.forEach(pw => {
      if (!foundWordIds.has(pw.word.bur) && pw.path.length > 0) {
        const firstCell = pw.path[0];
        hints.add(`${firstCell.r}-${firstCell.c}`);

        // Для палиндромов подсказка должна быть "двусторонней":
        // игрок может начинать с любого конца, поэтому добавляем и последний символ.
        if (pw.path.length > 1 && isPalindromeWord(pw.word.bur)) {
          const lastCell = pw.path[pw.path.length - 1];
          hints.add(`${lastCell.r}-${lastCell.c}`);
        }
      }
    });
    return hints;
  }, [state.settings.showHints, placedWords, foundWordIds]);

  const showWordStartHint = useCallback((pw: PlacedWord) => {
    if (!pw.path || pw.path.length === 0) return;
    if (manualHintTimeoutRef.current) clearTimeout(manualHintTimeoutRef.current);

    const next = new Set<string>();
    const first = pw.path[0];
    next.add(`${first.r}-${first.c}`);

    // Для палиндромов пользователь может начинать с любой стороны — подсветим оба конца
    if (pw.path.length > 1 && isPalindromeWord(pw.word.bur)) {
      const last = pw.path[pw.path.length - 1];
      next.add(`${last.r}-${last.c}`);
    }

    setManualHintCells(next);
    manualHintTimeoutRef.current = setTimeout(() => {
      setManualHintCells(new Set());
    }, 1800);
  }, []);

  // cleanup таймера подсказки
  useEffect(() => {
    return () => {
      if (manualHintTimeoutRef.current) clearTimeout(manualHintTimeoutRef.current);
    };
  }, []);

  // Серверный результат (campaign, level-mode или daily)
  const serverResult = isDailyMode ? dailyResult : isEndlessMode ? levelModeResult : campaignResult;
  const serverStars = typeof (serverResult as { earnedStars?: number })?.earnedStars === 'number'
    ? (serverResult as { earnedStars?: number }).earnedStars!
    : null;
  const serverTimeSeconds = typeof (serverResult as { timeSeconds?: number })?.timeSeconds === 'number'
    ? (serverResult as { timeSeconds?: number }).timeSeconds!
    : null;
  const serverXpGained = typeof (serverResult as { xpGained?: number })?.xpGained === 'number'
    ? (serverResult as { xpGained?: number }).xpGained!
    : null;

  const shareResult = async () => {
    const stars = serverStars ?? (foundWordIds.size === placedWords.length ? 3 : 
          foundWordIds.size >= placedWords.length * 0.7 ? 2 : 1);
    
    const levelInfo = isDailyMode
      ? `📅 Филлворд дня ${dailyData?.date ?? ''}`
      : isEndlessMode 
        ? `🎮 Уровень ${endlessLevel} ${currentPack?.emoji || ''}` 
        : `📚 ${campaignLevel?.name ?? campaignSlug ?? ''}`;
    
    const text = `🎮 Бурятский Филлворд
${levelInfo}
⭐ ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}
🎯 ${foundWordIds.size}/${placedWords.length} слов
⏱️ ${formatTime(serverTimeSeconds ?? time)}
🏆 ${score} очков

Учи бурятский язык играя! 🇲🇳`;

    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        alert('Результат скопирован в буфер обмена!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const calculateStars = (): number => {
    if (serverStars !== null) return serverStars;
    const completion = foundWordIds.size / placedWords.length;
    if (completion >= 1) return 3;
    if (completion >= 0.7) return 2;
    if (completion >= 0.5) return 1;
    return 0;
  };

  // Проверка на валидность данных для игры
  if (isCampaignMode) {
    if (!campaignSlug) {
      return (
        <div className={cn("min-h-[100dvh] flex items-center justify-center", styles.page.background)}>
          <p className={styles.categoryTitle.text}>Уровень не выбран</p>
        </div>
      );
    }

    if (campaignLevelLoading) {
      return (
        <div className={cn("min-h-[100dvh] flex items-center justify-center", styles.page.background)}>
          <p className={styles.categoryTitle.text}>Загрузка уровня…</p>
        </div>
      );
    }

    if (campaignLevelError) {
      // Проверяем, является ли ошибка Unauthorized (истёкший токен)
      const isUnauthorized = campaignLevelError.toLowerCase().includes('unauthorized') || 
                             campaignLevelError.toLowerCase().includes('401');
      
      const handleErrorAction = () => {
        if (isUnauthorized) {
          // Очищаем токены и запрашиваем переавторизацию
          clearStoredTokens();
          window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
          // Перенаправляем на главную страницу
          navigate('menu');
        } else {
          // Просто повторяем попытку загрузки
          void initCampaignGame();
        }
      };
      
      return (
        <div className={cn("min-h-[100dvh] flex items-center justify-center p-6 text-center", styles.page.background)}>
          <div>
            <p className={cn("mb-2", styles.categoryTitle.text)}>Ошибка загрузки</p>
            <p className={cn("text-sm opacity-70 mb-4", styles.categoryTitle.text)}>{campaignLevelError}</p>
            <button
              onClick={handleErrorAction}
              className={cn(
                "px-4 py-2 rounded-xl transition-colors",
                styles.headerButton.background,
                styles.headerButton.backgroundHover,
                styles.headerButton.text
              )}
            >
              {isUnauthorized ? 'На главную' : 'Повторить'}
            </button>
          </div>
        </div>
      );
    }

    if (!campaignLevel) {
      return (
        <div className={cn("min-h-[100dvh] flex items-center justify-center", styles.page.background)}>
          <p className={styles.categoryTitle.text}>Уровень не найден</p>
        </div>
      );
    }
  }
  
  // Level Mode: загрузка / ошибка
  if (isEndlessMode && levelModeLoading) {
    return (
      <div className={cn("min-h-[100dvh] flex items-center justify-center", styles.page.background)}>
        <p className={styles.categoryTitle.text}>Загрузка уровня…</p>
      </div>
    );
  }

  if (isEndlessMode && levelModeError) {
    const isUnauthorized = levelModeError.toLowerCase().includes('unauthorized') || levelModeError.toLowerCase().includes('401');
    const isForbidden = levelModeError.toLowerCase().includes('403') || levelModeError.toLowerCase().includes('заблокирован');

    return (
      <div className={cn("min-h-[100dvh] flex items-center justify-center p-6 text-center", styles.page.background)}>
        <div>
          <p className={cn("mb-2", styles.categoryTitle.text)}>
            {isForbidden ? 'Уровень заблокирован' : 'Ошибка загрузки'}
          </p>
          <p className={cn("text-sm opacity-70 mb-4", styles.categoryTitle.text)}>{levelModeError}</p>
          <button
            onClick={() => {
              if (isUnauthorized) {
                clearStoredTokens();
                window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
                navigate('menu');
              } else if (isForbidden) {
                goBack();
              } else {
                void initLevelModeGame();
              }
            }}
            className={cn(
              "px-4 py-2 rounded-xl transition-colors",
              styles.headerButton.background,
              styles.headerButton.backgroundHover,
              styles.headerButton.text
            )}
          >
            {isUnauthorized ? 'На главную' : isForbidden ? 'Назад' : 'Повторить'}
          </button>
        </div>
      </div>
    );
  }

  if (isEndlessMode && !levelModeData) {
    return (
      <div className={cn("min-h-[100dvh] flex items-center justify-center", styles.page.background)}>
        <p className={styles.categoryTitle.text}>Ошибка загрузки уровня</p>
      </div>
    );
  }

  // Daily Mode: загрузка / ошибка
  if (isDailyMode && dailyLoading) {
    return (
      <div className={cn("min-h-[100dvh] flex items-center justify-center", styles.page.background)}>
        <p className={styles.categoryTitle.text}>Загрузка филлворда дня…</p>
      </div>
    );
  }

  if (isDailyMode && dailyError) {
    return (
      <div className={cn("min-h-[100dvh] flex items-center justify-center p-6 text-center", styles.page.background)}>
        <div>
          <p className={cn("mb-2", styles.categoryTitle.text)}>Филлворд дня</p>
          <p className={cn("text-sm opacity-70 mb-4", styles.categoryTitle.text)}>{dailyError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => void initDailyGame()}
              className={cn("px-4 py-2 rounded-xl transition-colors", styles.headerButton.background, styles.headerButton.backgroundHover, styles.headerButton.text)}
            >
              Повторить
            </button>
            <button
              onClick={goBack}
              className={cn("px-4 py-2 rounded-xl transition-colors", styles.headerButton.background, styles.headerButton.backgroundHover, styles.headerButton.text)}
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isDailyMode && !dailyData) {
    return (
      <div className={cn("min-h-[100dvh] flex items-center justify-center", styles.page.background)}>
        <p className={styles.categoryTitle.text}>Ошибка загрузки филлворда дня</p>
      </div>
    );
  }
  
  // Функция навигации "назад" — возвращает на предыдущий экран
  const handleBack = () => {
    goBack();
  };
  
  // Заголовок для текущего уровня
  const levelTitle = isDailyMode
    ? 'Филлворд дня'
    : isEndlessMode 
      ? `Уровень ${endlessLevel}` 
      : (campaignLevel?.name ?? campaignSlug ?? '');
  
  const levelEmoji = isDailyMode
    ? '📅'
    : isEndlessMode 
      ? currentPack?.emoji || '🎮' 
      : '📚';

  return (
    <div className={cn(
      "min-h-[100dvh] font-sans flex flex-col max-w-md mx-auto relative overflow-hidden select-none",
      styles.page.gradient
    )}>
      
      {/* Header */}
      <header className={cn("p-4 z-20", styles.header.background, styles.header.border)}>
        <div className="flex justify-between items-center mb-3">
          <button 
            onClick={handleBack}
            className={cn(
              "p-2 rounded-xl transition-all duration-200",
              styles.headerButton.background,
              styles.headerButton.backgroundHover,
              styles.headerButton.text
            )}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-2xl">{levelEmoji}</span>
            <h1 className={cn("text-lg font-bold", styles.categoryTitle.text)}>{levelTitle}</h1>
          </div>
          
          <div className="flex items-center gap-1.5">
          {/* Admin: кнопка редактирования уровня */}
          {isAdmin && isEndlessMode && (
            <button
              onClick={() => navigateToLevelEditor(endlessLevel)}
              className={cn(
                "p-2 rounded-xl transition-all duration-200",
                "bg-violet-500/20 hover:bg-violet-500/30"
              )}
              title="Редактировать уровень"
            >
              <Settings2 size={18} className="text-violet-400" />
            </button>
          )}

          <button 
            onClick={() => {
              if (isEndlessMode) {
                void initLevelModeGame();
              } else {
                void initCampaignGame();
              }
            }}
            disabled={isDailyMode ? (dailyLoading || isDailySubmitting) : isEndlessMode ? (levelModeLoading || isLevelModeSubmitting) : (isCampaignStarting || isCampaignSubmitting)}
            className={cn(
              "p-2 rounded-xl active:rotate-180 transition-all duration-300",
              styles.headerButton.background,
              styles.headerButton.backgroundHover,
              styles.headerButton.text
            )}
          >
            <RotateCcw size={20} />
          </button>
          </div>
        </div>
        
        {/* Stats bar */}
        <div className="flex items-center justify-between gap-3">
          {isTimerEnabled && (
            <div className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2",
              styles.statsBadge.background
            )}>
              <Clock size={16} className={styles.statsBadge.iconColor} />
              <span className={cn("font-mono font-bold", styles.statsBadge.valueColor)}>
                {formatTime(
                  isCampaignMode && typeof campaignLevel?.timeLimitSeconds === 'number' && campaignLevel.timeLimitSeconds > 0
                    ? Math.max(0, campaignLevel.timeLimitSeconds - time)
                    : isEndlessMode && typeof levelModeData?.timeLimitSeconds === 'number' && levelModeData.timeLimitSeconds > 0
                      ? Math.max(0, levelModeData.timeLimitSeconds - time)
                      : isDailyMode && typeof dailyData?.timeLimitSeconds === 'number' && dailyData.timeLimitSeconds > 0
                        ? Math.max(0, dailyData.timeLimitSeconds - time)
                        : time
                )}
              </span>
            </div>
          )}
          
          {combo > 1 && (
            <div className={cn(
              "flex items-center gap-1 rounded-xl px-3 py-2 animate-[pop_0.2s_ease-out]",
              styles.comboBadge.background,
              styles.comboBadge.text
            )}>
              <Zap size={16} className={styles.comboBadge.icon} />
              <span className="font-bold">x{combo}</span>
            </div>
          )}
          
          <div className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2",
            styles.trophyBadge.background
          )}>
            <Trophy size={16} className={styles.trophyBadge.iconColor} />
            <span className={cn("font-bold", styles.trophyBadge.text)}>{score}</span>
          </div>
        </div>
        
        {/* Progress */}
        <div className="mt-3 flex items-center gap-3">
          <div className={cn("flex-1 h-3 rounded-full overflow-hidden", styles.progress.track)}>
            <div 
              className={cn("h-full transition-[width] duration-300 ease-out", styles.progress.fill)}
              style={{ width: placedWords.length > 0 ? `${(foundWordIds.size / placedWords.length) * 100}%` : '0%' }}
            />
          </div>
          <span className={cn("text-sm font-bold", styles.progress.text)}>{foundWordIds.size}/{placedWords.length}</span>
        </div>

        {/* Timer Progress */}
        {isTimerEnabled && (() => {
          const limit = isCampaignMode
            ? (typeof campaignLevel?.timeLimitSeconds === 'number' && campaignLevel.timeLimitSeconds > 0 ? campaignLevel.timeLimitSeconds : 0)
            : isEndlessMode
              ? (typeof levelModeData?.timeLimitSeconds === 'number' && levelModeData.timeLimitSeconds > 0 ? levelModeData.timeLimitSeconds : 0)
              : isDailyMode
                ? (typeof dailyData?.timeLimitSeconds === 'number' && dailyData.timeLimitSeconds > 0 ? dailyData.timeLimitSeconds : 0)
                : 0;
          if (limit <= 0) return null;
          const remaining = Math.max(0, limit - time);
          const pct = (remaining / limit) * 100;
          const fillClass = pct > 50
            ? styles.timerProgress.fill
            : pct > 25
              ? styles.timerProgress.fillWarning
              : styles.timerProgress.fillDanger;
          const textClass = pct > 50
            ? styles.timerProgress.text
            : pct > 25
              ? styles.timerProgress.textWarning
              : styles.timerProgress.textDanger;
          return (
            <div className="mt-1.5 flex items-center gap-3">
              <div className={cn("flex-1 h-2 rounded-full overflow-hidden", styles.timerProgress.track)}>
                <div 
                  className={cn(
                    "h-full transition-[width] duration-1000 ease-linear",
                    fillClass,
                    pct <= 25 && "animate-pulse"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={cn(
                "text-xs font-bold font-mono min-w-[40px] text-right",
                textClass,
                pct <= 25 && "animate-pulse"
              )}>
                {formatTime(remaining)}
              </span>
            </div>
          );
        })()}
      </header>

      {/* Grid */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center touch-none">
        {isCampaignMode && !campaignSessionId ? (
          <div className={cn(
            "w-full max-w-sm rounded-3xl p-5 border text-center",
            styles.winModal.statCard.background,
            styles.winModal.statCard.border
          )}>
            <div className={cn("text-lg font-bold mb-1", styles.categoryTitle.text)}>
              {isCampaignStarting ? 'Запускаем уровень…' : 'Нужно начать уровень'}
            </div>
            <div className={cn("text-sm opacity-70 mb-4", styles.categoryTitle.text)}>
              {isCampaignStarting
                ? 'Вызываем /start и готовим поле'
                : 'Мы вызываем /start до показа уровня, чтобы сервер выдал sessionId античита.'}
            </div>
            <button
              onClick={() => void initCampaignGame()}
              disabled={isCampaignStarting}
              className={cn(
                "w-full py-3 rounded-xl font-semibold transition-all duration-200",
                styles.winModal.nextLevelButton.enabled,
                styles.winModal.nextLevelButton.enabledShadow,
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {isCampaignStarting ? 'Подождите…' : 'Начать'}
            </button>
          </div>
        ) : (
          <div 
            className="relative"
            style={{ 
              maxWidth: `${Math.min(gridSize * 56, 380)}px`,
              width: '100%'
            }}
          >
            <div 
              ref={gridRef}
              className={cn("grid p-3 rounded-2xl touch-none", styles.grid.background, styles.grid.gap)}
              style={{ 
                touchAction: 'none',
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              }}
            >
              {gridLetters.map((row, r) => (
                row.map((char, c) => (
                  <LetterCell
                    key={`${r}-${c}`}
                    char={char}
                    r={r} c={c}
                    status={getCellStatus(r, c)}
                    wordColor={getCellWordColor(r, c)}
                    neighbors={getCellNeighbors(r, c)}
                    // Подсказки:
                    // - авто (настройка showHints)
                    // - явная подсказка по клику на слово
                    isHint={hintCells.has(`${r}-${c}`) || manualHintCells.has(`${r}-${c}`)}
                    styles={styles}
                    onPointerDown={(e) => handlePointerDown(e, r, c)}
                  />
                ))
              ))}
            </div>

            {isCampaignStarting && (
              <div className={cn(
                "absolute inset-0 rounded-2xl flex items-center justify-center",
                "bg-black/30 backdrop-blur-sm"
              )}>
                <div className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold",
                  "bg-white/10 text-white"
                )}>
                  Готовим уровень…
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer - Words to find */}
      {((!isCampaignMode && !!levelModeSessionId) || (isCampaignMode && !!campaignSessionId)) && (
      <footer className={cn("p-4 pb-8 z-10", styles.footer.background, styles.footer.border)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn("text-xs font-bold uppercase tracking-wider", styles.footer.title)}>
            Найди слова:
          </h3>
          <div className={cn(
            "text-[10px] flex items-center gap-1 px-2 py-1 rounded-full",
            isDark ? "bg-white/10 text-white/60" : "bg-black/5 text-black/50"
          )}>
            <Eye size={10} />
            <span>нажми чтобы подсмотреть</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 content-start max-h-36 overflow-y-auto overflow-x-hidden py-1">
          {placedWords.map((pw, idx) => {
            const isFound = foundWordIds.has(pw.word.bur);
            const colorIdx = idx % wordColors.length;
            const color = wordColors[colorIdx];
            // Находим индекс среди незнайденных слов
            const unfoundIndex = placedWords
              .slice(0, idx)
              .filter(p => !foundWordIds.has(p.word.bur))
              .length;
            
            return (
              <FlippableWordChip
                key={pw.word.bur}
                word={pw.word}
                isFound={isFound}
                color={color}
                styles={styles}
                isDark={isDark}
                index={isFound ? -1 : unfoundIndex}
                onHint={() => showWordStartHint(pw)}
              />
            );
          })}
        </div>
      </footer>
      )}

      {/* Toast уведомление */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.4 }}
            className={cn(
              "fixed bottom-24 left-4 right-4 mx-auto max-w-sm z-40",
              "rounded-2xl px-4 py-3 shadow-xl",
              "flex items-center gap-3",
              styles.toast.background,
              styles.toast.border
            )}
          >
            <div className={cn("flex-shrink-0", styles.toast.icon)}>
              <Info size={20} />
            </div>
            <p className={cn("text-sm font-medium", styles.toast.text)}>
              {toastMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer onboarding modal (перед первым уроком) */}
      <AnimatePresence>
        {showTimerOnboardingModal && shouldAskTimerOnFirstLesson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn('absolute inset-0 z-50 flex items-center justify-center p-4', isDark ? 'bg-black/65' : 'bg-stone-900/45')}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              className={cn(
                'w-full max-w-sm rounded-2xl border p-5 shadow-2xl',
                isDark ? 'bg-stone-900 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', isDark ? 'bg-violet-500/20' : 'bg-violet-100')}>
                  <Clock size={18} className={cn(isDark ? 'text-violet-200' : 'text-violet-700')} />
                </div>
                <div className="min-w-0">
                  <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-stone-900')}>Как удобнее играть?</h3>
                  <p className={cn('text-sm mt-1', isDark ? 'text-white/70' : 'text-stone-600')}>
                    Можно включить таймер для динамики или играть спокойно без ограничения по времени.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 mt-4">
                <button
                  onClick={() => applyTimerOnboardingChoice(true)}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                    isDark ? 'bg-violet-500/25 hover:bg-violet-500/35 text-violet-100' : 'bg-violet-600 hover:bg-violet-700 text-white'
                  )}
                >
                  Играть с таймером
                </button>
                <button
                  onClick={() => applyTimerOnboardingChoice(false)}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                    isDark ? 'bg-white/10 hover:bg-white/15 text-white/90' : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                  )}
                >
                  Играть без таймера
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win Modal */}
      <AnimatePresence>
        {showWinModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className={cn("absolute inset-0 z-50 flex flex-col", styles.winModal.overlay)}
          >
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="min-h-full flex items-center justify-center p-4 py-6">
                <motion.div 
                  initial={{ scale: 0.9, y: 30 }} 
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                  className={cn(
                    "rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden",
                    styles.winModal.cardGradient,
                    styles.winModal.cardBorder
                  )}
                >
                  {/* Декоративный фон */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className={cn("absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl", styles.winModal.decorOrb1)} />
                    <div className={cn("absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl", styles.winModal.decorOrb2)} />
                  </div>
                  
                  {/* Компактный хедер с трофеем и заголовком в одну линию */}
                  <div className="relative z-10 px-5 pt-5 pb-3">
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="flex items-center gap-3"
                    >
                      <motion.div 
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.2, duration: 0.5 }}
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shrink-0",
                          styles.winModal.trophyGradient,
                          styles.winModal.trophyShadow
                        )}
                      >
                        <Trophy size={24} className={cn("drop-shadow-md", styles.winModal.trophyIcon)} />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h2 className={cn("text-2xl font-bold", styles.winModal.titleGradient)}>
                            Бэрхэ!
                          </h2>
                          <Sparkles size={16} className={styles.winModal.titleIcon} />
                        </div>
                        <p className={cn("text-sm truncate", styles.winModal.subtitle)}>
                          Отлично справились!
                        </p>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <StarsDisplay stars={calculateStars()} size={24} />
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Статистика — горизонтальная полоска */}
                  <motion.div 
                    className="relative z-10 px-5 pb-3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <div className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2.5 border",
                      styles.winModal.statCard.background,
                      styles.winModal.statCard.border
                    )}>
                      <div className="flex flex-col items-center flex-1">
                        <span className={cn("text-[10px] uppercase tracking-wider", styles.winModal.statCard.label)}>Время</span>
                        <span className={cn("text-base font-bold tabular-nums", styles.winModal.statCard.valueDefault)}>
                          {formatTime(serverTimeSeconds ?? time)}
                        </span>
                      </div>
                      <div className={cn("w-px h-7 opacity-20", isDark ? "bg-white" : "bg-black")} />
                      <div className="flex flex-col items-center flex-1">
                        <span className={cn("text-[10px] uppercase tracking-wider", styles.winModal.statCard.label)}>Очки</span>
                        <span className={cn("text-base font-bold tabular-nums", styles.winModal.statCard.valueScore)}>{score}</span>
                      </div>
                      <div className={cn("w-px h-7 opacity-20", isDark ? "bg-white" : "bg-black")} />
                      <div className="flex flex-col items-center flex-1">
                        <span className={cn("text-[10px] uppercase tracking-wider", styles.winModal.statCard.label)}>Слова</span>
                        <span className={cn("text-base font-bold tabular-nums", styles.winModal.statCard.valueWords)}>{foundWordIds.size}/{placedWords.length}</span>
                      </div>
                      <div className={cn("w-px h-7 opacity-20", isDark ? "bg-white" : "bg-black")} />
                      <div className="flex flex-col items-center flex-1">
                        <span className={cn("text-[10px] uppercase tracking-wider", styles.winModal.statCard.label)}>Комбо</span>
                        <span className={cn("text-base font-bold tabular-nums", styles.winModal.statCard.valueCombo)}>x{combo}</span>
                      </div>
                      {serverXpGained !== null && (
                        <>
                          <div className={cn("w-px h-7 opacity-20", isDark ? "bg-white" : "bg-black")} />
                          <div className="flex flex-col items-center flex-1">
                            <span className={cn("text-[10px] uppercase tracking-wider", styles.winModal.statCard.label)}>XP</span>
                            <span className={cn("text-base font-bold tabular-nums", styles.winModal.statCard.valueDefault)}>+{serverXpGained}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                  
                  {/* Daily: итоги + рейтинг дня */}
                  {isDailyMode && dailyResult && (
                    <motion.div
                      className="relative z-10 px-5 pb-2"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => setDailyResultTab('summary')}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                            dailyResultTab === 'summary'
                              ? (isDark ? 'bg-violet-500/30 text-violet-200' : 'bg-violet-100 text-violet-700')
                              : (isDark ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-stone-100 text-stone-500 hover:bg-stone-200')
                          )}
                        >
                          Итоги
                        </button>
                        <button
                          onClick={() => {
                            setDailyResultTab('leaderboard');
                            if (!dailyLeaderboard && !dailyLeaderboardLoading) {
                              void loadDailyLeaderboard();
                            }
                          }}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                            dailyResultTab === 'leaderboard'
                              ? (isDark ? 'bg-violet-500/30 text-violet-200' : 'bg-violet-100 text-violet-700')
                              : (isDark ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-stone-100 text-stone-500 hover:bg-stone-200')
                          )}
                        >
                          Рейтинг дня
                        </button>
                      </div>

                      {dailyResultTab === 'summary' ? (
                        <div className={cn(
                          'rounded-xl border overflow-hidden text-xs',
                          styles.winModal.statCard.background,
                          styles.winModal.statCard.border
                        )}>
                          {dailyResult.validFoundWords?.length > 0 && (
                            <div className="px-3 pt-2 pb-1">
                              <div className={cn('text-[10px] uppercase tracking-wider mb-1 font-semibold', styles.winModal.statCard.label)}>
                                Найдено ✓
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                {dailyResult.validFoundWords.map((w, i) => (
                                  <span key={i} className={cn('tabular-nums', styles.winModal.statCard.valueWords)}>
                                    {w.bur} <span className={cn('opacity-60', styles.winModal.statCard.label)}>— {w.rus}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {dailyResult.missedWords && dailyResult.missedWords.length > 0 && (
                            <div className={cn('px-3 pb-2', dailyResult.validFoundWords?.length ? 'pt-1' : 'pt-2')}>
                              <div className={cn('text-[10px] uppercase tracking-wider mb-1 font-semibold opacity-60', styles.winModal.statCard.label)}>
                                Не найдено ✗
                              </div>
                              <div className={cn('flex flex-wrap gap-x-3 gap-y-0.5 opacity-70', styles.winModal.statCard.valueDefault)}>
                                {dailyResult.missedWords.map((w, i) => (
                                  <span key={i}>{w.rus}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={cn(
                          'rounded-xl border overflow-hidden text-xs',
                          styles.winModal.statCard.background,
                          styles.winModal.statCard.border
                        )}>
                          {dailyLeaderboardLoading ? (
                            <div className="px-3 py-4 flex items-center justify-center gap-2">
                              <Clock size={14} className={cn('animate-spin', styles.winModal.statCard.label)} />
                              <span className={styles.winModal.statCard.label}>Загружаем рейтинг…</span>
                            </div>
                          ) : dailyLeaderboardError ? (
                            <div className="px-3 py-3">
                              <div className={cn('text-[11px]', isDark ? 'text-red-300' : 'text-red-600')}>{dailyLeaderboardError}</div>
                              <button
                                onClick={() => void loadDailyLeaderboard()}
                                className={cn(
                                  'mt-2 px-2 py-1 rounded-md text-[11px] font-semibold',
                                  isDark ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                )}
                              >
                                Обновить
                              </button>
                            </div>
                          ) : dailyLeaderboard ? (
                            <>
                              <div className="px-3 pt-2 pb-1">
                                <div className={cn('text-[10px] uppercase tracking-wider', styles.winModal.statCard.label)}>
                                  Участников сегодня: <span className="font-semibold">{dailyLeaderboard.totalParticipants}</span>
                                  {dailyLeaderboard.myRank ? (
                                    <span className="ml-2">• Ваше место: <span className="font-semibold">#{dailyLeaderboard.myRank}</span></span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="max-h-40 overflow-y-auto px-2 pb-2 space-y-1">
                                {dailyLeaderboard.entries.map((row) => (
                                  <div
                                    key={`${row.userId}-${row.rank}`}
                                    className={cn(
                                      'rounded-lg px-2 py-1.5 flex items-center gap-2',
                                      row.isCurrentUser
                                        ? (isDark ? 'bg-violet-500/20' : 'bg-violet-100')
                                        : (isDark ? 'bg-white/5' : 'bg-stone-50')
                                    )}
                                  >
                                    <div className={cn('w-6 text-center font-bold text-[11px]', styles.winModal.statCard.label)}>
                                      #{row.rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className={cn('text-[11px] font-semibold truncate', styles.winModal.statCard.valueDefault)}>
                                        {row.name}{row.isCurrentUser ? ' (вы)' : ''}
                                      </div>
                                      <div className={cn('text-[10px] opacity-70 tabular-nums', styles.winModal.statCard.label)}>
                                        {row.stars}★{typeof row.bestTimeSeconds === 'number' ? ` • ${formatTime(row.bestTimeSeconds)}` : ''}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="px-3 py-3">
                              <div className={styles.winModal.statCard.label}>Данные рейтинга пока не готовы.</div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Кнопки */}
                  <motion.div 
                    className="relative z-10 px-5 pb-5 space-y-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    {/* Кнопка следующего уровня / назад для daily */}
                    {isDailyMode ? (
                      <button
                        onClick={goBack}
                        className={cn(
                          "w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200",
                          `${styles.winModal.nextLevelButton.enabled} ${styles.winModal.nextLevelButton.enabledShadow} hover:scale-[1.02] active:scale-[0.98]`
                        )}
                      >
                        <span>К выбору режима</span>
                        <ChevronRight size={18} />
                      </button>
                    ) : isEndlessMode ? (
                      (() => {
                        const nextLevel = endlessLevel + 1;
                        const canGoNext = levelModeResult?.nextLevelUnlocked === true;
                        
                        return (
                          <button 
                            onClick={() => canGoNext && selectEndlessLevel(nextLevel)}
                            disabled={!canGoNext}
                            className={cn(
                              "w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200",
                              canGoNext 
                                ? `${styles.winModal.nextLevelButton.enabled} ${styles.winModal.nextLevelButton.enabledShadow} hover:scale-[1.02] active:scale-[0.98]`
                                : styles.winModal.nextLevelButton.disabled
                            )}
                          >
                            {canGoNext ? (
                              <>
                                <span>Уровень {nextLevel}</span>
                                <ChevronRight size={18} />
                              </>
                            ) : (
                              <>
                                <Lock size={16} />
                                <span>Нужно найти больше слов</span>
                              </>
                            )}
                          </button>
                        );
                      })()
                    ) : (
                      (() => {
                        const nextSlug = campaignResult?.unlockedLevelSlugs?.[0];
                        if (nextSlug) {
                          return (
                            <button
                              onClick={() => store.selectCategory(nextSlug)}
                              className={cn(
                                "w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200",
                                `${styles.winModal.nextLevelButton.enabled} ${styles.winModal.nextLevelButton.enabledShadow} hover:scale-[1.02] active:scale-[0.98]`
                              )}
                            >
                              <span>Следующий уровень</span>
                              <ChevronRight size={18} />
                            </button>
                          );
                        }

                        return (
                          <button
                            onClick={() => navigate('levels')}
                            className={cn(
                              "w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200",
                              `${styles.winModal.nextLevelButton.enabled} ${styles.winModal.nextLevelButton.enabledShadow} hover:scale-[1.02] active:scale-[0.98]`
                            )}
                          >
                            <span>К списку уровней</span>
                            <ChevronRight size={18} />
                          </button>
                        );
                      })()
                    )}
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (isDailyMode) {
                            void initDailyGame();
                          } else if (isEndlessMode) {
                            void initLevelModeGame();
                          } else {
                            void initCampaignGame();
                          }
                        }}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm",
                          styles.winModal.secondaryButton.background,
                          styles.winModal.secondaryButton.backgroundHover,
                          styles.winModal.secondaryButton.text
                        )}
                      >
                        <RotateCcw size={15} />
                        Ещё раз
                      </button>
                      <button 
                        onClick={shareResult}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 text-sm",
                          styles.winModal.secondaryButton.background,
                          styles.winModal.secondaryButton.backgroundHover,
                          styles.winModal.secondaryButton.text
                        )}
                      >
                        <Share2 size={15} />
                        Поделиться
                      </button>
                    </div>
                    
                    {/* Admin: кнопка редактирования уровня */}
                    {isAdmin && isEndlessMode && (
                      <button
                        onClick={() => navigateToLevelEditor(endlessLevel)}
                        className={cn(
                          "w-full py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors text-sm",
                          "bg-violet-500/20 hover:bg-violet-500/30 text-violet-400"
                        )}
                      >
                        <Settings2 size={14} />
                        Настроить уровень
                      </button>
                    )}

                    <button 
                      onClick={handleBack}
                      className={cn(
                        "w-full py-2 text-sm font-medium transition-colors",
                        styles.winModal.backLink.text,
                        styles.winModal.backLink.textHover
                      )}
                    >
                      ← {isDailyMode ? 'К выбору режима' : isEndlessMode ? 'К списку уровней' : 'К категориям'}
                    </button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameScreen;

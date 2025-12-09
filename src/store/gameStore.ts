// src/store/gameStore.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  GameState, 
  GameSettings, 
  PlayerStats, 
  LevelProgress, 
  LeaderboardEntry,
  Screen,
  GameMode,
  EndlessProgress,
  LevelPack
} from '../types';

const STORAGE_KEY = 'buryat_fillword_game';

const defaultSettings: GameSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  theme: 'steppe',
  showHints: false,
  timerEnabled: true,
  playerName: 'Игрок',
  publicProfile: true,
  notificationsEnabled: true,
};

const defaultStats: PlayerStats = {
  totalWordsFound: 0,
  totalGamesPlayed: 0,
  totalTimePlayed: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPlayedDate: null,
  totalStars: 0,
  level: 1,
  xp: 0,
  learnedWords: [],
  wordFindCounts: {},
};

const defaultEndlessProgress: EndlessProgress = {
  currentLevel: 1,
  completedLevels: [],
  levelStars: {},
  totalStars: 0,
};

const defaultGameState: GameState = {
  currentScreen: 'menu',
  selectedCategory: null,
  selectedLevelPack: null,
  selectedEndlessLevel: null,
  gameMode: 'campaign',
  settings: defaultSettings,
  stats: defaultStats,
  levelProgress: {},
  endlessProgress: defaultEndlessProgress,
  leaderboard: [],
};

// Конфигурация пакетов уровней
export const LEVEL_PACKS: LevelPack[] = [
  {
    id: 'novice',
    name: 'Новичок',
    description: 'Первые шаги в изучении',
    emoji: '🌱',
    levelStart: 1,
    levelEnd: 50,
    unlockRequirement: 0, // открыт сразу
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'student',
    name: 'Ученик',
    description: 'Путь познания',
    emoji: '📚',
    levelStart: 51,
    levelEnd: 100,
    unlockRequirement: 40, // нужно пройти 40 уровней из первого пакета
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'master',
    name: 'Мастер',
    description: 'Глубокое понимание',
    emoji: '🎓',
    levelStart: 101,
    levelEnd: 150,
    unlockRequirement: 90, // нужно пройти 90 уровней
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    id: 'legend',
    name: 'Легенда',
    description: 'Вершина мастерства',
    emoji: '👑',
    levelStart: 151,
    levelEnd: 200,
    unlockRequirement: 140, // нужно пройти 140 уровней
    gradient: 'from-amber-500 to-orange-600',
  },
];

// Загрузка состояния из localStorage
const loadState = (): GameState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaultGameState,
        ...parsed,
        settings: { ...defaultSettings, ...parsed.settings },
        stats: { ...defaultStats, ...parsed.stats },
        endlessProgress: { ...defaultEndlessProgress, ...parsed.endlessProgress },
      };
    }
  } catch (e) {
    console.error('Failed to load game state:', e);
  }
  return defaultGameState;
};

// Сохранение состояния
const saveState = (state: GameState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
};

// XP для каждого уровня
const XP_PER_LEVEL = 100;
const XP_PER_WORD = 10;
const XP_PER_STAR = 25;
const XP_BONUS_FAST = 50; // Бонус за быстрое прохождение

// Хук для управления состоянием игры
export const useGameStore = () => {
  const [state, setState] = useState<GameState>(loadState);

  // Сохраняем при каждом изменении
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Навигация
  const navigate = useCallback((screen: Screen) => {
    setState(prev => ({ ...prev, currentScreen: screen }));
  }, []);

  const selectCategory = useCallback((categoryId: string) => {
    setState(prev => ({ 
      ...prev, 
      selectedCategory: categoryId,
      gameMode: 'campaign',
      currentScreen: 'game' 
    }));
  }, []);

  // Выбор режима игры
  const setGameMode = useCallback((mode: GameMode) => {
    setState(prev => ({ ...prev, gameMode: mode }));
  }, []);

  // Выбор пакета уровней
  const selectLevelPack = useCallback((packId: string) => {
    setState(prev => ({ 
      ...prev, 
      selectedLevelPack: packId,
      currentScreen: 'levelPack' 
    }));
  }, []);

  // Выбор уровня в бесконечном режиме
  const selectEndlessLevel = useCallback((level: number) => {
    setState(prev => ({ 
      ...prev, 
      selectedEndlessLevel: level,
      gameMode: 'endless',
      currentScreen: 'game' 
    }));
  }, []);

  // Проверка разблокировки пакета уровней
  const isPackUnlocked = useCallback((pack: LevelPack): boolean => {
    return state.endlessProgress.completedLevels.length >= pack.unlockRequirement;
  }, [state.endlessProgress.completedLevels.length]);

  // Получение прогресса в пакете
  const getPackProgress = useCallback((pack: LevelPack): { completed: number; total: number; stars: number } => {
    const completedInPack = state.endlessProgress.completedLevels.filter(
      level => level >= pack.levelStart && level <= pack.levelEnd
    ).length;
    
    const starsInPack = Object.entries(state.endlessProgress.levelStars)
      .filter(([level]) => {
        const l = parseInt(level);
        return l >= pack.levelStart && l <= pack.levelEnd;
      })
      .reduce((sum: number, [, stars]) => sum + stars, 0);

    return {
      completed: completedInPack,
      total: pack.levelEnd - pack.levelStart + 1,
      stars: starsInPack,
    };
  }, [state.endlessProgress]);

  // Настройки
  const updateSettings = useCallback((updates: Partial<GameSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
  }, []);

  // Обновление streak
  const updateStreak = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    
    setState(prev => {
      const lastPlayed = prev.stats.lastPlayedDate;
      let newStreak = prev.stats.currentStreak;
      
      if (lastPlayed) {
        const lastDate = new Date(lastPlayed);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          // Уже играли сегодня
        } else if (diffDays === 1) {
          // Играли вчера - продолжаем streak
          newStreak += 1;
        } else {
          // Пропустили день(и) - сброс streak
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      return {
        ...prev,
        stats: {
          ...prev.stats,
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, prev.stats.longestStreak),
          lastPlayedDate: today,
        }
      };
    });
  }, []);

  // Завершение уровня в бесконечном режиме
  const completeEndlessLevel = useCallback((
    level: number,
    wordsFound: string[],
    timeSpent: number,
    totalWords: number
  ) => {
    setState(prev => {
      // Расчёт звёзд
      let stars: 0 | 1 | 2 | 3 = 0;
      const completion = wordsFound.length / totalWords;
      if (completion >= 1) stars = 3;
      else if (completion >= 0.7) stars = 2;
      else if (completion >= 0.5) stars = 1;

      const existingStars = prev.endlessProgress.levelStars[level] || 0;
      const newStars = Math.max(stars, existingStars) as 0 | 1 | 2 | 3;
      
      const newCompletedLevels = prev.endlessProgress.completedLevels.includes(level)
        ? prev.endlessProgress.completedLevels
        : [...prev.endlessProgress.completedLevels, level];

      const newLevelStars = {
        ...prev.endlessProgress.levelStars,
        [level]: newStars,
      };

      const totalStars = Object.values(newLevelStars).reduce((sum: number, s) => sum + s, 0);

      // XP
      const xpGained = 
        wordsFound.length * XP_PER_WORD + 
        stars * XP_PER_STAR +
        (timeSpent < 60 ? XP_BONUS_FAST : 0);

      const newXp = prev.stats.xp + xpGained;
      const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

      // Обновление wordFindCounts
      const newWordCounts = { ...prev.stats.wordFindCounts };
      wordsFound.forEach(word => {
        newWordCounts[word] = (newWordCounts[word] || 0) + 1;
      });

      // Проверка выученных слов (найдены 3+ раз)
      const newLearnedWords = [...prev.stats.learnedWords];
      wordsFound.forEach(word => {
        if (newWordCounts[word] >= 3 && !newLearnedWords.includes(word)) {
          newLearnedWords.push(word);
        }
      });

      return {
        ...prev,
        endlessProgress: {
          ...prev.endlessProgress,
          completedLevels: newCompletedLevels,
          levelStars: newLevelStars,
          totalStars,
          currentLevel: Math.max(prev.endlessProgress.currentLevel, level + 1),
        },
        stats: {
          ...prev.stats,
          totalWordsFound: prev.stats.totalWordsFound + wordsFound.length,
          totalGamesPlayed: prev.stats.totalGamesPlayed + 1,
          totalTimePlayed: prev.stats.totalTimePlayed + timeSpent,
          level: newLevel,
          xp: newXp,
          learnedWords: newLearnedWords,
          wordFindCounts: newWordCounts,
        },
      };
    });

    updateStreak();
  }, [updateStreak]);

  // Завершение уровня
  const completeLevel = useCallback((
    categoryId: string,
    wordsFound: string[],
    timeSpent: number,
    totalWords: number
  ) => {
    setState(prev => {
      // Расчёт звёзд
      let stars: 0 | 1 | 2 | 3 = 0;
      const completion = wordsFound.length / totalWords;
      if (completion >= 1) stars = 3;
      else if (completion >= 0.7) stars = 2;
      else if (completion >= 0.5) stars = 1;

      // Расчёт очков
      const baseScore = wordsFound.length * 100;
      const timeBonus = Math.max(0, 300 - timeSpent) * 2; // Бонус за время < 5 минут
      const score = baseScore + timeBonus;

      // Обновление wordFindCounts
      const newWordCounts = { ...prev.stats.wordFindCounts };
      wordsFound.forEach(word => {
        newWordCounts[word] = (newWordCounts[word] || 0) + 1;
      });

      // Проверка выученных слов (найдены 3+ раз)
      const newLearnedWords = [...prev.stats.learnedWords];
      wordsFound.forEach(word => {
        if (newWordCounts[word] >= 3 && !newLearnedWords.includes(word)) {
          newLearnedWords.push(word);
        }
      });

      // XP
      const xpGained = 
        wordsFound.length * XP_PER_WORD + 
        stars * XP_PER_STAR +
        (timeSpent < 60 ? XP_BONUS_FAST : 0);

      const newXp = prev.stats.xp + xpGained;
      const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

      // Обновление прогресса уровня
      const existingProgress = prev.levelProgress[categoryId];
      const newProgress: LevelProgress = {
        categoryId,
        stars: Math.max(stars, existingProgress?.stars || 0) as 0 | 1 | 2 | 3,
        bestTime: existingProgress?.bestTime 
          ? Math.min(timeSpent, existingProgress.bestTime) 
          : timeSpent,
        bestScore: Math.max(score, existingProgress?.bestScore || 0),
        completed: stars === 3 || existingProgress?.completed || false,
        playCount: (existingProgress?.playCount || 0) + 1,
      };

      // Расчёт общих звёзд
      const allProgress = { ...prev.levelProgress, [categoryId]: newProgress };
      const totalStars = Object.values(allProgress).reduce((sum, p) => sum + p.stars, 0);

      return {
        ...prev,
        levelProgress: allProgress,
        stats: {
          ...prev.stats,
          totalWordsFound: prev.stats.totalWordsFound + wordsFound.length,
          totalGamesPlayed: prev.stats.totalGamesPlayed + 1,
          totalTimePlayed: prev.stats.totalTimePlayed + timeSpent,
          totalStars,
          level: newLevel,
          xp: newXp,
          learnedWords: newLearnedWords,
          wordFindCounts: newWordCounts,
        }
      };
    });

    updateStreak();
  }, [updateStreak]);

  // Добавление в лидерборд
  const addToLeaderboard = useCallback((entry: Omit<LeaderboardEntry, 'date'>) => {
    setState(prev => {
      const newEntry: LeaderboardEntry = {
        ...entry,
        date: new Date().toISOString(),
      };
      
      const newLeaderboard = [...prev.leaderboard, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 100); // Храним топ-100

      return { ...prev, leaderboard: newLeaderboard };
    });
  }, []);

  // Сброс прогресса
  const resetProgress = useCallback(() => {
    setState(defaultGameState);
  }, []);

  // Получение прогресса уровня
  const getLevelProgress = useCallback((categoryId: string): LevelProgress | null => {
    return state.levelProgress[categoryId] || null;
  }, [state.levelProgress]);

  // Проверка разблокировки уровня
  const isLevelUnlocked = useCallback((unlockRequirement: number): boolean => {
    return state.stats.totalStars >= unlockRequirement;
  }, [state.stats.totalStars]);

  // Мемоизированные значения
  const xpToNextLevel = useMemo(() => {
    return XP_PER_LEVEL - (state.stats.xp % XP_PER_LEVEL);
  }, [state.stats.xp]);

  const xpProgress = useMemo(() => {
    return (state.stats.xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  }, [state.stats.xp]);

  return {
    state,
    navigate,
    selectCategory,
    setGameMode,
    selectLevelPack,
    selectEndlessLevel,
    isPackUnlocked,
    getPackProgress,
    completeEndlessLevel,
    updateSettings,
    completeLevel,
    addToLeaderboard,
    resetProgress,
    getLevelProgress,
    isLevelUnlocked,
    xpToNextLevel,
    xpProgress,
  };
};

export type GameStore = ReturnType<typeof useGameStore>;


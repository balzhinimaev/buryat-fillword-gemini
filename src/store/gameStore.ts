// src/store/gameStore.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  GameState, 
  GameSettings, 
  PlayerStats, 
  LevelProgress, 
  LeaderboardEntry,
  Screen 
} from '../types';

const STORAGE_KEY = 'buryat_fillword_game';

const defaultSettings: GameSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  theme: 'baikal',
  showHints: false,
  timerEnabled: true,
  playerName: 'Игрок',
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

const defaultGameState: GameState = {
  currentScreen: 'menu',
  selectedCategory: null,
  settings: defaultSettings,
  stats: defaultStats,
  levelProgress: {},
  leaderboard: [],
};

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
      currentScreen: 'game' 
    }));
  }, []);

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


// src/types.ts

export interface WordData {
  bur: string;
  ru: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  description: string;
  words: WordData[];
  difficulty: 'easy' | 'medium' | 'hard';
  gridSize: number;
  unlockRequirement: number; // Сколько звёзд нужно для разблокировки
}

export interface LevelProgress {
  categoryId: string;
  stars: 0 | 1 | 2 | 3; // 0-3 звезды
  bestTime: number | null; // в секундах
  bestScore: number;
  completed: boolean;
  playCount: number;
}

export interface PlayerStats {
  totalWordsFound: number;
  totalGamesPlayed: number;
  totalTimePlayed: number; // в секундах
  currentStreak: number; // дней подряд
  longestStreak: number;
  lastPlayedDate: string | null; // ISO date
  totalStars: number;
  level: number;
  xp: number;
  learnedWords: string[]; // бурятские слова, которые нашли хотя бы 3 раза
  wordFindCounts: Record<string, number>; // сколько раз нашли каждое слово
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  categoryId: string;
  time: number;
  date: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  theme: 'light' | 'dark' | 'baikal';
  showHints: boolean;
  timerEnabled: boolean;
  playerName: string;
}

export interface GameState {
  currentScreen: Screen;
  selectedCategory: string | null;
  settings: GameSettings;
  stats: PlayerStats;
  levelProgress: Record<string, LevelProgress>;
  leaderboard: LeaderboardEntry[];
}

export type Screen = 
  | 'menu' 
  | 'levels' 
  | 'game' 
  | 'settings' 
  | 'stats' 
  | 'leaderboard'
  | 'dictionary';

export type Coord = { r: number; c: number };

export type CellStatus = 'idle' | 'selected' | 'found';


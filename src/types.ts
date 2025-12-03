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

// Доступные темы оформления
export type ThemeId = 'steppe' | 'light' | 'dark';

export interface GameSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  theme: ThemeId;
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
  | 'dictionary'
  | 'debug'
  | 'contribute'; // Үгын Дархан - Словарная мастерская

export type Coord = { r: number; c: number };

export type CellStatus = 'idle' | 'selected' | 'found';

// === Система контрибуции слов ("Үгын Дархан" - Словарная Мастерская) ===

export type ContributionStatus = 'pending' | 'verified' | 'rejected';

export interface ContributedWord {
  id: string;
  bur: string; // бурятское слово (в верхнем регистре)
  ru: string; // русский перевод
  categoryId: string; // id категории из categories или 'other'
  example?: string; // пример использования (опционально)
  contributor: {
    name: string;
    telegram?: string; // для связи и благодарностей
  };
  createdAt: string; // ISO date
  status: ContributionStatus;
  verifications: string[]; // id пользователей, подтвердивших слово
  flags: string[]; // id пользователей, отметивших как неправильное
  notes?: string; // заметки от модератора
}

export interface Contributor {
  id: string;
  name: string;
  telegram?: string;
  wordsAdded: number;
  wordsVerified: number;
  wordsApproved: number; // сколько добавленных слов было одобрено
  joinedAt: string;
  lastActiveAt: string;
}

export interface ContributionStats {
  totalWords: number;
  pendingWords: number;
  verifiedWords: number;
  rejectedWords: number;
  topContributors: { name: string; count: number }[];
}

export interface ContributionState {
  words: ContributedWord[];
  contributors: Contributor[];
  currentContributor: Contributor | null;
}


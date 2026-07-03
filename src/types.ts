// src/types.ts

export interface WordData {
  bur: string;
  ru: string;
  /** переводы на другие языки подсказок: { en: "Dog" } */
  translations?: Record<string, string>;
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

// Сложность игры
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  theme: ThemeId;
  showHints: boolean;
  timerEnabled: boolean;
  playerName: string;
  publicProfile: boolean;
  notificationsEnabled: boolean;
  hasSeenHowTo: boolean; // пройдено ли обучение "Как играть"
  hasSeenTimerOnboarding: boolean; // показан ли выбор режима таймера перед первым уроком
  difficulty: Difficulty; // сложность игры
}

export interface GameState {
  currentScreen: Screen;
  screenHistory: Screen[]; // стек навигации для кнопки «назад»
  selectedCategory: string | null;
  selectedLevelPack: string | null; // выбранный пакет уровней
  selectedEndlessLevel: number | null; // выбранный уровень в бесконечном режиме
  selectedWordId: string | null; // выбранное слово для детальной страницы
  gameMode: GameMode; // текущий режим игры
  campaignResumeSlug: string | null; // slug уровня для сценария resume-first-flow
  campaignLandingView: 'chapters' | 'modules' | null; // какой раздел открыть в экране первой главы
  campaignPreferredModuleId: string | null; // id модуля, который нужно открыть сразу при входе в «Спецмодули»
  adminEditLevelNumber: number | null; // номер уровня для редактора (null = создание нового)
  adminEditDailyDate: string | null; // дата для редактора филлворда дня (null = создание нового, 'YYYY-MM-DD' = редактирование)
  adminCampaignMapLessonSlug: string | null; // slug урока для редактора карт кампании
  settings: GameSettings;
  stats: PlayerStats;
  levelProgress: Record<string, LevelProgress>;
  endlessProgress: EndlessProgress; // прогресс в бесконечном режиме
  leaderboard: LeaderboardEntry[];
}

export type Screen = 
  | 'menu' 
  | 'gameMode' // Выбор режима игры
  | 'levels' // Категории (кампания)
  | 'levelPack' // Выбор уровня в пакете
  | 'game' 
  | 'settings' 
  | 'stats' 
  | 'leaderboard'
  | 'dictionary'
  | 'wordDetail' // Детальная страница слова
  | 'debug'
  | 'admin' // Админ-панель
  | 'adminCampaign' // Управление главами/уроками кампании (админ)
  | 'broadcast' // Рассылка сообщений
  | 'contribute' // Үгын Дархан - Словарная мастерская
  | 'onboarding' // Онбординг для новых пользователей
  | 'howto' // Обучение "Как играть"
  | 'adminLevelEditor' // Редактор уровней (админ)
  | 'adminDailyWord' // Редактор филлвордов дня (админ)
  | 'adminCampaignMaps' // Редактор карт уроков кампании (админ)
  | 'adminDictionary' // Офлайн-редактор словаря (админ)
  | 'support'; // Поддержать проект

// === Режимы игры ===
export type GameMode = 'campaign' | 'endless' | 'daily';

// Пакеты уровней для бесконечного режима
export interface LevelPack {
  id: string;
  name: string;
  description: string;
  emoji: string;
  levelStart: number; // начальный уровень (1, 51, 101, 151)
  levelEnd: number;   // конечный уровень (50, 100, 150, 200)
  unlockRequirement: number; // сколько уровней из предыдущего пакета нужно пройти
  gradient: string; // цвет градиента для карточки
}

// Прогресс в уровневом режиме
export interface EndlessProgress {
  currentLevel: number; // текущий уровень игрока
  completedLevels: number[]; // пройденные уровни
  levelStars: Record<number, 0 | 1 | 2 | 3>; // звёзды за каждый уровень
  totalStars: number; // всего звёзд в бесконечном режиме
}

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
  serverId?: string; // _id слова на сервере после успешной выгрузки (push)
  syncedAt?: string; // ISO-время последней синхронизации
  serverStatus?: ContributionStatus; // статус, подтянутый с сервера (pull)
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


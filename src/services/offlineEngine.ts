// Локальный (офлайн) движок уровневого режима.
// Полностью заменяет серверные эндпоинты level-mode: генерация уровня из вшитого
// словаря, подсчёт звёзд и хранение прогресса в localStorage. Сетка строится тем же
// клиентским gameEngine, что и для серверных уровней.
import type {
  LevelModeLevelResponse,
  LevelModeProgressResponse,
  LevelModeSubmitRequest,
  LevelModeSubmitResponse,
  LevelModeLevelLeaderboardResponse,
} from './api';
import wordsData from '../data/offlineWords.json';

interface OfflineWord {
  bur: string;
  ru: string;
  difficulty: number;
}

const DICT = wordsData as OfflineWord[];
const PROGRESS_KEY = 'offline_lm_progress';

interface StoredLevel {
  stars: number;
  bestTimeSeconds: number;
  attempts: number;
  firstCompletedAt: string;
}
type ProgressMap = Record<string, StoredLevel>;

function loadProgress(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') as ProgressMap;
  } catch {
    return {};
  }
}
function saveProgress(p: ProgressMap): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

// Прогрессия параметров уровня по его номеру.
export function offlineLevelParams(n: number): {
  gridSize: number;
  wordCount: number;
  maxDifficulty: number;
  timeLimitSeconds: number;
} {
  const lvl = Math.max(1, n);
  const gridSize = Math.min(9, 5 + Math.floor((lvl - 1) / 6)); // 5 → 9
  const wordCount = Math.min(10, 4 + Math.floor((lvl - 1) / 4)); // 4 → 10
  const maxDifficulty = Math.min(9, 2 + Math.floor((lvl - 1) / 3)); // 2 → 9
  const timeLimitSeconds = Math.max(60, 180 - (lvl - 1) * 4); // 180 → 60
  return { gridSize, wordCount, maxDifficulty, timeLimitSeconds };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Подбор слов под уровень: по сложности и так, чтобы помещались в сетку.
function pickWords(n: number): OfflineWord[] {
  const { gridSize, wordCount, maxDifficulty } = offlineLevelParams(n);
  let pool = DICT.filter(
    (w) => w.difficulty <= maxDifficulty && w.bur.length >= 2 && w.bur.length <= gridSize,
  );
  if (pool.length < wordCount) {
    // ослабляем фильтр сложности, оставляя ограничение по длине
    pool = DICT.filter((w) => w.bur.length >= 2 && w.bur.length <= gridSize);
  }
  if (pool.length < wordCount) {
    pool = DICT.filter((w) => w.bur.length >= 2);
  }
  return shuffle(pool).slice(0, Math.min(wordCount, pool.length));
}

function makeSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return 'offline-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function offlineGetLevel(levelNumber: number): LevelModeLevelResponse {
  const { gridSize, timeLimitSeconds } = offlineLevelParams(levelNumber);
  const picked = pickWords(levelNumber);
  const prev = loadProgress()[String(levelNumber)];
  return {
    levelNumber,
    words: picked.map((w, i) => ({ bur: w.bur, rus: w.ru, wordId: `offline-${levelNumber}-${i}` })),
    gridSize,
    timeLimitSeconds,
    maxStars: 3,
    currentStars: prev?.stars ?? null,
    bestTimeSeconds: prev?.bestTimeSeconds ?? null,
    sessionId: makeSessionId(),
    sessionExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    isManual: false,
  };
}

export function offlineGetProgress(): LevelModeProgressResponse {
  const map = loadProgress();
  const nums = Object.keys(map).map(Number).filter((x) => !Number.isNaN(x));
  const maxCompletedLevel = nums.length ? Math.max(...nums.filter((n) => map[String(n)].stars > 0), 0) : 0;
  const totalStars = nums.reduce((s, n) => s + (map[String(n)].stars || 0), 0);
  const levelsCompleted = nums.filter((n) => map[String(n)].stars > 0).length;
  const perfectLevels = nums.filter((n) => map[String(n)].stars >= 3).length;
  return {
    maxUnlockedLevel: maxCompletedLevel + 1,
    maxCompletedLevel,
    totalStars,
    levelsCompleted,
    perfectLevels,
    levels: nums
      .sort((a, b) => a - b)
      .map((n) => ({
        levelNumber: n,
        stars: map[String(n)].stars,
        bestTimeSeconds: map[String(n)].bestTimeSeconds,
        attempts: map[String(n)].attempts,
        firstCompletedAt: map[String(n)].firstCompletedAt,
      })),
  };
}

export function offlineSubmit(
  levelNumber: number,
  body: LevelModeSubmitRequest,
): LevelModeSubmitResponse {
  const { timeLimitSeconds } = offlineLevelParams(levelNumber);
  // Реальное число слов уровня берём не из нового сэмпла, а из переданных found + missed нельзя — поэтому
  // считаем по факту: всё что нашли. Total оцениваем по wordCount уровня.
  const wordsTotal = offlineLevelParams(levelNumber).wordCount;
  const found = Array.isArray(body.foundWords) ? body.foundWords.length : 0;
  const allFound = found >= wordsTotal;
  const t = body.timeSeconds ?? timeLimitSeconds;
  let earnedStars = 0;
  if (allFound) earnedStars = t < timeLimitSeconds * 0.5 ? 3 : t < timeLimitSeconds ? 2 : 1;

  const map = loadProgress();
  const key = String(levelNumber);
  const prev = map[key];
  const previousBestStars = prev?.stars ?? null;
  const previousBestTime = prev?.bestTimeSeconds ?? null;
  const isNewStarRecord = earnedStars > (prev?.stars ?? 0);
  const isNewTimeRecord = allFound && (prev?.bestTimeSeconds == null || t < prev.bestTimeSeconds);
  map[key] = {
    stars: Math.max(prev?.stars ?? 0, earnedStars),
    bestTimeSeconds: isNewTimeRecord ? t : prev?.bestTimeSeconds ?? t,
    attempts: (prev?.attempts ?? 0) + 1,
    firstCompletedAt: prev?.firstCompletedAt ?? new Date().toISOString(),
  };
  saveProgress(map);

  return {
    success: true,
    earnedStars,
    isNewStarRecord,
    isNewTimeRecord,
    previousBestTime,
    timeSeconds: t,
    nextLevelUnlocked: earnedStars > 0,
    wordsFound: found,
    wordsTotal,
    wordsFoundPercent: wordsTotal ? Math.round((found / wordsTotal) * 100) : 0,
    validFoundWords: body.foundWords ?? [],
    missedWords: [],
    invalidWords: null,
    timeLimitSeconds,
    previousBestStars,
    attemptNumber: map[key].attempts,
    xpGained: earnedStars * 10,
    totalXp: 0,
    userLevel: 1,
    leveledUp: false,
    xpReason: 'offline',
  };
}

export function offlineLeaderboard(levelNumber: number): LevelModeLevelLeaderboardResponse {
  return {
    levelNumber,
    totalParticipants: 0,
    totalAttempts: 0,
    entries: [],
  };
}

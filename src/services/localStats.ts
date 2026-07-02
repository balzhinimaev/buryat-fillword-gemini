// Локальная статистика игрока — источник истины в офлайн-сборке.
// Читает сохранённое состояние gameStore напрямую из localStorage, чтобы
// офлайн-реализации /auth/me и /activity/streak отдавали реальные цифры, а не нули.
import type { MeXpInfo } from './api';

const GAME_KEY = 'buryat_fillword_game';
// Должны совпадать с gameStore.ts
const XP_PER_LEVEL = 100;

export interface StoredPlayerStats {
  currentStreak?: number;
  longestStreak?: number;
  lastPlayedDate?: string | null;
  xp?: number;
  level?: number;
  totalWordsFound?: number;
  totalGamesPlayed?: number;
  totalTimePlayed?: number;
}

export function loadLocalPlayerStats(): StoredPlayerStats {
  try {
    const parsed = JSON.parse(localStorage.getItem(GAME_KEY) || 'null') as {
      stats?: StoredPlayerStats;
    } | null;
    return parsed?.stats ?? {};
  } catch {
    return {};
  }
}

const dayKey = (d: Date) => d.toISOString().split('T')[0];

export interface LocalStreak {
  current: number;
  longest: number;
  lastActiveDate?: string;
  isActive: boolean;
}

// Серия дней с учётом «протухания»: если последний раунд был позавчера и раньше —
// серия уже прервана, показываем 0 (gameStore хранит старое значение до следующей игры).
export function localStreak(now = new Date()): LocalStreak {
  const s = loadLocalPlayerStats();
  const last = s.lastPlayedDate || undefined;
  let current = s.currentStreak || 0;
  let isActive = false;

  if (last) {
    const diffDays = Math.floor((Date.parse(dayKey(now)) - Date.parse(last)) / 86_400_000);
    if (diffDays <= 0) {
      isActive = true; // сегодня уже играли
    } else if (diffDays > 1) {
      current = 0; // пропущен день — серия прервана
    }
  } else {
    current = 0;
  }

  return { current, longest: s.longestStreak || 0, lastActiveDate: last, isActive };
}

export function localXpInfo(): MeXpInfo {
  const s = loadLocalPlayerStats();
  const xp = Math.max(0, s.xp || 0);
  const inLevel = xp % XP_PER_LEVEL;
  return {
    total: xp,
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    xpInCurrentLevel: inLevel,
    xpToNextLevel: XP_PER_LEVEL,
    xpRemainingToNextLevel: XP_PER_LEVEL - inLevel,
    progressPercent: Math.round((inLevel / XP_PER_LEVEL) * 100),
  };
}

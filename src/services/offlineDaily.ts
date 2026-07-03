// Офлайн «Филлворд дня»: детерминированный пазл по дате из вшитого словаря.
// У всех игроков в один день одинаковый набор слов (сеяный PRNG от даты),
// результаты хранятся локально. В офлайн-сборке используется всегда —
// серверный дейлик остаётся для онлайн-сборки (миниапп/веб).
import bundled from '../data/offlineWords.json';
import { localXpInfo } from './localStats';
import type {
  DailyWordTodayResponse,
  DailyWordSubmitRequest,
  DailyWordSubmitResponse,
} from './api';

const RESULTS_KEY = 'offline_daily_results';
const GRID_SIZE = 7;
const WORD_COUNT = 6;
const TIME_LIMIT_SECONDS = 120;

interface RawWord {
  bur: string;
  ru: string;
  translations?: Record<string, string>;
}

interface DailyRec {
  stars: number;
  bestTimeSeconds?: number;
  attempts: number;
  firstCompletedAt?: string;
}

// Дата «игрового дня» в UTC+8 (Бурятия) — так же считает дату GameModeSelectScreen.
export function offlineDailyDateKey(now = new Date()): string {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface OfflineDailyWord {
  bur: string;
  rus: string;
  translations?: Record<string, string>;
  wordId: string;
}

export function offlineDailyWords(dateKey = offlineDailyDateKey()): OfflineDailyWord[] {
  const rnd = mulberry32(seedFromString(`burlive-daily-${dateKey}`));
  const pool = (bundled as RawWord[])
    .map((w, i) => ({
      bur: w.bur.trim().toUpperCase(),
      rus: w.ru.trim(),
      translations: w.translations,
      wordId: `offd-${dateKey}-${i}`,
    }))
    .filter(
      (w) =>
        w.bur.length >= 3 &&
        w.bur.length <= GRID_SIZE &&
        !w.bur.includes(' ') &&
        !w.bur.includes('-'),
    );

  // Детерминированный Фишер-Йетс, затем первые N без повторов по bur.
  const idxs = pool.map((_, i) => i);
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }

  const picked: OfflineDailyWord[] = [];
  const seen = new Set<string>();
  for (const i of idxs) {
    const w = pool[i];
    if (seen.has(w.bur)) continue;
    seen.add(w.bur);
    picked.push(w);
    if (picked.length === WORD_COUNT) break;
  }
  return picked;
}

function loadRecs(): Record<string, DailyRec> {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY) || '{}') as Record<string, DailyRec>;
  } catch {
    return {};
  }
}

function saveRecs(m: Record<string, DailyRec>): void {
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export function offlineGetDailyToday(): DailyWordTodayResponse {
  const date = offlineDailyDateKey();
  const rec = loadRecs()[date];
  return {
    date,
    words: offlineDailyWords(date),
    gridSize: GRID_SIZE,
    timeLimitSeconds: TIME_LIMIT_SECONDS,
    maxStars: 3,
    currentStars: rec ? rec.stars : null,
    bestTimeSeconds: rec?.bestTimeSeconds ?? null,
    sessionId: `offd_${date}`,
    sessionExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

export function offlineSubmitDaily(body: DailyWordSubmitRequest): DailyWordSubmitResponse {
  const date = offlineDailyDateKey();
  const words = offlineDailyWords(date);
  const wordsTotal = words.length;

  const foundSet = new Set((body.foundWords || []).map((w) => w.trim().toUpperCase()));
  const valid = words.filter((w) => foundSet.has(w.bur));
  const missed = words.filter((w) => !foundSet.has(w.bur));

  const ratio = wordsTotal > 0 ? valid.length / wordsTotal : 0;
  const t = Math.max(1, body.timeSeconds || TIME_LIMIT_SECONDS);

  let earnedStars = 0;
  if (ratio >= 1) earnedStars = t < TIME_LIMIT_SECONDS * 0.5 ? 3 : t < TIME_LIMIT_SECONDS ? 2 : 1;
  else if (ratio >= 0.6) earnedStars = 1;

  const recs = loadRecs();
  const prev = recs[date] || { stars: 0, attempts: 0 };
  const previousBestStars = prev.stars || 0;
  const previousBestTime = prev.bestTimeSeconds ?? null;
  const isNewStarRecord = earnedStars > previousBestStars;
  const isNewTimeRecord = earnedStars > 0 && (previousBestTime == null || t < previousBestTime);

  const next: DailyRec = {
    stars: Math.max(previousBestStars, earnedStars),
    bestTimeSeconds: isNewTimeRecord ? t : prev.bestTimeSeconds,
    attempts: (prev.attempts || 0) + 1,
    firstCompletedAt: prev.firstCompletedAt || (earnedStars > 0 ? new Date().toISOString() : undefined),
  };
  recs[date] = next;
  saveRecs(recs);

  // Та же формула XP, что в gameStore (10/слово + 25/звезда + бонус за скорость).
  const xpGained = valid.length * 10 + earnedStars * 25 + (earnedStars > 0 && t < 60 ? 50 : 0);
  const xpBefore = localXpInfo();
  const totalXp = xpBefore.total + xpGained;
  const userLevel = Math.floor(totalXp / 100) + 1;

  return {
    success: earnedStars > 0,
    date,
    earnedStars,
    isNewStarRecord,
    isNewTimeRecord,
    previousBestTime,
    timeSeconds: t,
    wordsFound: valid.length,
    wordsTotal,
    wordsFoundPercent: wordsTotal ? Math.round(ratio * 100) : 0,
    validFoundWords: valid.map((w) => ({ bur: w.bur, rus: w.rus })),
    missedWords: missed.map((w) => ({ bur: w.bur, rus: w.rus })),
    invalidWords: null,
    timeLimitSeconds: TIME_LIMIT_SECONDS,
    previousBestStars,
    attemptNumber: next.attempts,
    xpGained,
    totalXp,
    userLevel,
    leveledUp: userLevel > xpBefore.level,
    xpReason: 'offline_daily',
  };
}

// Сумма звёзд по локальным дейликам (для локальной статистики/ачивок).
export function offlineDailyTotals(): { stars: number; completedDays: number } {
  const recs = loadRecs();
  const vals = Object.values(recs);
  return {
    stars: vals.reduce((s, r) => s + (r.stars || 0), 0),
    completedDays: vals.filter((r) => (r.stars || 0) > 0).length,
  };
}

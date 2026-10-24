// Офлайн-движок кампаний: overview/уровень/старт/submit из вшитых данных + прогресс в localStorage.
// Воспроизводит ровно те же формы ответов, что и серверные эндпоинты (см. api.ts).
import bundled from '../data/offlineCampaignLevels.json';
import dictWords from '../data/offlineWords.json';
import { API_BASE } from '../config/apiBase';
import { localXpInfo } from './localStats';
import type {
  CampaignOverviewResponse,
  CampaignOverviewModule,
  CampaignOverviewLevel,
  CampaignLevelResponse,
  CampaignLevelStartResponse,
  CampaignLevelResultResponse,
  CampaignSubmitLevelResultRequest,
  CampaignDifficulty,
  MeCampaignStats,
} from './api';

interface BWord { bur: string; ru: string; translations?: Record<string, string> }

// переводы из вшитого словаря (в уроках может не быть en) — лениво, по бурятскому слову
let dictTrCache: Record<string, Record<string, string>> | null = null;
function dictTranslationsByBur(): Record<string, Record<string, string>> {
  if (!dictTrCache) {
    dictTrCache = {};
    for (const w of dictWords as Array<{ bur: string; translations?: Record<string, string> }>) {
      if (w.translations) dictTrCache[w.bur.toUpperCase()] = w.translations;
    }
  }
  return dictTrCache;
}
interface BPlacement { word: string; path: Array<{ r: number; c: number }> }
interface BVariant { variantId?: string; difficultyLevel: number; gridSize: number; grid: string[][]; wordPlacements: BPlacement[] }
interface BLesson {
  slug: string; name: string; nameBur: string; icon: string; difficulty: string; order: number;
  requiredStars: number; timeLimitSeconds: number; maxStars: number; description: string;
  words: BWord[]; mapVariants: BVariant[];
}
interface BChapter { id: string; title: string; titleBur?: string; order: number; requiredStars: number; lessons: BLesson[] }

const LEVELS_KEY = 'offline_campaign_levels';
const SESS_KEY = 'offline_campaign_sessions';
const CONTENT_KEY = 'offline_campaign_content'; // скачанный с сервера снимок (приоритет над вшитым)
const SYNC_BASE = API_BASE;

// Источник данных: скачанный кэш (если валиден и новее), иначе вшитый снимок.
function getChapters(): BChapter[] {
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0 && data.every((c: BChapter) => Array.isArray(c.lessons) && c.lessons.length > 0)) {
        return data as BChapter[];
      }
    }
  } catch { /* битый кэш — игнорируем */ }
  return bundled as unknown as BChapter[];
}
const allLessons = (): BLesson[] => getChapters().flatMap(c => c.lessons);

// Скачать свежий контент кампаний при наличии сети. Вызывать на старте (если онлайн).
// Перезаписывает кэш ТОЛЬКО валидными данными — офлайн/ошибка не ломают существующий контент.
export async function syncCampaigns(): Promise<{ ok: boolean; chapters: number }> {
  try {
    const r = await fetch(`${SYNC_BASE}/campaign/content`, { cache: 'no-store' });
    if (!r.ok) return { ok: false, chapters: 0 };
    const data = await r.json();
    const valid = Array.isArray(data) && data.length > 0 &&
      data.every((c: BChapter) => Array.isArray(c.lessons) && c.lessons.length > 0 &&
        c.lessons.every(l => Array.isArray(l.mapVariants) && l.mapVariants.length > 0 && Array.isArray(l.words) && l.words.length > 0));
    if (!valid) return { ok: false, chapters: 0 };
    localStorage.setItem(CONTENT_KEY, JSON.stringify(data));
    return { ok: true, chapters: (data as BChapter[]).length };
  } catch {
    return { ok: false, chapters: 0 };
  }
}

interface LevelRec { stars: number; bestTimeSeconds?: number; attempts: number; firstCompletedAt?: string }

function loadLevels(): Record<string, LevelRec> {
  try { return JSON.parse(localStorage.getItem(LEVELS_KEY) || '{}'); } catch { return {}; }
}
function saveLevels(m: Record<string, LevelRec>) {
  try { localStorage.setItem(LEVELS_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}
function loadSess(): Record<string, { slug: string; wordCount: number }> {
  try { return JSON.parse(localStorage.getItem(SESS_KEY) || '{}'); } catch { return {}; }
}
function saveSess(m: Record<string, { slug: string; wordCount: number }>) {
  try { localStorage.setItem(SESS_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}
function totalEarned(levels: Record<string, LevelRec>): number {
  return Object.values(levels).reduce((s, r) => s + (r.stars || 0), 0);
}

// Статистика кампании из локального прогресса — в форме блока campaignStats из /auth/me.
export function offlineCampaignMeStats(): MeCampaignStats {
  const levels = loadLevels();
  const lessons = allLessons();
  const recs = Object.values(levels);
  const totalStars = totalEarned(levels);
  const maxPossibleStars = lessons.reduce((s, l) => s + (l.maxStars || 3), 0);
  return {
    totalStars,
    maxPossibleStars,
    levelsCompleted: recs.filter(r => (r.stars || 0) > 0).length,
    totalLevels: lessons.length,
    perfectLevels: recs.filter(r => (r.stars || 0) >= 3).length,
    totalAttempts: recs.reduce((s, r) => s + (r.attempts || 0), 0),
    completionPercent: maxPossibleStars ? Math.round((totalStars / maxPossibleStars) * 100) : 0,
  };
}

export function offlineGetCampaignOverview(): CampaignOverviewResponse {
  const levels = loadLevels();
  const totalStars = totalEarned(levels);

  const modules: CampaignOverviewModule[] = getChapters().map(ch => {
    const lvls: CampaignOverviewLevel[] = ch.lessons.map(l => {
      const rec = levels[l.slug];
      return {
        id: l.slug, slug: l.slug, name: l.name, nameBur: l.nameBur,
        difficulty: l.difficulty as CampaignDifficulty, order: l.order, icon: l.icon,
        requiredStars: l.requiredStars, wordCount: l.words.length, maxStars: l.maxStars,
        timeLimitSeconds: l.timeLimitSeconds, isActive: true, description: l.description,
        earnedStars: rec?.stars ?? 0,
        isUnlocked: totalStars >= (l.requiredStars || 0),
        bestTimeSeconds: rec?.bestTimeSeconds,
        attempts: rec?.attempts ?? 0,
        firstCompletedAt: rec?.firstCompletedAt,
      };
    });
    const earned = lvls.reduce((s, l) => s + (l.earnedStars || 0), 0);
    const total = ch.lessons.reduce((s, l) => s + (l.maxStars || 3), 0);
    return {
      id: ch.id, title: ch.title, titleBur: ch.titleBur, order: ch.order,
      requiredStars: ch.requiredStars || 0, isUnlocked: totalStars >= (ch.requiredStars || 0),
      levels: lvls, totalStars: total, earnedStars: earned,
    };
  });

  const grandTotal = allLessons().reduce((s, l) => s + (l.maxStars || 3), 0);
  const pct = grandTotal ? (totalStars / grandTotal) * 100 : 0;
  const prog = { totalStars: grandTotal, earnedStars: totalStars, progressPercent: pct };
  return {
    categories: [],
    modules,
    classicProgress: { totalStars: 0, earnedStars: 0, progressPercent: 0 },
    modulesProgress: prog,
    overallProgress: prog,
    totalStars: grandTotal,
    earnedStars: totalStars,
    progressPercent: pct,
  };
}

function findLesson(slug: string): BLesson | undefined {
  return allLessons().find(l => l.slug === slug);
}

export function offlineGetCampaignLevel(slug: string): CampaignLevelResponse {
  const l = findLesson(slug);
  if (!l) throw new Error('Уровень не найден');
  const rec = loadLevels()[slug];
  const variants = l.mapVariants || [];
  const v = variants[Math.floor(Math.random() * Math.max(1, variants.length))] || variants[0];
  const wordByBur: Record<string, BWord> = {};
  l.words.forEach(w => { wordByBur[w.bur.toUpperCase()] = w; });
  const dictTr = dictTranslationsByBur();
  const trOf = (bur: string): Record<string, string> | undefined =>
    wordByBur[bur.toUpperCase()]?.translations ?? dictTr[bur.toUpperCase()];
  const wordPlacements = (v?.wordPlacements ?? []).map(wp => ({
    bur: wp.word,
    ru: wordByBur[wp.word.toUpperCase()]?.ru ?? '',
    translations: trOf(wp.word),
    path: wp.path,
  }));
  return {
    id: l.slug, slug: l.slug, name: l.name, nameBur: l.nameBur,
    words: l.words.map(w => ({ bur: w.bur, ru: w.ru, translations: w.translations ?? dictTr[w.bur.toUpperCase()] })),
    timeLimitSeconds: l.timeLimitSeconds, maxStars: l.maxStars,
    currentStars: rec?.stars ?? 0, bestTimeSeconds: rec?.bestTimeSeconds,
    gridSize: v?.gridSize, grid: v?.grid, wordPlacements,
    mapVariantMeta: undefined,
  };
}

export function offlineStartCampaignLevel(slug: string): CampaignLevelStartResponse {
  const l = findLesson(slug);
  const sessionId = `off_${slug}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const sess = loadSess();
  sess[sessionId] = { slug, wordCount: l ? l.words.length : 0 };
  saveSess(sess);
  return { sessionId, expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() };
}

export function offlineSubmitCampaignLevel(
  slug: string,
  body: CampaignSubmitLevelResultRequest,
): CampaignLevelResultResponse {
  const l = findLesson(slug);
  const wordsTotal = l ? l.words.length : 0;
  const found = Array.isArray(body.foundWords) ? body.foundWords.length : 0;
  const ratio = wordsTotal > 0 ? found / wordsTotal : 0;
  const timeLimitSeconds = l?.timeLimitSeconds ?? 120;
  const t = body.timeSeconds ?? timeLimitSeconds;

  let earnedStars = 0;
  if (ratio >= 1) earnedStars = t < timeLimitSeconds * 0.5 ? 3 : t < timeLimitSeconds ? 2 : 1;
  else if (ratio >= 0.6) earnedStars = 1;

  const levels = loadLevels();
  const prev = levels[slug] || { stars: 0, attempts: 0 };
  const previousBestStars = prev.stars || 0;
  const previousBestTime = prev.bestTimeSeconds;
  const isNewStarRecord = earnedStars > previousBestStars;
  const isNewTimeRecord = earnedStars > 0 && (previousBestTime == null || t < previousBestTime);

  const next: LevelRec = {
    stars: Math.max(previousBestStars, earnedStars),
    bestTimeSeconds: isNewTimeRecord ? t : previousBestTime,
    attempts: (prev.attempts || 0) + 1,
    firstCompletedAt: prev.firstCompletedAt || (earnedStars > 0 ? new Date().toISOString() : undefined),
  };
  levels[slug] = next;
  saveLevels(levels);

  const totalStars = totalEarned(levels);
  const starsBefore = totalStars - (next.stars - previousBestStars);
  const unlocked = allLessons()
    .filter(le => (le.requiredStars || 0) > starsBefore && (le.requiredStars || 0) <= totalStars)
    .map(le => le.slug);

  // Та же формула XP, что в gameStore (10/слово + 25/звезда + бонус за скорость);
  // накопление делает gameStore.recordRoundPlayed, здесь считаем цифры для экрана результата.
  const xpGained = found * 10 + earnedStars * 25 + (earnedStars > 0 && t < 60 ? 50 : 0);
  const xpBefore = localXpInfo();
  const totalXp = xpBefore.total + xpGained;
  const userLevel = Math.floor(totalXp / 100) + 1;

  return {
    success: earnedStars > 0,
    earnedStars, isNewStarRecord, isNewTimeRecord,
    timeSeconds: t, totalUserStars: totalStars, unlockedLevelSlugs: unlocked,
    wordsFound: found, wordsTotal,
    wordsFoundPercent: wordsTotal ? Math.round((found / wordsTotal) * 100) : 0,
    validFoundWords: body.foundWords ?? [], missedWords: [],
    timeLimitSeconds, previousBestStars, previousBestTime,
    attemptNumber: next.attempts,
    xpGained, totalXp, userLevel,
    leveledUp: userLevel > xpBefore.level, xpReason: 'offline',
  };
}

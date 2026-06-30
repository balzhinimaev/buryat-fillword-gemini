// Офлайн-движок кампаний: overview/уровень/старт/submit из вшитых данных + прогресс в localStorage.
// Воспроизводит ровно те же формы ответов, что и серверные эндпоинты (см. api.ts).
import bundled from '../data/offlineCampaignLevels.json';
import type {
  CampaignOverviewResponse,
  CampaignOverviewModule,
  CampaignOverviewLevel,
  CampaignLevelResponse,
  CampaignLevelStartResponse,
  CampaignLevelResultResponse,
  CampaignSubmitLevelResultRequest,
  CampaignDifficulty,
} from './api';

interface BWord { bur: string; ru: string }
interface BPlacement { word: string; path: Array<{ r: number; c: number }> }
interface BVariant { variantId?: string; difficultyLevel: number; gridSize: number; grid: string[][]; wordPlacements: BPlacement[] }
interface BLesson {
  slug: string; name: string; nameBur: string; icon: string; difficulty: string; order: number;
  requiredStars: number; timeLimitSeconds: number; maxStars: number; description: string;
  words: BWord[]; mapVariants: BVariant[];
}
interface BChapter { id: string; title: string; titleBur?: string; order: number; requiredStars: number; lessons: BLesson[] }

const CHAPTERS = bundled as unknown as BChapter[];
const allLessons = (): BLesson[] => CHAPTERS.flatMap(c => c.lessons);

const LEVELS_KEY = 'offline_campaign_levels';
const SESS_KEY = 'offline_campaign_sessions';

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

export function offlineGetCampaignOverview(): CampaignOverviewResponse {
  const levels = loadLevels();
  const totalStars = totalEarned(levels);

  const modules: CampaignOverviewModule[] = CHAPTERS.map(ch => {
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
  const ruByBur: Record<string, string> = {};
  l.words.forEach(w => { ruByBur[w.bur.toUpperCase()] = w.ru; });
  const wordPlacements = (v?.wordPlacements ?? []).map(wp => ({
    bur: wp.word,
    ru: ruByBur[wp.word.toUpperCase()] ?? '',
    path: wp.path,
  }));
  return {
    id: l.slug, slug: l.slug, name: l.name, nameBur: l.nameBur,
    words: l.words.map(w => ({ bur: w.bur, ru: w.ru })),
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

  return {
    success: earnedStars > 0,
    earnedStars, isNewStarRecord, isNewTimeRecord,
    timeSeconds: t, totalUserStars: totalStars, unlockedLevelSlugs: unlocked,
    wordsFound: found, wordsTotal,
    wordsFoundPercent: wordsTotal ? Math.round((found / wordsTotal) * 100) : 0,
    validFoundWords: body.foundWords ?? [], missedWords: [],
    timeLimitSeconds, previousBestStars, previousBestTime,
    attemptNumber: next.attempts,
    xpGained: earnedStars * 10, totalXp: 0, userLevel: 1, leveledUp: false, xpReason: 'offline',
  };
}

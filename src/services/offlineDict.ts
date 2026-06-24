// Офлайн-словарь для раздела «Словарь»: вшитые 516 слов + локальный кэш докачанных.
// Инкрементальное обновление: при сети подтягиваем только НЕДОСТАЮЩИЕ verified-слова
// с сервера и складываем в localStorage. Так словарь не пустой сразу после установки
// и со временем пополняется.
import type {
  ApiWord,
  ApiWordsResponse,
  ApiWordDetailResponse,
  ApiCategory,
  GetWordsParams,
  WordsStats,
} from './api';
import bundled from '../data/offlineWords.json';

const EXTRA_KEY = 'burlive_dict_extra';
const API_BASE = 'https://burlive.ru/api';

interface DictWord {
  id: string;
  bur: string;
  ru: string;
  difficulty: number;
  exampleBur?: string;
  exampleRu?: string;
}

interface RawWord {
  bur: string;
  ru: string;
  difficulty?: number;
  exampleBur?: string;
  exampleRu?: string;
}

const BUILTIN: DictWord[] = (bundled as RawWord[]).map((w, i) => ({
  id: `dict-builtin-${i}`,
  bur: w.bur,
  ru: w.ru,
  difficulty: w.difficulty ?? 5,
  exampleBur: w.exampleBur,
  exampleRu: w.exampleRu,
}));

function loadExtra(): DictWord[] {
  try {
    return JSON.parse(localStorage.getItem(EXTRA_KEY) || '[]') as DictWord[];
  } catch {
    return [];
  }
}
function saveExtra(arr: DictWord[]): void {
  try {
    localStorage.setItem(EXTRA_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

const norm = (b: string, r: string) => `${b.trim().toUpperCase()}|${r.trim().toLowerCase()}`;

// Полный словарь: вшитые + докачанные, без дублей.
export function getAllWords(): DictWord[] {
  const seen = new Set(BUILTIN.map((w) => norm(w.bur, w.ru)));
  const extra = loadExtra().filter((w) => !seen.has(norm(w.bur, w.ru)));
  return [...BUILTIN, ...extra];
}

function toApiWord(w: DictWord): ApiWord {
  const now = new Date().toISOString();
  return {
    _id: w.id,
    bur: w.bur,
    ru: w.ru,
    exampleBur: w.exampleBur,
    exampleRu: w.exampleRu,
    audioUrl: null,
    synonyms: [],
    antonyms: [],
    relatedWords: [],
    categoryId: undefined,
    dialectId: null,
    partOfSpeechId: null,
    tags: [],
    sources: [],
    comments: [],
    viewCount: 0,
    lookupCount: 0,
    contributor: { id: 'offline', name: 'Burlive' },
    status: 'verified',
    verificationScore: 0,
    upvotes: [],
    downvotes: [],
    isActiveInGame: true,
    difficulty: w.difficulty,
    createdAt: now,
    updatedAt: now,
  } as ApiWord;
}

export function offlineGetWords(params: GetWordsParams = {}): ApiWordsResponse {
  const all = getAllWords();
  const offset = params.offset ?? 0;
  // Офлайн отдаём ВЕСЬ словарь на первой странице — тогда клиентский поиск работает по всем словам,
  // а не по подгруженной странице. На запросы «load more» (offset>0) возвращаем пусто.
  if (offset > 0) return { words: [], total: all.length };
  return { words: all.map(toApiWord), total: all.length };
}

export function offlineGetWordDetail(id: string): ApiWordDetailResponse {
  const w = getAllWords().find((x) => x.id === id) ?? getAllWords()[0];
  const base = toApiWord(w);
  return {
    word: { ...base, categoryId: null, relatedWords: [] } as ApiWordDetailResponse['word'],
    otherTranslations: [],
    relatedWords: [],
    commentsCount: 0,
    votesUp: 0,
    votesDown: 0,
  };
}

export function offlineGetCategories(): ApiCategory[] {
  return []; // без серверных категорий — словарь показывается общим списком
}

export function offlineWordsStats(): WordsStats {
  const total = getAllWords().length;
  return { total, pending: 0, verified: total, rejected: 0, activeInGame: total };
}

// Инкрементальная подкачка: тянем verified-слова с сервера и добавляем только новые.
export async function syncDictionary(maxPages = 20, pageSize = 100): Promise<{ added: number; ok: boolean }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { added: 0, ok: false };
  const have = new Set(getAllWords().map((w) => norm(w.bur, w.ru)));
  const extra = loadExtra();
  let added = 0;
  try {
    for (let page = 0; page < maxPages; page++) {
      const url = `${API_BASE}/words?status=verified&isActiveInGame=true&limit=${pageSize}&offset=${page * pageSize}`;
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) break;
      const data = (await r.json()) as { words?: Array<{ _id: string; bur: string; ru: string; difficulty?: number; exampleBur?: string; exampleRu?: string }>; total?: number };
      const words = data.words ?? [];
      if (words.length === 0) break;
      for (const sw of words) {
        const key = norm(sw.bur, sw.ru);
        if (have.has(key)) continue;
        have.add(key);
        extra.push({
          id: sw._id,
          bur: sw.bur.trim().toUpperCase(),
          ru: sw.ru,
          difficulty: sw.difficulty ?? 5,
          exampleBur: sw.exampleBur,
          exampleRu: sw.exampleRu,
        });
        added++;
      }
      if (words.length < pageSize) break; // последняя страница
    }
    saveExtra(extra);
    return { added, ok: true };
  } catch (e) {
    console.log('dict sync failed', e);
    saveExtra(extra);
    return { added, ok: false };
  }
}

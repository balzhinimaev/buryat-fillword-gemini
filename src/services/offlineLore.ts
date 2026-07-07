// Офлайн-кэш «народного учебника»: одобренные истории/факты/пословицы.
// При наличии сети APK докачивает весь одобренный контент бандлом и складывает
// в localStorage; в офлайне секция «Из сообщества» читает из кэша.
import type { LoreItem } from './api';
import { API_BASE } from '../config/apiBase';

const CACHE_KEY = 'burlive_lore_cache';

interface LoreCache {
  updatedAt: number;
  items: LoreItem[];
}

function readCache(): LoreItem[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LoreCache | null;
    return Array.isArray(parsed?.items) ? parsed!.items : [];
  } catch {
    return [];
  }
}

/** Одобренные записи урока из офлайн-кэша (featured первыми) */
export function offlineLessonLore(lessonSlug: string): LoreItem[] {
  return readCache()
    .filter((i) => i.lessonSlug === lessonSlug)
    .sort((a, b) => Number(b.featured) - Number(a.featured));
}

/** Весь одобренный lore из кэша (для ленты «Из сообщества»), featured первыми */
export function offlineAllLore(): LoreItem[] {
  return readCache().sort((a, b) => Number(b.featured) - Number(a.featured));
}

/** Докачать весь одобренный lore-контент в кэш (тихо падает офлайн/при ошибке) */
export async function syncLore(): Promise<{ ok: boolean; count: number }> {
  try {
    const r = await fetch(`${API_BASE}/lore/content`, { method: 'GET' });
    if (!r.ok) return { ok: false, count: readCache().length };
    const items = (await r.json()) as LoreItem[];
    if (!Array.isArray(items)) return { ok: false, count: readCache().length };
    // перезаписываем кэш ТОЛЬКО валидными данными
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ updatedAt: Date.now(), items } satisfies LoreCache),
    );
    return { ok: true, count: items.length };
  } catch {
    return { ok: false, count: readCache().length };
  }
}

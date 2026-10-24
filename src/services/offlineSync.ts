// Синхронизация офлайн-прогресса кампаний с сервером ПОСЛЕ входа (offline-first, sync-after-login).
// Работает только при наличии токена (пользователь вошёл через VK/Telegram) и сети.
// Двусторонняя: локальный прогресс → сервер (слияние по max звёзд / min времени / max попыток)
// → объединённый обратно в localStorage.
import { API_BASE } from '../config/apiBase';
import { getStoredTokens } from './api';

const LEVELS_KEY = 'offline_campaign_levels';

interface LevelRec { stars?: number; bestTimeSeconds?: number; attempts?: number; firstCompletedAt?: string }

function getToken(): string | null {
  // через getStoredTokens — с in-memory fallback (localStorage может быть недоступен)
  return getStoredTokens()?.access_token || null;
}
function loadLocal(): Record<string, LevelRec> {
  try { return JSON.parse(localStorage.getItem(LEVELS_KEY) || '{}'); } catch { return {}; }
}

export async function syncCampaignProgress(): Promise<{ ok: boolean; merged: number }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, merged: 0 };
  const token = getToken();
  if (!token) return { ok: false, merged: 0 };
  const local = loadLocal();
  const levels = Object.entries(local).map(([slug, r]) => ({
    slug,
    stars: r.stars || 0,
    bestTimeSeconds: r.bestTimeSeconds,
    attempts: r.attempts,
    firstCompletedAt: r.firstCompletedAt,
  }));
  try {
    const res = await fetch(`${API_BASE}/campaign/sync-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ levels }),
    });
    if (!res.ok) return { ok: false, merged: 0 };
    const merged: Array<{
      slug: string; stars: number; bestTimeSeconds?: number; attempts?: number; firstCompletedAt?: string;
    }> = await res.json();
    if (!Array.isArray(merged)) return { ok: false, merged: 0 };
    const next = { ...local };
    for (const m of merged) {
      const cur = next[m.slug] || { stars: 0, attempts: 0 };
      const times = [cur.bestTimeSeconds, m.bestTimeSeconds].filter(
        (x): x is number => typeof x === 'number',
      );
      const firsts = [cur.firstCompletedAt, m.firstCompletedAt].filter(
        (x): x is string => typeof x === 'string' && x.length > 0,
      );
      next[m.slug] = {
        ...cur,
        stars: Math.max(cur.stars || 0, m.stars || 0),
        bestTimeSeconds: times.length ? Math.min(...times) : undefined,
        attempts: Math.max(cur.attempts || 0, m.attempts || 0),
        firstCompletedAt: firsts.length ? firsts.sort()[0] : undefined,
      };
    }
    localStorage.setItem(LEVELS_KEY, JSON.stringify(next));
    return { ok: true, merged: merged.length };
  } catch {
    return { ok: false, merged: 0 };
  }
}

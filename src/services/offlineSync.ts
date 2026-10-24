import { apiRequest, getStoredTokens } from './api';
import { progressOwner, readProgress, writeProgress } from './progressStorage';
const LEVELS_KEY = 'offline_campaign_levels';
interface LevelRec { stars?: number; bestTimeSeconds?: number; attempts?: number; firstCompletedAt?: string }
function load(owner: string): Record<string, LevelRec> {
  try { return JSON.parse(readProgress(LEVELS_KEY, owner) || '{}'); } catch { return {}; }
}
const running = new Map<string, Promise<{ ok: boolean; merged: number }>>();
export function syncCampaignProgress(): Promise<{ ok: boolean; merged: number }> {
  const owner = progressOwner();
  if (!getStoredTokens() || navigator.onLine === false || owner === 'guest') return Promise.resolve({ ok: false, merged: 0 });
  const active = running.get(owner);
  if (active) return active;
  const work = (async () => {
    try {
      const levels = Object.entries(load(owner)).slice(0, 1000).map(([slug, r]) => ({ slug,
        stars: Math.max(0, Math.min(3, Math.round(r.stars || 0))), bestTimeSeconds: r.bestTimeSeconds,
        attempts: r.attempts, firstCompletedAt: r.firstCompletedAt }));
      const merged = await apiRequest<Array<LevelRec & { slug: string }>>('/campaign/sync-progress', {
        method: 'POST', body: JSON.stringify({ levels }),
      });
      if (!Array.isArray(merged) || owner !== progressOwner()) return { ok: false, merged: 0 };
      // A round may have finished during the network request. Merge into fresh data.
      const next = load(owner);
      for (const m of merged) {
        const cur = next[m.slug] || {};
        const times = [cur.bestTimeSeconds, m.bestTimeSeconds].filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
        const dates = [cur.firstCompletedAt, m.firstCompletedAt].filter((v): v is string => !!v);
        next[m.slug] = { ...cur, stars: Math.max(cur.stars || 0, m.stars || 0),
          attempts: Math.max(cur.attempts || 0, m.attempts || 0),
          bestTimeSeconds: times.length ? Math.min(...times) : undefined,
          firstCompletedAt: dates.length ? dates.sort()[0] : undefined };
      }
      writeProgress(LEVELS_KEY, JSON.stringify(next), owner);
      return { ok: true, merged: merged.length };
    } catch { return { ok: false, merged: 0 }; }
  })().finally(() => running.delete(owner));
  running.set(owner, work);
  return work;
}

// Contributions remain local until the owning server account can send them.
import { createWord, getServerWordDetail, getStoredTokens, type CreateWordRequest, type CreateWordResponse } from './api';
import { progressOwner } from './progressStorage';
import { isAdditionalCourse } from '../courses/activeCourse';
import { syncContext, syncErrorText, syncExclusive, syncSingleFlight } from './syncContext';

const QUEUE_KEY = 'burlive_contrib_queue';
export type SyncState = 'queued' | 'synced' | 'verified' | 'rejected';
export interface QueueItem {
  localId: string; data: CreateWordRequest; createdAt: string; serverId?: string;
  state: SyncState; syncedAt?: string; attempts?: number;
  owner?: string; course?: 'bua-ru'; syncError?: string; needsReview?: boolean;
}
function readAll(): QueueItem[] {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error('Не удалось прочитать очередь. Исходные записи сохранены.');
  return value as QueueItem[];
}
export function loadQueue(owner = progressOwner()): QueueItem[] {
  return readAll().filter(i => i.owner === owner);
}
async function changeQueue(change: (items: QueueItem[]) => QueueItem[]): Promise<void> {
  await syncExclusive('contrib-storage', async () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(change(readAll())));
    window.dispatchEvent(new Event('contrib:queue'));
  });
}
export function recoverableQueue(): QueueItem[] {
  const owner = progressOwner();
  return readAll().filter(i => !i.owner || (owner !== 'guest' && i.owner === 'guest'));
}
// Explicit in-app recovery, never infer ownership from whichever account logs in next.
export async function claimContributions(localIds: string[]): Promise<void> {
  const owner = progressOwner();
  if (owner === 'guest' || !getStoredTokens()?.refresh_token) throw new Error('Сначала войдите в свой аккаунт.');
  const ids = new Set(localIds);
  await changeQueue(items => {
    if (owner !== progressOwner()) throw new Error('Аккаунт изменился');
    if (!localStorage.getItem(`${QUEUE_KEY}:before-owner-migration`)) localStorage.setItem(`${QUEUE_KEY}:before-owner-migration`, JSON.stringify(items));
    return items.map(i => ids.has(i.localId) && (!i.owner || i.owner === 'guest')
      ? { ...i, owner, course: 'bua-ru', state: i.serverId ? i.state : 'queued', attempts: 0, syncError: undefined, needsReview: false } : i);
  });
}
export async function retryContribution(localId: string): Promise<void> {
  const owner = progressOwner();
  await changeQueue(items => items.map(i => i.localId === localId && i.owner === owner
    ? { ...i, attempts: 0, syncError: undefined, needsReview: false } : i));
}
export function queueStats() {
  const q = loadQueue();
  return { total: q.length, pending: q.filter(i => !i.serverId).length,
    synced: q.filter(i => !!i.serverId).length, errors: q.filter(i => !!i.syncError).length,
    recoverable: recoverableQueue().length };
}
export async function submitWordOfflineAware(data: CreateWordRequest): Promise<CreateWordResponse> {
  if (isAdditionalCourse()) throw new Error('Добавление слов доступно в бурятском курсе.');
  const owner = progressOwner();
  const localId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await changeQueue(items => [...items, { localId, data, createdAt, owner, course: 'bua-ru', state: 'queued' }]);
  // A failed upload must not lose the local word or silently register another user.
  if (owner !== 'guest' && getStoredTokens()?.refresh_token && navigator.onLine !== false) await syncQueue().catch(() => undefined);
  const saved = loadQueue(owner).find(i => i.localId === localId);
  return { _id: saved?.serverId ?? `local-${localId}`, ...data, synonyms: [],
    contributor: { id: owner, name: '', telegramId: 0 }, status: saved?.state === 'verified' ? 'verified' : 'pending',
    verificationScore: 0, upvotes: [], downvotes: [], isActiveInGame: false,
    difficulty: data.difficulty ?? 5, createdAt, updatedAt: createdAt } as CreateWordResponse;
}
export interface SyncSummary { ok: boolean; pushed: number; pulled: number; failed: number; reason?: string; }
export function syncQueue(): Promise<SyncSummary> {
  const context = syncContext();
  return syncSingleFlight(`contrib-sync:${context.owner}`, async () => {
    const summary = { ok: true, pushed: 0, pulled: 0, failed: 0 } as SyncSummary;
    const stop = (reason: string) => ({ ...summary, ok: false, reason });
    if (!context.current()) return stop('account-change');
    if (context.course !== 'bua-ru') return stop('course');
    if (navigator.onLine === false) return stop('offline');
    if (!loadQueue(context.owner).length) return summary;
    if (context.owner === 'guest' || !getStoredTokens()?.refresh_token) return stop('auth');
    const update = (id: string, patch: Partial<QueueItem>) => changeQueue(items => items.map(i =>
      i.localId === id && i.owner === context.owner ? { ...i, ...patch } : i));
    for (const item of loadQueue(context.owner)) {
      if (!context.current()) return stop('account-change');
      if (item.needsReview) continue;
      try {
        if (!item.serverId) {
          const res = await createWord(item.data);
          await update(item.localId, { serverId: res._id, state: res.status === 'verified' ? 'verified' : res.status === 'rejected' ? 'rejected' : 'synced', syncedAt: new Date().toISOString(), attempts: 0, syncError: undefined });
          summary.pushed++;
        } else {
          const { word } = await getServerWordDetail(item.serverId);
          await update(item.localId, { state: word.status === 'verified' ? 'verified' : word.status === 'rejected' ? 'rejected' : 'synced', syncedAt: new Date().toISOString(), syncError: undefined });
          summary.pulled++;
        }
      } catch (error) {
        const status = (error as { statusCode?: number })?.statusCode;
        const changed = !context.current();
        await update(item.localId, { attempts: (item.attempts ?? 0) + 1,
          syncError: changed ? 'Аккаунт или курс изменился во время отправки. Проверьте слово перед повтором.' : syncErrorText(error),
          needsReview: changed || (status !== undefined && [400, 404, 409, 422].includes(status)) });
        summary.failed++;
        if (changed) return stop('account-change');
        if (status === 401 || status === 403) return stop('auth');
      }
    }
    return summary;
  });
}

// Офлайн-first синхронизация раздела «Үгын Дархан» (вклад слов).
// Слова, добавленные без сети, кладутся в локальную очередь и выгружаются на сервер
// (POST /words) при синхронизации. Для авторизации используется тихий per-device
// аккаунт (POST /auth/register работает без подтверждения email). Затем подтягиваются
// статусы верификации (pull через GET /words/:id).
import {
  createWord,
  getWordDetail,
  getStoredTokens,
  registerDeviceAccount,
  type CreateWordRequest,
  type CreateWordResponse,
} from './api';

const QUEUE_KEY = 'burlive_contrib_queue';
const DEVICE_KEY = 'burlive_sync_device';

export type SyncState = 'queued' | 'synced' | 'verified' | 'rejected';

export interface QueueItem {
  localId: string;
  data: CreateWordRequest;
  createdAt: string;
  serverId?: string;
  state: SyncState;
  syncedAt?: string;
  attempts?: number; // неудачные попытки push (после лимита помечаем rejected, не ретраим)
}

const MAX_PUSH_ATTEMPTS = 3;

function rand(n: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function loadQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') as QueueItem[];
  } catch {
    return [];
  }
}
function saveQueue(q: QueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

export function queueStats(): { total: number; pending: number; synced: number } {
  const q = loadQueue();
  return {
    total: q.length,
    pending: q.filter((i) => i.state === 'queued').length,
    synced: q.filter((i) => i.state !== 'queued').length,
  };
}

// onSubmit для AddWordForm в офлайн-режиме: пытаемся отправить сразу, иначе — в очередь.
export async function submitWordOfflineAware(data: CreateWordRequest): Promise<CreateWordResponse> {
  const localId = `${Date.now()}-${rand(6)}`;
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  if (online && getStoredTokens()?.refresh_token) {
    try {
      const res = await createWord(data);
      const q = loadQueue();
      q.push({ localId, data, createdAt: new Date().toISOString(), serverId: res._id, state: 'synced', syncedAt: new Date().toISOString() });
      saveQueue(q);
      return res;
    } catch {
      /* падаем в очередь ниже */
    }
  }
  // офлайн / без токена / ошибка — кладём в очередь и возвращаем синтетический ответ
  const q = loadQueue();
  q.push({ localId, data, createdAt: new Date().toISOString(), state: 'queued' });
  saveQueue(q);
  return {
    _id: `local-${localId}`,
    bur: data.bur,
    ru: data.ru,
    categoryId: data.categoryId,
    synonyms: [],
    contributor: { id: 'local', name: 'offline', telegramId: 0 },
    status: 'pending',
    verificationScore: 0,
    upvotes: [],
    downvotes: [],
    isActiveInGame: false,
    difficulty: data.difficulty ?? 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as CreateWordResponse;
}

async function ensureAuth(): Promise<boolean> {
  if (getStoredTokens()?.refresh_token) return true;
  let dev: { email: string; password: string; name: string } | null = null;
  try {
    dev = JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null');
  } catch {
    dev = null;
  }
  if (!dev) {
    dev = { email: `device-${rand(10)}@burlive.app`, password: `Aa1!${rand(14)}`, name: 'Үгын Дархан' };
    localStorage.setItem(DEVICE_KEY, JSON.stringify(dev));
  }
  try {
    await registerDeviceAccount(dev.email, dev.password, dev.name);
    return true;
  } catch (e) {
    console.log('sync auth failed', e);
    return false;
  }
}

export interface SyncSummary {
  ok: boolean;
  pushed: number;
  pulled: number;
  failed: number;
  reason?: string;
}

// Полная синхронизация очереди: push новых + pull статусов.
export async function syncQueue(): Promise<SyncSummary> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, pushed: 0, pulled: 0, failed: 0, reason: 'offline' };
  }
  if (!(await ensureAuth())) {
    return { ok: false, pushed: 0, pulled: 0, failed: 0, reason: 'auth' };
  }

  const q = loadQueue();
  let pushed = 0;
  let pulled = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const item of q) {
    // Уже отправленные/отклонённые слова заново не пушим (кроме pull статуса по serverId).
    if (item.state === 'rejected' && !item.serverId) continue;
    try {
      if (!item.serverId) {
        const res = await createWord(item.data);
        item.serverId = res._id;
        item.state = res.status === 'verified' ? 'verified' : res.status === 'rejected' ? 'rejected' : 'synced';
        item.syncedAt = now;
        item.attempts = 0;
        pushed++;
      } else {
        const detail = await getWordDetail(item.serverId);
        const status = (detail as { status?: string }).status;
        if (status === 'verified') item.state = 'verified';
        else if (status === 'rejected') item.state = 'rejected';
        else item.state = 'synced';
        item.syncedAt = now;
        pulled++;
      }
    } catch (e) {
      console.log('sync item failed', item.data.bur, e);
      failed++;
      if (!item.serverId) {
        item.attempts = (item.attempts ?? 0) + 1;
        // После лимита попыток считаем слово непринятым сервером (дубликат/невалидно) — не ретраим.
        if (item.attempts >= MAX_PUSH_ATTEMPTS) item.state = 'rejected';
      }
    }
    saveQueue(q); // инкрементально, чтобы не терять прогресс при обрыве
  }

  return { ok: true, pushed, pulled, failed };
}

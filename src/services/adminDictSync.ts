// Синхронизация админ-редактора словаря (по образцу contribSync).
// Pull: полная выгрузка словаря с сервера в IndexedDB (локальные правки не затираются).
// Push: выгрузка dirty-записей (created/updated/deleted) на сервер, last-write-wins.
// Авторизация — реальная сессия админа из auth_tokens: тихий девайс-аккаунт из
// contribSync не годится (роль user не может править и удалять чужие слова).
import {
  adminGetWords,
  adminGetDialects,
  adminGetCategories,
  createWord,
  updateWord,
  deleteWord,
  getStoredTokens,
} from './api';
import {
  apiWordToRecord,
  bulkPutWordRecords,
  countDirtyWords,
  getAllWords,
  getDirtyWords,
  getMeta,
  getWordRecord,
  putWordRecord,
  recordToCreateRequest,
  recordToUpdateRequest,
  removeWordRecord,
  removeWordRecords,
  setMeta,
  type EditableWord,
  type LocalWordRecord,
} from './adminDictStore';

const PAGE_SIZE = 500;
const MAX_PUSH_ATTEMPTS = 3;

function rand(n: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const isOnline = (): boolean => typeof navigator === 'undefined' || navigator.onLine !== false;

function errorText(e: unknown): string {
  if (e && typeof e === 'object') {
    const err = e as { message?: unknown; statusCode?: unknown };
    const msg = Array.isArray(err.message) ? err.message.join('; ') : err.message;
    if (typeof msg === 'string' && msg) {
      return err.statusCode ? `${err.statusCode}: ${msg}` : msg;
    }
  }
  return String(e);
}

function statusCodeOf(e: unknown): number | undefined {
  if (e && typeof e === 'object' && 'statusCode' in e) {
    const sc = (e as { statusCode?: unknown }).statusCode;
    return typeof sc === 'number' ? sc : undefined;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Pull: полная выгрузка словаря
// ---------------------------------------------------------------------------

export interface PullSummary {
  ok: boolean;
  total: number;
  pulled: number;
  skippedDirty: number;
  removedStale: number;
  reason?: string;
}

export async function pullFullDictionary(
  onProgress?: (loaded: number, total: number) => void,
): Promise<PullSummary> {
  if (!isOnline()) return { ok: false, total: 0, pulled: 0, skippedDirty: 0, removedStale: 0, reason: 'offline' };
  if (!getStoredTokens()?.refresh_token) {
    return { ok: false, total: 0, pulled: 0, skippedDirty: 0, removedStale: 0, reason: 'auth' };
  }

  // Диалекты и категории — в мета-кэш, чтобы пикеры формы работали офлайн
  const [dialects, categories] = await Promise.all([adminGetDialects(), adminGetCategories()]);
  await setMeta({ dialects, categories });

  const existing = await getAllWords();
  const dirtyKeys = new Set(existing.filter((r) => r.dirty !== 'none').map((r) => r.key));
  const seenServerIds = new Set<string>();

  let total = 0;
  let pulled = 0;
  let skippedDirty = 0;
  let offset = 0;

  for (;;) {
    const page = await adminGetWords({ limit: PAGE_SIZE, offset });
    total = page.total;
    if (!page.words.length) break;

    const batch: LocalWordRecord[] = [];
    for (const w of page.words) {
      seenServerIds.add(w._id);
      // Локальная несинхронизированная правка побеждает — серверную версию не затираем
      if (dirtyKeys.has(w._id)) {
        skippedDirty++;
        continue;
      }
      batch.push(apiWordToRecord(w));
    }
    await bulkPutWordRecords(batch); // постранично — прогресс переживает обрыв сети
    pulled += batch.length;
    offset += page.words.length;
    onProgress?.(Math.min(offset, total), total);
    if (offset >= total) break;
  }

  // Чистые записи, пропавшие на сервере (удалены с другого устройства) — убираем
  const staleKeys = existing
    .filter((r) => r.dirty === 'none' && r.serverId && !seenServerIds.has(r.serverId))
    .map((r) => r.key);
  await removeWordRecords(staleKeys);

  await setMeta({ lastPullAt: new Date().toISOString(), total });
  return { ok: true, total, pulled, skippedDirty, removedStale: staleKeys.length };
}

// ---------------------------------------------------------------------------
// Локальные мутации (работают полностью офлайн)
// ---------------------------------------------------------------------------

/** Сохранить правку слова локально. key=null — создание нового слова. Возвращает ключ записи. */
export async function saveWordLocal(key: string | null, fields: EditableWord): Promise<string> {
  const now = new Date().toISOString();
  if (!key) {
    const localKey = `local-${Date.now()}-${rand(6)}`;
    await putWordRecord({
      key: localKey,
      word: fields,
      dirty: 'created',
      updatedLocallyAt: now,
    });
    return localKey;
  }

  const record = await getWordRecord(key);
  if (!record) throw new Error(`Слово ${key} не найдено в локальном словаре`);
  await putWordRecord({
    ...record,
    word: fields,
    // созданное офлайн слово остаётся 'created' до первого push
    dirty: record.dirty === 'created' ? 'created' : 'updated',
    updatedLocallyAt: now,
    attempts: 0,
    syncError: undefined,
  });
  return key;
}

/** Удалить слово локально: не пушенное — сразу, серверное — tombstone до push */
export async function deleteWordLocal(key: string): Promise<void> {
  const record = await getWordRecord(key);
  if (!record) return;
  if (record.dirty === 'created') {
    await removeWordRecord(key);
    return;
  }
  await putWordRecord({
    ...record,
    dirty: 'deleted',
    updatedLocallyAt: new Date().toISOString(),
    attempts: 0,
    syncError: undefined,
  });
}

/** Откатить локальную правку записи (для 'created' — просто удалить) */
export async function revertWordLocal(key: string): Promise<void> {
  const record = await getWordRecord(key);
  if (!record) return;
  if (record.dirty === 'created') {
    await removeWordRecord(key);
    return;
  }
  // Для updated/deleted локальной копии оригинала нет — вернём серверную версию при следующем pull
  await putWordRecord({ ...record, dirty: 'none', attempts: 0, syncError: undefined });
}

/** Сбросить счётчик попыток для ручного ретрая после ошибок */
export async function retryWordSync(key: string): Promise<void> {
  const record = await getWordRecord(key);
  if (!record || record.dirty === 'none') return;
  await putWordRecord({ ...record, attempts: 0, syncError: undefined });
}

// ---------------------------------------------------------------------------
// Push: выгрузка локальных правок
// ---------------------------------------------------------------------------

export interface AdminSyncSummary {
  ok: boolean;
  pushed: number;
  failed: number;
  remaining: number;
  reason?: string;
}

export async function pushAdminQueue(): Promise<AdminSyncSummary> {
  if (!isOnline()) return { ok: false, pushed: 0, failed: 0, remaining: 0, reason: 'offline' };
  if (!getStoredTokens()?.refresh_token) {
    return { ok: false, pushed: 0, failed: 0, remaining: 0, reason: 'auth' };
  }

  const dirty = await getDirtyWords();
  let pushed = 0;
  let failed = 0;

  for (const record of dirty) {
    // После лимита попыток — только ручной ретрай (retryWordSync)
    if ((record.attempts ?? 0) >= MAX_PUSH_ATTEMPTS) continue;
    try {
      if (record.dirty === 'created') {
        const res = await createWord(recordToCreateRequest(record));
        // POST не принимает status (админское слово сервер сам верифицирует);
        // если локально выбран другой статус — доносим отдельным PATCH'ем
        if (record.word.status !== 'verified') {
          await updateWord(res._id, { status: record.word.status }).catch(() => {});
        }
        // Перепривязываем запись с локального ключа на серверный id
        await removeWordRecord(record.key);
        await putWordRecord({
          ...record,
          key: res._id,
          serverId: res._id,
          dirty: 'none',
          attempts: 0,
          syncError: undefined,
          serverUpdatedAt: new Date().toISOString(),
        });
      } else if (record.dirty === 'updated' && record.serverId) {
        await updateWord(record.serverId, recordToUpdateRequest(record));
        await putWordRecord({
          ...record,
          dirty: 'none',
          attempts: 0,
          syncError: undefined,
          serverUpdatedAt: new Date().toISOString(),
        });
      } else if (record.dirty === 'deleted' && record.serverId) {
        try {
          await deleteWord(record.serverId);
        } catch (e) {
          if (statusCodeOf(e) !== 404) throw e; // 404 — уже удалено, считаем успехом
        }
        await removeWordRecord(record.key);
      } else {
        // Запись в неконсистентном состоянии (нет serverId) — убираем из очереди
        await removeWordRecord(record.key);
        continue;
      }
      pushed++;
    } catch (e) {
      failed++;
      console.log('admin dict push failed', record.word.bur, e);
      await putWordRecord({
        ...record,
        attempts: (record.attempts ?? 0) + 1,
        syncError: errorText(e),
      });
    }
  }

  const { pending } = await countDirtyWords();
  return { ok: true, pushed, failed, remaining: pending };
}

// ---------------------------------------------------------------------------
// Статус для UI
// ---------------------------------------------------------------------------

export interface AdminSyncStats {
  pending: number;
  errors: number;
  lastPullAt?: string;
  total: number;
}

export async function adminSyncStats(): Promise<AdminSyncStats> {
  try {
    const [{ pending, errors }, meta, all] = await Promise.all([
      countDirtyWords(),
      getMeta(),
      getAllWords(),
    ]);
    return { pending, errors, lastPullAt: meta.lastPullAt, total: all.length };
  } catch {
    return { pending: 0, errors: 0, total: 0 };
  }
}

/** Есть ли что пушить — дешёвая проверка для триггеров в App.tsx */
export async function hasPendingAdminEdits(): Promise<boolean> {
  try {
    const { pending } = await countDirtyWords();
    return pending > 0;
  } catch {
    return false;
  }
}

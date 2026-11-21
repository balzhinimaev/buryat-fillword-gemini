import { progressOwner } from './progressStorage';
import { syncExclusive } from './syncContext';
// Локальное хранилище админ-редактора словаря (IndexedDB).
// Полная копия словаря с сервера + локальные правки с dirty-флагами:
// 'created' / 'updated' / 'deleted' (tombstone) ждут выгрузки, 'none' — синхронизировано.
// localStorage не подходит: полный словарь на тысячи слов — несколько мегабайт.
import type { ApiWord, ApiWordDetail, ApiDialect, ApiCategory, CreateWordRequest, UpdateWordRequest, WordStatus } from './api';

const LEGACY_DB_NAME = 'burlive_admin_dict';
const DB_NAME = 'burlive_admin_dict_v2';
const DB_VERSION = 1;
const WORDS_STORE = 'words';
const META_STORE = 'meta';

export type DirtyState = 'none' | 'created' | 'updated' | 'deleted';

// Редактируемые поля слова — плоские id (PATCH/POST ждут строки-id, не populated-объекты)
export interface EditableWord {
  bur: string;
  ru: string;
  translations?: Record<string, string>;
  categoryId?: string;
  dialectId?: string;
  partOfSpeechId?: string;
  exampleBur?: string;
  exampleRu?: string;
  pronunciation?: string;
  synonyms: string[];
  antonyms: string[];
  sources: string[];
  tags: string[];
  status: WordStatus;
  isActiveInGame: boolean;
  difficulty: number;
}

export interface LocalWordRecord {
  revision?: string;
  key: string; // serverId или `local-<id>` для созданных офлайн
  serverId?: string;
  word: EditableWord;
  // Денормализация для отображения списка офлайн
  dialectMeta?: { code: string; name: string };
  partOfSpeechMeta?: { code: string; name: string; emoji: string };
  contributorName?: string;
  dirty: DirtyState;
  updatedLocallyAt?: string;
  serverUpdatedAt?: string;
  attempts?: number; // число неудачных попыток, без автоматического отклонения
  needsReview?: boolean;
  syncError?: string; // текст последней ошибки push для UI
}

export interface AdminDictMeta {
  legacyImported?: boolean;
  lastPullAt?: string;
  total?: number;
  dialects?: ApiDialect[];
  categories?: ApiCategory[];
}

// ---------------------------------------------------------------------------
// IDB-обёртка
// ---------------------------------------------------------------------------

const databases = new Map<string, Promise<IDBDatabase>>();

function openDb(owner = progressOwner()): Promise<IDBDatabase> {
  const name = owner === '__legacy__' ? LEGACY_DB_NAME : `${DB_NAME}:${owner}`;
  const existing = databases.get(name);
  if (existing) return existing;
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступен'));
      return;
    }
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(WORDS_STORE)) {
        const store = db.createObjectStore(WORDS_STORE, { keyPath: 'key' });
        store.createIndex('dirty', 'dirty', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      databases.delete(name);
      reject(req.error ?? new Error('Не удалось открыть IndexedDB'));
    };
  });
  databases.set(name, promise);
  return promise;
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IDB transaction aborted'));
  });
}

function reqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB request failed'));
  });
}

// ---------------------------------------------------------------------------
// Слова
// ---------------------------------------------------------------------------

export async function getAllWords(owner = progressOwner()): Promise<LocalWordRecord[]> {
  const db = await openDb(owner);
  const tx = db.transaction(WORDS_STORE, 'readonly');
  return reqResult(tx.objectStore(WORDS_STORE).getAll() as IDBRequest<LocalWordRecord[]>);
}

export async function getWordRecord(key: string, owner = progressOwner()): Promise<LocalWordRecord | undefined> {
  const db = await openDb(owner);
  const tx = db.transaction(WORDS_STORE, 'readonly');
  return reqResult(tx.objectStore(WORDS_STORE).get(key) as IDBRequest<LocalWordRecord | undefined>);
}

export async function putWordRecord(record: LocalWordRecord, owner = progressOwner()): Promise<void> {
  const db = await openDb(owner);
  const tx = db.transaction(WORDS_STORE, 'readwrite');
  tx.objectStore(WORDS_STORE).put(record);
  return txDone(tx);
}

export async function bulkPutWordRecords(records: LocalWordRecord[], owner = progressOwner()): Promise<void> {
  if (!records.length) return;
  const db = await openDb(owner);
  const tx = db.transaction(WORDS_STORE, 'readwrite');
  const store = tx.objectStore(WORDS_STORE);
  for (const r of records) store.put(r);
  return txDone(tx);
}

export async function removeWordRecord(key: string, owner = progressOwner()): Promise<void> {
  const db = await openDb(owner);
  const tx = db.transaction(WORDS_STORE, 'readwrite');
  tx.objectStore(WORDS_STORE).delete(key);
  return txDone(tx);
}

export async function removeWordRecords(keys: string[], owner = progressOwner()): Promise<void> {
  if (!keys.length) return;
  const db = await openDb(owner);
  const tx = db.transaction(WORDS_STORE, 'readwrite');
  const store = tx.objectStore(WORDS_STORE);
  for (const k of keys) store.delete(k);
  return txDone(tx);
}

/** Все записи с локальными изменениями, ждущими выгрузки */
export async function getDirtyWords(owner = progressOwner()): Promise<LocalWordRecord[]> {
  const all = await getAllWords(owner);
  return all.filter((r) => r.dirty !== 'none');
}

export async function countDirtyWords(owner = progressOwner()): Promise<{ pending: number; errors: number }> {
  const dirty = await getDirtyWords(owner);
  return {
    pending: dirty.length,
    errors: dirty.filter((r) => !!r.syncError).length,
  };
}

// ---------------------------------------------------------------------------
// Мета
// ---------------------------------------------------------------------------

export async function getMeta(owner = progressOwner()): Promise<AdminDictMeta> {
  const db = await openDb(owner);
  const tx = db.transaction(META_STORE, 'readonly');
  const value = await reqResult(tx.objectStore(META_STORE).get('meta') as IDBRequest<AdminDictMeta | undefined>);
  return value ?? {};
}

export async function setMeta(patch: Partial<AdminDictMeta>, owner = progressOwner()): Promise<void> {
  const db = await openDb(owner);
  const tx = db.transaction(META_STORE, 'readwrite');
  const store = tx.objectStore(META_STORE);
  const read = store.get('meta');
  read.onsuccess = () => store.put({ ...(read.result ?? {}), ...patch }, 'meta');
  await txDone(tx);
}

// ---------------------------------------------------------------------------
// Нормализация ApiWord <-> локальная запись / запросы
// ---------------------------------------------------------------------------

/** Серверное слово -> локальная запись (populated dialectId/partOfSpeechId сплющиваются в id) */
export function apiWordToRecord(w: ApiWord | ApiWordDetail): LocalWordRecord {
  return {
    key: w._id,
    serverId: w._id,
    word: {
      bur: w.bur,
      ru: w.ru,
      translations: w.translations,
      categoryId: typeof w.categoryId === 'string' ? w.categoryId : w.categoryId?._id,
      dialectId: w.dialectId?._id,
      partOfSpeechId: w.partOfSpeechId?._id,
      exampleBur: w.exampleBur,
      exampleRu: w.exampleRu,
      pronunciation: w.pronunciation,
      synonyms: w.synonyms ?? [],
      antonyms: w.antonyms ?? [],
      sources: w.sources ?? [],
      tags: w.tags ?? [],
      status: w.status,
      isActiveInGame: !!w.isActiveInGame,
      difficulty: w.difficulty ?? 5,
    },
    dialectMeta: w.dialectId ? { code: w.dialectId.code, name: w.dialectId.name } : undefined,
    partOfSpeechMeta: w.partOfSpeechId
      ? { code: w.partOfSpeechId.code, name: w.partOfSpeechId.name, emoji: w.partOfSpeechId.emoji }
      : undefined,
    contributorName: w.contributor?.name,
    dirty: 'none',
    serverUpdatedAt: w.updatedAt,
  };
}

/** Убирает undefined/пустые строки, чтобы не слать в API мусорные поля */
function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === '') continue;
    out[k] = v;
  }
  return out as T;
}

/** Полный набор редактируемых полей для PATCH (last-write-wins: локальное перезаписывает сервер) */
export function recordToUpdateRequest(record: LocalWordRecord): UpdateWordRequest {
  const w = record.word;
  return compact({
    bur: w.bur,
    ru: w.ru,
    translations: w.translations,
    categoryId: w.categoryId,
    dialectId: w.dialectId,
    partOfSpeechId: w.partOfSpeechId,
    exampleBur: w.exampleBur,
    exampleRu: w.exampleRu,
    pronunciation: w.pronunciation,
    synonyms: w.synonyms,
    antonyms: w.antonyms,
    sources: w.sources,
    tags: w.tags,
    difficulty: w.difficulty,
    isActiveInGame: w.isActiveInGame,
    status: w.status,
  }) as UpdateWordRequest;
}

// POST /words принимает и tags/sources/isActiveInGame (есть в CreateWordDto бэкенда);
// status не шлём — админское слово сервер верифицирует сам.
export function recordToCreateRequest(record: LocalWordRecord): CreateWordRequest {
  const w = record.word;
  return compact({
    bur: w.bur,
    ru: w.ru,
    translations: w.translations,
    categoryId: w.categoryId,
    dialectId: w.dialectId,
    partOfSpeechId: w.partOfSpeechId,
    exampleBur: w.exampleBur,
    exampleRu: w.exampleRu,
    synonyms: w.synonyms.length ? w.synonyms : undefined,
    antonyms: w.antonyms.length ? w.antonyms : undefined,
    sources: w.sources.length ? w.sources : undefined,
    tags: w.tags.length ? w.tags : undefined,
    difficulty: w.difficulty,
    isActiveInGame: w.isActiveInGame,
  }) as unknown as CreateWordRequest;
}

// All conflict decisions happen inside one IDB readwrite transaction.
export async function mutateWordRecord(key: string, change: (current: LocalWordRecord | undefined) => LocalWordRecord | undefined, owner = progressOwner()): Promise<void> {
  const db = await openDb(owner), tx = db.transaction(WORDS_STORE, 'readwrite'), store = tx.objectStore(WORDS_STORE);
  const request = store.get(key);
  request.onsuccess = () => {
    try { const next = change(request.result);
      if (next) store.put(next); else store.delete(key);
    } catch { tx.abort(); }
  };
  await txDone(tx);
}
export async function mergeServerWords(records: LocalWordRecord[], owner: string): Promise<{ written: number; skipped: number }> {
  const db = await openDb(owner), tx = db.transaction(WORDS_STORE, 'readwrite'), store = tx.objectStore(WORDS_STORE);
  let written = 0, skipped = 0;
  for (const record of records) {
    const read = store.get(record.key);
    read.onsuccess = () => {
      if (read.result && read.result.dirty !== 'none') { skipped++; return; }
      store.put(record); written++;
    };
  }
  await txDone(tx); return { written, skipped };
}
export async function removeStaleCleanWords(seen: Set<string>, owner: string): Promise<number> {
  const db = await openDb(owner), tx = db.transaction(WORDS_STORE, 'readwrite'), store = tx.objectStore(WORDS_STORE);
  let removed = 0; const read = store.getAll();
  read.onsuccess = () => {
    for (const record of read.result as LocalWordRecord[]) if (record.dirty === 'none' && record.serverId && !seen.has(record.serverId)) { store.delete(record.key); removed++; }
  };
  await txDone(tx); return removed;
}
export async function bindCreatedWord(sent: LocalWordRecord, serverId: string, owner: string): Promise<void> {
  const db = await openDb(owner), tx = db.transaction(WORDS_STORE, 'readwrite'), store = tx.objectStore(WORDS_STORE);
  const read = store.get(sent.key);
  read.onsuccess = () => {
    const current = read.result as LocalWordRecord | undefined;
    // A local deletion while POST was pending must become a server tombstone.
    store.put({ ...(current ?? sent), key: serverId, serverId, dirty: current ? 'updated' : 'deleted',
      revision: current?.revision ?? crypto.randomUUID(), attempts: 0, syncError: undefined });
    store.delete(sent.key);
  };
  await txDone(tx);
}
const LEGACY_CLAIM = 'burlive_admin_dict_legacy_owner_v2';
export async function legacyAdminDrafts(): Promise<LocalWordRecord[]> {
  if (localStorage.getItem(LEGACY_CLAIM)) return [];
  return (await getAllWords('__legacy__')).filter(r => r.dirty !== 'none');
}
// The original DB remains intact as a rollback backup. Only an explicit user action
// can associate its formerly unowned edits with a server account.
export async function claimLegacyAdminDrafts(keys: string[]): Promise<void> {
  const owner = progressOwner();
  if (owner === 'guest') throw new Error('Сначала войдите в свой аккаунт.');
  await syncExclusive('admin-legacy-claim', async () => {
    const claimed = JSON.parse(localStorage.getItem(`${LEGACY_CLAIM}:records`) || '{}') as Record<string, string>;
    const records = await getAllWords('__legacy__');
    if (owner !== progressOwner()) throw new Error('Аккаунт изменился');
    for (const record of records) if (keys.includes(record.key) && !claimed[record.key] && record.dirty !== 'none') {
      if (owner !== progressOwner()) throw new Error('Аккаунт изменился');
      let conflict = false;
      await mutateWordRecord(record.key, current => {
        if (current && current.dirty !== 'none') { conflict = true; return current; }
        return { ...record, revision: crypto.randomUUID(), attempts: 0, syncError: undefined, needsReview: false };
      }, owner);
      if (conflict) throw new Error('Для этого слова уже есть новая правка. Сначала завершите её синхронизацию; старая запись сохранена.');
      claimed[record.key] = owner;
      localStorage.setItem(`${LEGACY_CLAIM}:records`, JSON.stringify(claimed));
    }
  });
}
export async function unclaimedAdminDrafts(): Promise<LocalWordRecord[]> {
  const claimed = JSON.parse(localStorage.getItem(`${LEGACY_CLAIM}:records`) || '{}') as Record<string, string>;
  return (await legacyAdminDrafts()).filter(r => !claimed[r.key]);
}
export async function importLegacyCleanWords(owner = progressOwner()): Promise<void> {
  const meta = await getMeta(owner);
  if (meta.legacyImported) return;
  const [words, legacyMeta] = await Promise.all([getAllWords('__legacy__'), getMeta('__legacy__')]);
  if (owner !== progressOwner()) return;
  for (const record of words) if (record.dirty === 'none') await mutateWordRecord(record.key, current => current ?? record, owner);
  await setMeta({ ...legacyMeta, ...meta, legacyImported: true }, owner);
}

// Локальное хранилище админ-редактора словаря (IndexedDB).
// Полная копия словаря с сервера + локальные правки с dirty-флагами:
// 'created' / 'updated' / 'deleted' (tombstone) ждут выгрузки, 'none' — синхронизировано.
// localStorage не подходит: полный словарь на тысячи слов — несколько мегабайт.
import type { ApiWord, ApiDialect, ApiCategory, CreateWordRequest, UpdateWordRequest, WordStatus } from './api';

const DB_NAME = 'burlive_admin_dict';
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
  attempts?: number; // неудачные попытки push (после MAX_PUSH_ATTEMPTS — только ручной ретрай)
  syncError?: string; // текст последней ошибки push для UI
}

export interface AdminDictMeta {
  lastPullAt?: string;
  total?: number;
  dialects?: ApiDialect[];
  categories?: ApiCategory[];
}

// ---------------------------------------------------------------------------
// IDB-обёртка
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступен'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
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
      dbPromise = null;
      reject(req.error ?? new Error('Не удалось открыть IndexedDB'));
    };
  });
  return dbPromise;
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

export async function getAllWords(): Promise<LocalWordRecord[]> {
  const db = await openDb();
  const tx = db.transaction(WORDS_STORE, 'readonly');
  return reqResult(tx.objectStore(WORDS_STORE).getAll() as IDBRequest<LocalWordRecord[]>);
}

export async function getWordRecord(key: string): Promise<LocalWordRecord | undefined> {
  const db = await openDb();
  const tx = db.transaction(WORDS_STORE, 'readonly');
  return reqResult(tx.objectStore(WORDS_STORE).get(key) as IDBRequest<LocalWordRecord | undefined>);
}

export async function putWordRecord(record: LocalWordRecord): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(WORDS_STORE, 'readwrite');
  tx.objectStore(WORDS_STORE).put(record);
  return txDone(tx);
}

export async function bulkPutWordRecords(records: LocalWordRecord[]): Promise<void> {
  if (!records.length) return;
  const db = await openDb();
  const tx = db.transaction(WORDS_STORE, 'readwrite');
  const store = tx.objectStore(WORDS_STORE);
  for (const r of records) store.put(r);
  return txDone(tx);
}

export async function removeWordRecord(key: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(WORDS_STORE, 'readwrite');
  tx.objectStore(WORDS_STORE).delete(key);
  return txDone(tx);
}

export async function removeWordRecords(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const db = await openDb();
  const tx = db.transaction(WORDS_STORE, 'readwrite');
  const store = tx.objectStore(WORDS_STORE);
  for (const k of keys) store.delete(k);
  return txDone(tx);
}

/** Все записи с локальными изменениями, ждущими выгрузки */
export async function getDirtyWords(): Promise<LocalWordRecord[]> {
  const all = await getAllWords();
  return all.filter((r) => r.dirty !== 'none');
}

export async function countDirtyWords(): Promise<{ pending: number; errors: number }> {
  const dirty = await getDirtyWords();
  return {
    pending: dirty.length,
    errors: dirty.filter((r) => !!r.syncError).length,
  };
}

// ---------------------------------------------------------------------------
// Мета
// ---------------------------------------------------------------------------

export async function getMeta(): Promise<AdminDictMeta> {
  const db = await openDb();
  const tx = db.transaction(META_STORE, 'readonly');
  const value = await reqResult(tx.objectStore(META_STORE).get('meta') as IDBRequest<AdminDictMeta | undefined>);
  return value ?? {};
}

export async function setMeta(patch: Partial<AdminDictMeta>): Promise<void> {
  const current = await getMeta();
  const db = await openDb();
  const tx = db.transaction(META_STORE, 'readwrite');
  tx.objectStore(META_STORE).put({ ...current, ...patch }, 'meta');
  return txDone(tx);
}

// ---------------------------------------------------------------------------
// Нормализация ApiWord <-> локальная запись / запросы
// ---------------------------------------------------------------------------

/** Серверное слово -> локальная запись (populated dialectId/partOfSpeechId сплющиваются в id) */
export function apiWordToRecord(w: ApiWord): LocalWordRecord {
  return {
    key: w._id,
    serverId: w._id,
    word: {
      bur: w.bur,
      ru: w.ru,
      translations: w.translations,
      categoryId: typeof w.categoryId === 'string' ? w.categoryId : undefined,
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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiWord } from './api';
import type { LocalWordRecord, AdminDictMeta } from './adminDictStore';

// In-memory замена IDB-хранилища: в jsdom нет IndexedDB, а стейт-машина
// синка от способа хранения не зависит. Чистые функции берём настоящие.
const memWords = new Map<string, LocalWordRecord>();
let memMeta: AdminDictMeta = {};

vi.mock('./adminDictStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./adminDictStore')>();
  return {
    ...actual,
    getAllWords: async () => [...memWords.values()],
    getWordRecord: async (key: string) => memWords.get(key),
    putWordRecord: async (r: LocalWordRecord) => {
      memWords.set(r.key, r);
    },
    bulkPutWordRecords: async (rs: LocalWordRecord[]) => {
      rs.forEach((r) => memWords.set(r.key, r));
    },
    removeWordRecord: async (key: string) => {
      memWords.delete(key);
    },
    removeWordRecords: async (keys: string[]) => {
      keys.forEach((k) => memWords.delete(k));
    },
    getDirtyWords: async () => [...memWords.values()].filter((r) => r.dirty !== 'none'),
    countDirtyWords: async () => {
      const dirty = [...memWords.values()].filter((r) => r.dirty !== 'none');
      return { pending: dirty.length, errors: dirty.filter((r) => !!r.syncError).length };
    },
    getMeta: async () => memMeta,
    setMeta: async (patch: Partial<AdminDictMeta>) => {
      memMeta = { ...memMeta, ...patch };
    },
  };
});

const apiMocks = vi.hoisted(() => ({
  createWord: vi.fn(),
  updateWord: vi.fn(),
  deleteWord: vi.fn(),
  adminGetWords: vi.fn(),
  adminGetDialects: vi.fn(),
  adminGetCategories: vi.fn(),
  getStoredTokens: vi.fn(),
}));

vi.mock('./api', () => apiMocks);

import { apiWordToRecord, recordToUpdateRequest } from './adminDictStore';
import {
  saveWordLocal,
  deleteWordLocal,
  pushAdminQueue,
  pullFullDictionary,
  adminSyncStats,
} from './adminDictSync';

function makeApiWord(overrides: Partial<ApiWord> = {}): ApiWord {
  return {
    _id: 'srv1',
    bur: 'НОХОЙ',
    ru: 'собака',
    synonyms: [],
    antonyms: [],
    relatedWords: [],
    dialectId: { _id: 'd1', code: 'khori', name: 'Хоринский' },
    partOfSpeechId: null,
    tags: ['животные'],
    sources: [],
    comments: [],
    viewCount: 0,
    lookupCount: 0,
    contributor: { id: 'u1', name: 'Алекс' },
    status: 'verified',
    verificationScore: 5,
    upvotes: [],
    downvotes: [],
    isActiveInGame: true,
    difficulty: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  } as ApiWord;
}

beforeEach(() => {
  memWords.clear();
  memMeta = {};
  vi.clearAllMocks();
  apiMocks.getStoredTokens.mockReturnValue({ access_token: 'a', refresh_token: 'r' });
});

describe('apiWordToRecord (нормализация)', () => {
  it('сплющивает populated dialectId/partOfSpeechId в строки-id и сохраняет мету', () => {
    const rec = apiWordToRecord(makeApiWord());
    expect(rec.key).toBe('srv1');
    expect(rec.serverId).toBe('srv1');
    expect(rec.word.dialectId).toBe('d1');
    expect(rec.dialectMeta).toEqual({ code: 'khori', name: 'Хоринский' });
    expect(rec.word.partOfSpeechId).toBeUndefined();
    expect(rec.dirty).toBe('none');
    expect(rec.word.status).toBe('verified');
  });

  it('recordToUpdateRequest шлёт плоский dialectId и status, без пустых полей', () => {
    const rec = apiWordToRecord(makeApiWord({ pronunciation: '' }));
    const req = recordToUpdateRequest(rec);
    expect(req.dialectId).toBe('d1');
    expect(req.status).toBe('verified');
    expect('pronunciation' in req).toBe(false);
    expect(req.isActiveInGame).toBe(true);
  });
});

describe('saveWordLocal / deleteWordLocal (локальные мутации)', () => {
  it('новое слово получает local-ключ и dirty=created', async () => {
    const key = await saveWordLocal(null, apiWordToRecord(makeApiWord()).word);
    expect(key.startsWith('local-')).toBe(true);
    expect(memWords.get(key)?.dirty).toBe('created');
  });

  it('правка синхронизированного слова даёт dirty=updated, созданного — оставляет created', async () => {
    memWords.set('srv1', apiWordToRecord(makeApiWord()));
    await saveWordLocal('srv1', { ...memWords.get('srv1')!.word, ru: 'пёс' });
    expect(memWords.get('srv1')?.dirty).toBe('updated');
    expect(memWords.get('srv1')?.word.ru).toBe('пёс');

    const localKey = await saveWordLocal(null, memWords.get('srv1')!.word);
    await saveWordLocal(localKey, { ...memWords.get(localKey)!.word, ru: 'пёсик' });
    expect(memWords.get(localKey)?.dirty).toBe('created');
  });

  it('удаление: created — сразу из базы, серверное — tombstone', async () => {
    const localKey = await saveWordLocal(null, apiWordToRecord(makeApiWord()).word);
    await deleteWordLocal(localKey);
    expect(memWords.has(localKey)).toBe(false);

    memWords.set('srv1', apiWordToRecord(makeApiWord()));
    await deleteWordLocal('srv1');
    expect(memWords.get('srv1')?.dirty).toBe('deleted');
  });
});

describe('pushAdminQueue', () => {
  it('created → POST и перепривязка на серверный id', async () => {
    const localKey = await saveWordLocal(null, {
      ...apiWordToRecord(makeApiWord()).word,
      bur: 'МОРИН',
      ru: 'лошадь',
    });
    apiMocks.createWord.mockResolvedValue({ _id: 'srv-new', status: 'verified' });

    const res = await pushAdminQueue();

    expect(res).toMatchObject({ ok: true, pushed: 1, failed: 0, remaining: 0 });
    expect(apiMocks.createWord).toHaveBeenCalledOnce();
    expect(memWords.has(localKey)).toBe(false);
    expect(memWords.get('srv-new')).toMatchObject({ serverId: 'srv-new', dirty: 'none' });
    // статус локально 'verified' — лишний PATCH не нужен
    expect(apiMocks.updateWord).not.toHaveBeenCalled();
  });

  it('updated → PATCH полным набором полей (LWW)', async () => {
    memWords.set('srv1', apiWordToRecord(makeApiWord()));
    await saveWordLocal('srv1', { ...memWords.get('srv1')!.word, ru: 'пёс', dialectId: 'd2' });
    apiMocks.updateWord.mockResolvedValue({});

    const res = await pushAdminQueue();

    expect(res.pushed).toBe(1);
    expect(apiMocks.updateWord).toHaveBeenCalledWith(
      'srv1',
      expect.objectContaining({ ru: 'пёс', dialectId: 'd2', status: 'verified' }),
    );
    expect(memWords.get('srv1')?.dirty).toBe('none');
  });

  it('deleted → DELETE, 404 считается успехом', async () => {
    memWords.set('srv1', apiWordToRecord(makeApiWord()));
    await deleteWordLocal('srv1');
    apiMocks.deleteWord.mockRejectedValue({ statusCode: 404, message: 'not found' });

    const res = await pushAdminQueue();

    expect(res.pushed).toBe(1);
    expect(memWords.has('srv1')).toBe(false);
  });

  it('ошибка пуша копит attempts и syncError, после 3 попыток авторетрай выключается', async () => {
    memWords.set('srv1', apiWordToRecord(makeApiWord()));
    await saveWordLocal('srv1', { ...memWords.get('srv1')!.word, ru: 'пёс' });
    apiMocks.updateWord.mockRejectedValue({ statusCode: 409, message: 'duplicate' });

    for (let i = 1; i <= 3; i++) {
      const res = await pushAdminQueue();
      expect(res.failed).toBe(1);
      expect(memWords.get('srv1')?.attempts).toBe(i);
    }
    expect(memWords.get('srv1')?.syncError).toContain('409');

    const res4 = await pushAdminQueue();
    expect(apiMocks.updateWord).toHaveBeenCalledTimes(3); // 4-й раз не дёргаем
    expect(res4.failed).toBe(0);
    expect(res4.remaining).toBe(1); // правка не потеряна — ждёт ручного ретрая
  });

  it('без сети/токена — не пушит', async () => {
    apiMocks.getStoredTokens.mockReturnValue(null);
    const res = await pushAdminQueue();
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('auth');
  });
});

describe('pullFullDictionary', () => {
  it('постранично тянет всё, не затирает dirty, чистит удалённые на сервере', async () => {
    // Локально: dirty-правка srv1 и чистая запись srv-stale, которой на сервере уже нет
    memWords.set('srv1', {
      ...apiWordToRecord(makeApiWord()),
      dirty: 'updated',
      word: { ...apiWordToRecord(makeApiWord()).word, ru: 'моя правка' },
    });
    memWords.set('srv-stale', apiWordToRecord(makeApiWord({ _id: 'srv-stale', bur: 'ХУУШАН' })));

    apiMocks.adminGetDialects.mockResolvedValue([{ _id: 'd1', code: 'khori', name: 'Хоринский' }]);
    apiMocks.adminGetCategories.mockResolvedValue([{ _id: 'c1', name: 'Животные' }]);
    apiMocks.adminGetWords
      .mockResolvedValueOnce({
        total: 2,
        words: [makeApiWord(), makeApiWord({ _id: 'srv2', bur: 'МОРИН', ru: 'лошадь' })],
      })
      .mockResolvedValue({ total: 2, words: [] });

    const res = await pullFullDictionary();

    expect(res).toMatchObject({ ok: true, total: 2, pulled: 1, skippedDirty: 1, removedStale: 1 });
    expect(memWords.get('srv1')?.word.ru).toBe('моя правка'); // локальная правка жива
    expect(memWords.get('srv2')?.dirty).toBe('none');
    expect(memWords.has('srv-stale')).toBe(false);
    expect(memMeta.dialects?.length).toBe(1);
    expect(memMeta.lastPullAt).toBeTruthy();

    const stats = await adminSyncStats();
    expect(stats).toMatchObject({ pending: 1, total: 2 });
  });
});

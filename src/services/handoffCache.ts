import { progressOwner } from './progressStorage';
// Handoff-кэш для prefetch данных: прогрев кладёт промис, первый потребитель
// забирает его И УДАЛЯЕТ (consume-once). Так экран открывается мгновенно,
// но все последующие обращения идут в живую сеть — никакой протухшей статистики.
interface Entry {
  promise: Promise<unknown>;
  ts: number;
}

const store = new Map<string, Entry>();

/** свежесть прогретых данных */
export const HANDOFF_TTL_MS = 60_000;

export function putHandoff(key: string, promise: Promise<unknown>): void {
  key = `${progressOwner()}:${key}`;
  // упавший prefetch не должен отдать экрану ошибку — молча выбрасываем запись
  promise.catch(() => { if (store.get(key)?.promise === promise) store.delete(key); });
  store.set(key, { promise, ts: Date.now() });
}

export function takeHandoff<T>(key: string): Promise<T> | null {
  key = `${progressOwner()}:${key}`;
  const e = store.get(key);
  if (!e) return null;
  store.delete(key);
  if (Date.now() - e.ts > HANDOFF_TTL_MS) return null;
  return e.promise as Promise<T>;
}

/** для тестов */
export function _clearHandoff(): void {
  store.clear();
}

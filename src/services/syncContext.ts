import { activeCourseId } from '../courses/activeCourse';
import { progressOwner } from './progressStorage';

export function syncContext() {
  const owner = progressOwner(), course = activeCourseId();
  return { owner, course, current: () => owner === progressOwner() && course === activeCourseId() };
}

// Serialize mutations within a WebView; Web Locks also serialize across tabs.
const flights = new Map<string, Promise<unknown>>();
const tails = new Map<string, Promise<unknown>>();
export function syncExclusive<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() => typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(`burlive:${key}`, work) as unknown as Promise<T> : work());
  const done = next.finally(() => { if (tails.get(key) === done) tails.delete(key); });
  tails.set(key, done);
  return done;
}
export function syncSingleFlight<T>(key: string, work: () => Promise<T>): Promise<T> {
  const existing = flights.get(key);
  if (existing) return existing as Promise<T>;
  const run = typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(`burlive:${key}`, work) as unknown as Promise<T> : Promise.resolve().then(work);
  const promise = run.finally(() => { if (flights.get(key) === promise) flights.delete(key); });
  flights.set(key, promise);
  return promise;
}

export function syncErrorText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('; ');
  }
  return 'Не удалось отправить. Запись сохранена на устройстве.';
}

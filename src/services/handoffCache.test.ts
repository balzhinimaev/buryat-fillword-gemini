// Handoff-кэш: consume-once, TTL, упавший prefetch не отдаёт ошибку потребителю.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { putHandoff, takeHandoff, _clearHandoff, HANDOFF_TTL_MS } from './handoffCache';

describe('handoffCache', () => {
  beforeEach(() => {
    _clearHandoff();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('consume-once: второй take возвращает null', async () => {
    putHandoff('k', Promise.resolve(42));
    expect(await takeHandoff<number>('k')).toBe(42);
    expect(takeHandoff('k')).toBeNull();
  });

  it('протухшая запись не отдаётся', () => {
    putHandoff('k', Promise.resolve(1));
    vi.advanceTimersByTime(HANDOFF_TTL_MS + 1);
    expect(takeHandoff('k')).toBeNull();
  });

  it('упавший prefetch удаляется — потребитель не получает reject', async () => {
    const p = Promise.reject(new Error('boom'));
    putHandoff('k', p);
    await vi.advanceTimersByTimeAsync(0); // даём catch сработать
    expect(takeHandoff('k')).toBeNull();
  });
});

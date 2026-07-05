// Прогрев аудио: дедупликация URL, уважение к saveData, повтор после ошибки.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { warmAudio, _resetPrefetchState } from './prefetch';

describe('warmAudio', () => {
  beforeEach(() => {
    _resetPrefetchState();
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const flush = async () => {
    await vi.advanceTimersByTimeAsync(10_000);
  };

  it('качает каждый URL один раз, null/undefined пропускает', async () => {
    warmAudio(['a.mp3', null, 'b.mp3', undefined, 'a.mp3']);
    warmAudio(['a.mp3', 'b.mp3']); // повторный вызов — no-op
    await flush();
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(calls.sort()).toEqual(['a.mp3', 'b.mp3']);
  });

  it('при saveData не качает вообще', async () => {
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true },
      configurable: true,
    });
    warmAudio(['c.mp3']);
    await flush();
    expect(fetch).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
  });

  it('после сетевой ошибки URL можно прогреть повторно', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('net'));
    warmAudio(['d.mp3']);
    await flush();
    warmAudio(['d.mp3']);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

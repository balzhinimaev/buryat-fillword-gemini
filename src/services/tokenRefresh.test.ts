// Гонка refresh-токена: бэкенд ротирует refresh (одноразовый), параллельные 401
// не должны сжигать сессию — refresh обязан быть single-flight.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { refreshTokensOnce, getStoredTokens } from './api';

const setTokens = (a: string, r: string) =>
  localStorage.setItem('auth_tokens', JSON.stringify({ access_token: a, refresh_token: r }));

describe('refreshTokensOnce (single-flight)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('параллельные вызовы делают ровно ОДИН запрос /auth/refresh', async () => {
    setTokens('old-access', 'old-refresh');
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);

    const [a, b, c] = await Promise.all([refreshTokensOnce(), refreshTokensOnce(), refreshTokensOnce()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a?.access_token).toBe('new-access');
    expect(b?.access_token).toBe('new-access');
    expect(c?.access_token).toBe('new-access');
    expect(getStoredTokens()?.refresh_token).toBe('new-refresh');
  });

  it('отвергнутый refresh (401) чистит сессию и отдаёт null всем ожидающим', async () => {
    setTokens('old-access', 'dead-refresh');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    const [a, b] = await Promise.all([refreshTokensOnce(), refreshTokensOnce()]);
    expect(a).toBeNull();
    expect(b).toBeNull();
    expect(getStoredTokens()).toBeNull();
  });

  it('временная ошибка сервера (500) НЕ сносит сессию', async () => {
    setTokens('old-access', 'old-refresh');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    const res = await refreshTokensOnce();
    expect(res?.refresh_token).toBe('old-refresh');
    expect(getStoredTokens()?.refresh_token).toBe('old-refresh');
  });

  it('после завершения single-flight следующий вызов делает новый запрос', async () => {
    setTokens('a1', 'r1');
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ access_token: 'a2', refresh_token: 'r2' }),
      { status: 200 },
    ));
    vi.stubGlobal('fetch', fetchMock);
    await refreshTokensOnce();
    await new Promise((r) => setTimeout(r, 10)); // даём finally сбросить in-flight
    await refreshTokensOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

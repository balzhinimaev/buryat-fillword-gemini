import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Android workshop connectivity errors', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_OFFLINE_MODE', 'true');
    localStorage.clear();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('reports missing server login, not missing internet for a local player', async () => {
    const { joinLanguageKeepers } = await import('./api');
    await expect(joinLanguageKeepers()).rejects.toThrow('вход в серверный аккаунт');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('loads the real keeper profile after Android login', async () => {
    const { getMe, setStoredTokens } = await import('./api');
    setStoredTokens({ access_token: 'test-access', refresh_token: 'test-refresh' });
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ _id: 'server-user', isLanguageKeeper: true }), { status: 200 }));
    await expect(getMe()).resolves.toMatchObject({ _id: 'server-user', isLanguageKeeper: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('reports an actual disconnected device separately', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { joinLanguageKeepers } = await import('./api');
    await expect(joinLanguageKeepers()).rejects.toThrow('Нет подключения к интернету');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('allows an online server session to join the workshop', async () => {
    const { joinLanguageKeepers, setStoredTokens } = await import('./api');
    setStoredTokens({ access_token: 'test-access', refresh_token: 'test-refresh' });
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ isLanguageKeeper: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await expect(joinLanguageKeepers()).resolves.toMatchObject({ isLanguageKeeper: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { delete window.__FILLWORD_CONFIG__; vi.unstubAllEnvs(); vi.resetModules(); });
it('keeps web authorization required when the runtime config is absent', async () => {
  vi.stubEnv('VITE_OFFLINE_MODE', 'false');
  expect((await import('./offline')).OFFLINE).toBe(false);
});
it('enables the local engine for runtime guest mode without an Android build', async () => {
  vi.stubEnv('VITE_OFFLINE_MODE', 'false');
  window.__FILLWORD_CONFIG__ = { authMode: 'guest' };
  expect((await import('./offline')).OFFLINE).toBe(true);
});
it('restores the existing server-backed web mode when required is selected', async () => {
  vi.stubEnv('VITE_OFFLINE_MODE', 'false');
  window.__FILLWORD_CONFIG__ = { authMode: 'required' };
  expect((await import('./offline')).OFFLINE).toBe(false);
});
it('does not change the native offline build when web authorization is required', async () => {
  vi.stubEnv('VITE_OFFLINE_MODE', 'true');
  window.__FILLWORD_CONFIG__ = { authMode: 'required' };
  expect((await import('./offline')).OFFLINE).toBe(true);
});

it('uses the server-backed engine in Telegram mode, not a local guest', async () => {
  vi.stubEnv('VITE_OFFLINE_MODE', 'false');
  window.__FILLWORD_CONFIG__ = { authMode: 'telegram' };
  expect((await import('./accessMode')).TELEGRAM_MODE).toBe(true);
  expect((await import('./offline')).OFFLINE).toBe(false);
});

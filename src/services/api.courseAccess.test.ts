import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chooseCourse } from '../courses/progress';
import {
  apiRequest, clearStoredTokens, registerPushDevice, setStoredTokens,
  unregisterPushDevice, updateName, updateOnboarding,
} from './api';

vi.mock('../config/offline', () => ({ OFFLINE: true, isNetOnline: () => true }));

beforeEach(() => {
  localStorage.clear();
  setStoredTokens({ access_token: 'account-access-fixture', refresh_token: 'account-refresh-fixture' });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ name: 'Ученик', onboardingCompleted: true }))));
});
afterEach(() => {
  clearStoredTokens();
  localStorage.clear();
  chooseCourse('bua-ru');
  vi.unstubAllGlobals();
});

describe.each(['en-ru', 'cs-ru'] as const)('%s account requests', course => {
  beforeEach(() => chooseCourse(course));

  it('saves the shared account name and onboarding without requiring the Buryat course', async () => {
    await expect(updateName('Ученик')).resolves.toMatchObject({ name: 'Ученик' });
    await expect(updateOnboarding({ onboardingCompleted: true })).resolves.toMatchObject({ onboardingCompleted: true });
    expect(fetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/users/me/name'), expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Ученик' }) }));
    expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/users/me/onboarding'), expect.objectContaining({ method: 'PATCH' }));
  });

  it('registers and unregisters this device independently of the selected course', async () => {
    await expect(registerPushDevice({ token: 'push-fixture', platform: 'android' })).resolves.toBeUndefined();
    await expect(unregisterPushDevice('push-fixture')).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('still permits sign-in, course sync and shared settings', async () => {
    for (const path of ['/auth/me', `/courses/${course}/progress`, '/users/me/settings', '/referrals/reminder-consent']) {
      await expect(apiRequest(path)).resolves.toBeDefined();
    }
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('does not expose Buryat progress, contributions or similarly prefixed endpoints', async () => {
    for (const path of ['/campaign/sync-progress', '/textbook/lesson/home/complete', '/words', '/users/me/join-keepers', '/users/me/name/admin', '/push/devices/register-extra']) {
      await expect(apiRequest(path, { method: 'POST' })).rejects.toThrow('Этот сетевой раздел доступен в бурятском курсе');
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});

it('keeps local players offline instead of pretending to save a server account', async () => {
  clearStoredTokens();
  chooseCourse('en-ru');
  await expect(updateName('Ученик')).rejects.toThrow('нужен вход в серверный аккаунт');
  await expect(registerPushDevice({ token: 'push-fixture', platform: 'android' })).resolves.toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
});

import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
vi.mock('../config/offline', () => ({ OFFLINE: false, isNetOnline: () => true }));
vi.mock('../config/accessMode', () => ({ TELEGRAM_MODE: true }));
vi.mock('../hooks/useTelegram', () => ({ useTelegram: () => ({ initData: 'signed-launch-fixture', isReady: true, isTelegram: true }) }));
import { useAuthStore } from './authStore';
import { setStoredTokens } from '../services/api';
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });
it('uses signed Telegram launch rather than an unrelated stored session', async () => {
 localStorage.clear();
 setStoredTokens({ access_token: 'previous-fixture', refresh_token: 'previous-refresh-fixture' });
 localStorage.setItem('auth_user', JSON.stringify({ _id: 'previous-account', name: 'Old' }));
 const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
   if (String(url).endsWith('/auth/telegram')) {
     expect(JSON.parse(String(options?.body))).toEqual({ initData: 'signed-launch-fixture' });
     return new Response(JSON.stringify({ _id: 'telegram-account', name: 'Telegram', role: 'user', onboardingCompleted: true, access_token: 'new-fixture', refresh_token: 'new-refresh-fixture' }), { status: 200 });
   }
   if (String(url).endsWith('/auth/me')) return new Response(JSON.stringify({ id: 'telegram-account', name: 'Telegram', role: 'user', onboardingCompleted: true, stats: {} }), { status: 200 });
   throw new Error('Unexpected request: ' + url);
 });
 vi.stubGlobal('fetch', fetchMock);
 const { result } = renderHook(() => useAuthStore());
 expect(result.current.state.user).toBeNull();
 await waitFor(() => expect(result.current.state.user?._id).toBe('telegram-account'));
 expect(result.current.state.isAuthenticated).toBe(true);
 expect(fetchMock).toHaveBeenCalledTimes(2);
});

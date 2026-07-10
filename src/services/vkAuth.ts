// VK ID OAuth 2.1 (PKCE); id приложения — в VITE_VK_CLIENT_ID (классический oauth.vk.com даёт Security Error).
// Флоу: authorize на id.vk.com с code_challenge → возврат code+device_id+state → бэкенд меняет
// code (+code_verifier+device_id) на токен и берёт профиль. Натив — через deep-link, веб — через URL.
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const VK_CLIENT_ID = (import.meta.env.VITE_VK_CLIENT_ID as string) || '';
// Канонический домен. Должен совпадать с Trusted Redirect URL в настройках VK ID приложения.
export const VK_REDIRECT_URI = 'https://buryat-game.ru/auth/vk/callback';
export const VK_CONFIGURED = VK_CLIENT_ID.length > 0;

const AUTHORIZE_URL = 'https://id.vk.com/authorize';
const PKCE_KEY = 'vk_pkce'; // { verifier, state }

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function randomString(nBytes: number): string {
  const a = new Uint8Array(nBytes);
  crypto.getRandomValues(a);
  return base64url(a);
}
async function sha256Base64url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return base64url(new Uint8Array(digest));
}

export async function startVkLogin(): Promise<void> {
  if (!VK_CONFIGURED) {
    console.warn('VK_CLIENT_ID не задан — вход через VK недоступен');
    return;
  }
  const verifier = randomString(48); // code_verifier (~64 симв., в допустимом диапазоне 43–128)
  const state = randomString(16);
  const challenge = await sha256Base64url(verifier);
  localStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }));

  const url =
    `${AUTHORIZE_URL}?response_type=code&client_id=${encodeURIComponent(VK_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(VK_REDIRECT_URI)}` +
    `&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256` +
    `&state=${encodeURIComponent(state)}&scope=`;

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.location.href = url;
  }
}

export interface VkReturn {
  code: string;
  deviceId: string;
  state: string;
}

// Натив deep-link: ru.burlive.app://vk?code=...&device_id=...&state=...
export function parseVkReturn(url: string): VkReturn | null {
  if (!url || !url.startsWith('ru.burlive.app://vk')) return null;
  const q = url.split('?')[1] || '';
  const p = new URLSearchParams(q);
  const code = p.get('code');
  if (!code) return null;
  return { code, deviceId: p.get('device_id') || '', state: p.get('state') || '' };
}

// Веб-возврат: ?vk_code=...&vk_device_id=...&vk_state=... ; возвращает и очищает URL.
export function consumeWebVkReturn(): VkReturn | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('vk_code');
    if (!code) return null;
    const ret: VkReturn = {
      code,
      deviceId: params.get('vk_device_id') || '',
      state: params.get('vk_state') || '',
    };
    ['vk_code', 'vk_device_id', 'vk_state'].forEach((k) => params.delete(k));
    const qs = params.toString();
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash,
    );
    return ret;
  } catch {
    return null;
  }
}

// Достаём сохранённый code_verifier и сверяем state.
export function takePkce(returnedState: string): string | null {
  try {
    const raw = localStorage.getItem(PKCE_KEY);
    if (!raw) return null;
    localStorage.removeItem(PKCE_KEY);
    const { verifier, state } = JSON.parse(raw) as { verifier: string; state: string };
    if (returnedState && state && returnedState !== state) {
      console.warn('VK state mismatch');
      return null;
    }
    return verifier || null;
  } catch {
    return null;
  }
}

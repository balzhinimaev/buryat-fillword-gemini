// VK OAuth (web code-flow) для нативного Android. Открываем страницу авторизации VK во
// встроенном браузере; VK редиректит на https://burlive.ru/auth/vk/callback, которая
// бросает code в приложение через deep-link ru.burlive.app://vk?code=... (см. App.tsx).
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const VK_CLIENT_ID = (import.meta.env.VITE_VK_CLIENT_ID as string) || '';
// Один redirect_uri на оба флоу: callback-страница пробует deep-link (натив),
// иначе кидает в burlive.ru/webapp/?vk_code=... (веб). Должен совпадать с настройкой VK-приложения.
// Временно через anoname.ru — VK режет свежий burlive.ru как «вредоносный» (ложно).
export const VK_REDIRECT_URI = 'https://anoname.ru/auth/vk/callback';
export const VK_CONFIGURED = VK_CLIENT_ID.length > 0;

function authorizeUrl(): string {
  // Без scope: для входа нужны только user_id + публичный профиль (users.get),
  // им scope не требуется. scope=email вызывал invalid_request/invalid scope.
  return (
    `https://oauth.vk.com/authorize?client_id=${encodeURIComponent(VK_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(VK_REDIRECT_URI)}` +
    `&response_type=code&display=mobile&v=5.199`
  );
}

export async function startVkLogin(): Promise<void> {
  if (!VK_CONFIGURED) {
    console.warn('VK_CLIENT_ID не задан — вход через VK недоступен');
    return;
  }
  if (Capacitor.isNativePlatform()) {
    // Натив: открываем во встроенном браузере, возврат — по deep-link.
    await Browser.open({ url: authorizeUrl() });
  } else {
    // Веб (Mini App / браузер): редиректим текущее окно, возврат — на /webapp/?vk_code=.
    window.location.href = authorizeUrl();
  }
}

// Достаём code из нативного deep-link вида ru.burlive.app://vk?code=XXXX
export function parseVkCode(url: string): string | null {
  if (!url || !url.startsWith('ru.burlive.app://vk')) return null;
  const m = url.match(/[?&]code=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// Веб-возврат: code лежит в ?vk_code=... текущего URL. Возвращает код и очищает URL.
export function consumeWebVkCode(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('vk_code');
    if (!code) return null;
    params.delete('vk_code');
    const qs = params.toString();
    const clean = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
    window.history.replaceState(null, '', clean);
    return code;
  } catch {
    return null;
  }
}

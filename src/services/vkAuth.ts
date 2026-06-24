// VK OAuth (web code-flow) для нативного Android. Открываем страницу авторизации VK во
// встроенном браузере; VK редиректит на https://burlive.ru/auth/vk/callback, которая
// бросает code в приложение через deep-link ru.burlive.app://vk?code=... (см. App.tsx).
import { Browser } from '@capacitor/browser';

const VK_CLIENT_ID = (import.meta.env.VITE_VK_CLIENT_ID as string) || '';
export const VK_REDIRECT_URI = 'https://burlive.ru/auth/vk/callback';
export const VK_CONFIGURED = VK_CLIENT_ID.length > 0;

export async function startVkLogin(): Promise<void> {
  if (!VK_CONFIGURED) {
    console.warn('VK_CLIENT_ID не задан — вход через VK недоступен');
    return;
  }
  const url =
    `https://oauth.vk.com/authorize?client_id=${encodeURIComponent(VK_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(VK_REDIRECT_URI)}` +
    `&response_type=code&scope=email&display=mobile&v=5.199`;
  await Browser.open({ url });
}

// Достаём code из deep-link вида ru.burlive.app://vk?code=XXXX
export function parseVkCode(url: string): string | null {
  if (!url || !url.startsWith('ru.burlive.app://vk')) return null;
  const m = url.match(/[?&]code=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

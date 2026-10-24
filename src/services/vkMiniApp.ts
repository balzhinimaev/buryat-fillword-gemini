// Режим VK Mini App: приложение запущено внутри ВКонтакте (iframe/webview)
// с подписанными launch-параметрами в query-строке. Отдельного приложения нет —
// тот же SPA, автологин через POST /auth/vk-miniapp (подпись проверяет сервер).
import type { VKBridge } from '../vendor/vk-bridge';

// Load the bridge only when a VK operation is requested.
const bridge: Pick<VKBridge, 'send'> = {
  async send<T = Record<string, unknown>>(method: string, params?: Record<string, unknown>): Promise<T> {
    const { default: client } = await import('../vendor/vk-bridge');
    return client.send<T>(method, params);
  },
};

/** Сырые launch-параметры VK (query при первом запуске) — фиксируем сразу:
    SPA может менять URL, а параметры нужны для авторизации. */
export const VK_LAUNCH_PARAMS: string = (() => {
  try {
    const qs = window.location.search.replace(/^\?/, '');
    return /(^|&)vk_app_id=/.test(qs) ? qs : '';
  } catch {
    return '';
  }
})();

/** Мы внутри VK Mini App? */
export const IS_VK_MINIAPP = VK_LAUNCH_PARAMS.length > 0;

let inited = false;

/** Обязательный хендшейк с контейнером VK (без него VK показывает вечный лоадер) */
export function initVkMiniApp(): void {
  if (!IS_VK_MINIAPP || inited) return;
  inited = true;
  try {
    void bridge.send('VKWebAppInit', {}).catch(() => {});
    // Тёмная шапка под палитру приложения (мягко игнорируем, если не поддерживается)
    void bridge
      .send('VKWebAppSetViewSettings', {
        status_bar_style: 'light',
        action_bar_color: '#1c1917',
        navigation_bar_color: '#1c1917',
      })
      .catch(() => {});
  } catch {
    /* вне VK — no-op */
  }
}

export { bridge as vkBridge };

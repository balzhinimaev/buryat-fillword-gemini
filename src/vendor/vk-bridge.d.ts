// Типы для завендоренного @vkontakte/vk-bridge 2.15.4 (минимально необходимое).
// Вендорим дистрибутив целиком: npm 9 на сервере не может добавить зависимость
// (Invalid comparator: npm:rolldown-vite), а lock-файл трогать рискованно.
export interface VKBridge {
  send<T = Record<string, unknown>>(method: string, params?: Record<string, unknown>): Promise<T>;
  subscribe(listener: (event: { detail: { type: string; data: unknown } }) => void): void;
  unsubscribe(listener: (event: { detail: { type: string; data: unknown } }) => void): void;
  isWebView(): boolean;
  isEmbedded(): boolean;
  supports(method: string): boolean;
}
declare const bridge: VKBridge;
export default bridge;

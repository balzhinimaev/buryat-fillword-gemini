// Единая база API для всех сервисов (api.ts, офлайн-синки).
// Раньше синки ходили на buryat-game.ru, а api.ts — на burlive.ru; оба домена
// проксируют один бэкенд, но источник должен быть один.
export const API_BASE: string = import.meta.env.VITE_API_URL || 'https://burlive.ru/api';

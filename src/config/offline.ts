// Флаг полностью офлайн-сборки (нативное приложение без сервера).
// Включается на этапе сборки через VITE_OFFLINE_MODE=true (.env.production).
export const OFFLINE: boolean = import.meta.env.VITE_OFFLINE_MODE === 'true';

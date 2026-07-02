// Флаг офлайн-способной сборки (нативное приложение со вшитым контентом).
// Включается на этапе сборки через VITE_OFFLINE_MODE=true (.env.production).
export const OFFLINE: boolean = import.meta.env.VITE_OFFLINE_MODE === 'true';

// Runtime-проверка сети. В офлайн-сборке локальные данные — источник истины,
// а сеть используется для фоновой синхронизации и онлайн-разделов (лидерборды и т.п.).
export const isNetOnline = (): boolean =>
  typeof navigator === 'undefined' || navigator.onLine !== false;

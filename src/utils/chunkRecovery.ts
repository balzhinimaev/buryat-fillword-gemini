const RELOAD_FLAG_KEY = 'bfw_chunk_reload_once';

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk [\d]+ failed/i,
  /ChunkLoadError/i,
  /dynamically imported module/i,
];

const getErrorMessage = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message || String(value);
  if (typeof value === 'object') {
    const maybeMessage = (value as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }
  return String(value);
};

const isChunkLoadError = (message: string): boolean =>
  CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));

const reloadOnce = () => {
  const lastReloadAt = Number(sessionStorage.getItem(RELOAD_FLAG_KEY) ?? '0');
  const recentlyReloaded = Number.isFinite(lastReloadAt) && Date.now() - lastReloadAt < 60_000;

  if (recentlyReloaded) return;

  sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
  window.location.reload();
};

export const setupChunkLoadErrorRecovery = () => {
  window.addEventListener('error', (event) => {
    const message = getErrorMessage((event as ErrorEvent).error) || getErrorMessage(event.message);
    if (isChunkLoadError(message)) {
      reloadOnce();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const message = getErrorMessage(event.reason);
    if (isChunkLoadError(message)) {
      reloadOnce();
    }
  });
};

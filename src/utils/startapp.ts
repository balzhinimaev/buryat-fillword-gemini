export type StartAppIntent =
  | { type: 'daily'; raw: string }
  | { type: 'resume'; raw: string }
  | { type: 'module'; moduleId: string; raw: string };

/**
 * Достаёт raw startapp payload из:
 * 1) query string (?startapp=...)
 * 2) Telegram initDataUnsafe.start_param
 */
export function extractStartAppPayload(params: {
  search?: string;
  telegramStartParam?: string | null;
}): string | null {
  const fromQuery = readStartAppFromSearch(params.search);
  if (fromQuery) return fromQuery;

  const tg = (params.telegramStartParam || '').trim();
  return tg.length > 0 ? tg : null;
}

export function readStartAppFromSearch(search?: string): string | null {
  if (!search) return null;

  try {
    const qs = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const startApp = (qs.get('startapp') || '').trim();
    if (startApp) return startApp;

    const startParam = (qs.get('start_param') || '').trim();
    if (startParam) return startParam;

    return null;
  } catch {
    return null;
  }
}

export function parseStartAppIntent(rawPayload?: string | null): StartAppIntent | null {
  const raw = (rawPayload || '').trim();
  if (!raw) return null;

  const normalized = raw.toLowerCase();

  if (normalized === 'daily') {
    return { type: 'daily', raw };
  }

  if (normalized === 'resume') {
    return { type: 'resume', raw };
  }

  const moduleMatch = raw.match(/^module:(.+)$/i);
  if (moduleMatch?.[1]) {
    const moduleId = moduleMatch[1].trim();
    if (!moduleId) return null;
    return { type: 'module', moduleId, raw };
  }

  return null;
}

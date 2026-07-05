// Фоновый prefetch: JS-чанки экранов и аудиофайлы подгружаются заранее,
// чтобы по тапу ничего не ждать. Работает бережно: только при сети,
// не при включённой экономии трафика, в простое и с паузами между файлами.

interface NetInfo {
  saveData?: boolean;
  effectiveType?: string;
}

function canPrefetch(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (navigator.onLine === false) return false;
  const conn = (navigator as { connection?: NetInfo }).connection;
  if (conn?.saveData) return false;
  if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return false;
  return true;
}

function idle(cb: () => void, timeout = 4000): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => cb(), { timeout });
  } else {
    setTimeout(cb, 1200);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Чанки экранов: те же import(), что и в React.lazy — Vite отдаёт тот же чанк,
// так что при навигации он уже в кэше модулей.
// ---------------------------------------------------------------------------

let screensPrefetched = false;

export function prefetchScreens(): void {
  if (screensPrefetched || !canPrefetch()) return;
  screensPrefetched = true;
  const loaders: Array<() => Promise<unknown>> = [
    // самые вероятные переходы — первыми
    () => import('../screens/TextbookScreen'),
    () => import('../screens/TextbookLessonScreen'),
    () => import('../screens/DictionaryScreen'),
    () => import('../screens/StatsScreen'),
    () => import('../screens/SettingsScreen'),
    () => import('../screens/LeaderboardScreen'),
    () => import('../screens/WordDetailScreen'),
  ];
  idle(async () => {
    for (const load of loaders) {
      if (!canPrefetch()) return;
      await load().catch(() => {});
      await sleep(250); // не душим сеть и главный поток
    }
  });
}

// ---------------------------------------------------------------------------
// Данные разделов: обзор кампаний и первая страница словаря.
// Кладутся в handoff-кэш (consume-once, TTL 60с) — первый вход мгновенный,
// дальше всегда живая сеть.
// ---------------------------------------------------------------------------

let dataPrefetched = false;

export function prefetchData(): void {
  if (dataPrefetched || !canPrefetch()) return;
  dataPrefetched = true;
  idle(async () => {
    if (!canPrefetch()) { dataPrefetched = false; return; }
    const { prefillCampaignOverview, prefillDictFirstPage } = await import('./api');
    prefillCampaignOverview();
    await sleep(300);
    prefillDictFirstPage();
  }, 3000);
}

// ---------------------------------------------------------------------------
// Аудио: прогрев HTTP-кэша. Повторные вызовы по тому же URL — no-op.
// ---------------------------------------------------------------------------

const warmedAudio = new Set<string>();

export function warmAudio(urls: Array<string | null | undefined>): void {
  if (!canPrefetch()) return;
  const fresh: string[] = [];
  for (const u of urls) {
    if (u && !warmedAudio.has(u)) {
      warmedAudio.add(u);
      fresh.push(u);
    }
  }
  if (!fresh.length) return;
  idle(async () => {
    for (const url of fresh) {
      if (!canPrefetch()) return;
      try {
        await fetch(url, { priority: 'low' } as RequestInit);
      } catch {
        warmedAudio.delete(url); // не удалось — попробуем в следующий раз
      }
      await sleep(150);
    }
  }, 2500);
}

/** для тестов */
export function _resetPrefetchState(): void {
  screensPrefetched = false;
  dataPrefetched = false;
  warmedAudio.clear();
}

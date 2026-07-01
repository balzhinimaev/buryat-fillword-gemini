// OTA-обновление веб-бандла без переустановки APK (self-hosted, @capgo/capacitor-updater).
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { APP_VERSION_NAME } from '../config/version';

const OTA_MANIFEST_URL = 'https://burlive.ru/app/ota.json';

export interface OtaInfo { version: string; url: string; checksum: string; }

// Подтверждаем, что текущий бандл рабочий — иначе capgo откатит на предыдущий.
export async function notifyReady(): Promise<void> {
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch {
    /* плагин может отсутствовать в вебе — игнорируем */
  }
}

// Сброс к ВСТРОЕННОМУ в APK бандлу: отменяет любой ранее применённый OTA-бандл.
// Используется в сборке «без OTA-магии» — приложение всегда грузит то, что зашито в APK.
export async function revertToBuiltin(): Promise<void> {
  try {
    await CapacitorUpdater.reset();
  } catch {
    /* ignore */
  }
}

// Проверка доступности OTA-обновления (БЕЗ применения). Возвращает info или null.
export async function checkOtaAvailable(): Promise<OtaInfo | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const r = await fetch(OTA_MANIFEST_URL, { cache: 'no-store' });
    if (!r.ok) return null;
    const m = (await r.json()) as Partial<OtaInfo>;
    // Без контрольной суммы бандл НЕ применяем — защита целостности (S1).
    if (!m.version || !m.url || !m.checksum) return null;

    let current = '';
    try {
      current = (await CapacitorUpdater.current())?.bundle?.version ?? '';
    } catch { /* ignore */ }
    // Уже стоит эта версия (встроенная или ранее применённая) — обновлять нечего.
    if (m.version === current || m.version === APP_VERSION_NAME) return null;

    return { version: m.version, url: m.url, checksum: m.checksum };
  } catch {
    return null;
  }
}

// Скачать и применить OTA с колбэком прогресса (0..100). set() перезагрузит webview.
export async function applyOta(info: OtaInfo, onProgress?: (pct: number) => void): Promise<void> {
  let handle: { remove: () => void } | undefined;
  try {
    handle = await CapacitorUpdater.addListener('download', (s: { percent?: number }) => {
      if (typeof s.percent === 'number') {
        onProgress?.(Math.max(0, Math.min(100, Math.round(s.percent))));
      }
    });
  } catch { /* ignore */ }
  try {
    const bundle = await CapacitorUpdater.download({
      url: info.url, version: info.version, checksum: info.checksum,
    });
    onProgress?.(100);
    await CapacitorUpdater.set(bundle); // применяет бандл и перезагружает webview
  } finally {
    try { handle?.remove(); } catch { /* ignore */ }
  }
}

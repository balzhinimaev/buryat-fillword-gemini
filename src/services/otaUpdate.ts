// OTA-обновление веб-бандла без переустановки APK (self-hosted, @capgo/capacitor-updater).
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { APP_VERSION_NAME } from '../config/version';

const OTA_MANIFEST_URL = 'https://burlive.ru/app/ota.json';

// Подтверждаем, что текущий бандл рабочий — иначе capgo откатит на предыдущий.
export async function notifyReady(): Promise<void> {
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch {
    /* плагин может отсутствовать в вебе — игнорируем */
  }
}

// Проверка и применение OTA-бандла. На лету подменяет веб-ассеты и перезагружает webview.
export async function checkOtaUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const r = await fetch(OTA_MANIFEST_URL, { cache: 'no-store' });
    if (!r.ok) return;
    const m = (await r.json()) as { version?: string; url?: string };
    if (!m.version || !m.url) return;

    let current = '';
    try {
      const cur = await CapacitorUpdater.current();
      current = cur?.bundle?.version ?? '';
    } catch {
      /* ignore */
    }
    // Если на сервере та же версия, что встроена/установлена — ничего не делаем.
    if (m.version === current || m.version === APP_VERSION_NAME) return;

    const bundle = await CapacitorUpdater.download({ url: m.url, version: m.version });
    await CapacitorUpdater.set(bundle); // применяет бандл и перезагружает webview
  } catch (e) {
    console.log('OTA check failed (offline?)', e);
  }
}

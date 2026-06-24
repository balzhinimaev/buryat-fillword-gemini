// Проверка обновления APK (для sideload-установок вне Google Play).
import { APP_VERSION_CODE } from '../config/version';

const VERSION_URL = 'https://burlive.ru/app/version.json';

export interface ApkUpdateInfo {
  available: boolean;
  versionName: string;
  apkUrl: string;
  notes: string;
  mandatory: boolean;
}

export async function checkApkUpdate(): Promise<ApkUpdateInfo | null> {
  try {
    const r = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!r.ok) return null;
    const d = await r.json();
    return {
      available: Number(d.versionCode) > APP_VERSION_CODE,
      versionName: String(d.versionName ?? ''),
      apkUrl: String(d.apkUrl ?? ''),
      notes: String(d.notes ?? ''),
      mandatory: !!d.mandatory,
    };
  } catch {
    return null; // офлайн/ошибка — молча игнорируем
  }
}

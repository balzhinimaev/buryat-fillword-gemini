// Рефералка: захват пригласительного кода на старте (?ref=… в вебе,
// startapp=ref_… в Telegram Mini App, #ref_… в VK Mini App) и заявка кода
// после авторизации. Код хранится в localStorage до первого успешного claim.
import { api } from './api';
import { extractStartAppPayload } from '../utils/startapp';
import { IS_VK_MINIAPP, VK_LAUNCH_PARAMS, vkBridge } from './vkMiniApp';

const PENDING_KEY = 'burlive_pending_ref';
const CLAIMED_KEY = 'burlive_ref_claimed';

/** Вызвать как можно раньше на старте — до потери query-параметров */
export function captureReferralCode(): void {
  try {
    if (localStorage.getItem(CLAIMED_KEY)) return;

    let code = '';
    const qs = new URLSearchParams(window.location.search);
    code = (qs.get('ref') || '').trim();

    if (!code) {
      const payload = extractStartAppPayload({
        search: window.location.search,
        telegramStartParam: window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? null,
      });
      const m = payload?.match(/^ref_([a-f0-9]{24})$/i);
      if (m) code = m[1];
    }

    // VK Mini App: vk.com/app…#ref_CODE — параметр приезжает в hash
    if (!code) {
      const h = (window.location.hash || '').replace(/^#/, '');
      const m = h.match(/(?:^|[&/])ref[_=]([a-f0-9]{24})(?:$|[&/])/i);
      if (m) code = m[1];
    }

    if (/^[a-f0-9]{24}$/i.test(code)) {
      localStorage.setItem(PENDING_KEY, code);
    }
  } catch {
    // localStorage может быть недоступен — тихо пропускаем
  }
}

/**
 * Заявить сохранённый код (вызывать после авторизации).
 * Успех и «бизнес-отказы» (чужая ошибка кода, старый аккаунт) снимают код,
 * сетевые ошибки оставляют его для следующей попытки.
 */
export async function claimPendingReferral(): Promise<number> {
  let code = '';
  try {
    if (localStorage.getItem(CLAIMED_KEY)) return 0;
    code = localStorage.getItem(PENDING_KEY) || '';
  } catch {
    return 0;
  }
  if (!code) return 0;

  try {
    const res = await api.claimReferral(code);
    localStorage.removeItem(PENDING_KEY);
    localStorage.setItem(CLAIMED_KEY, '1');
    return res.alreadyClaimed ? 0 : res.xpGained;
  } catch (e) {
    const status = (e as { statusCode?: number })?.statusCode ?? 0;
    // Снимаем код только на бизнес-отказах (невалидный код / старый аккаунт).
    // 401/403 (транзиентная сессия), 429 (троттлинг), 5xx и сеть — оставляем на ретрай.
    if (status === 400 || status === 404) {
      localStorage.removeItem(PENDING_KEY);
    }
    return 0;
  }
}

/** id VK-приложения из launch-параметров (только внутри VK Mini App) */
function vkAppId(): string {
  try {
    return new URLSearchParams(VK_LAUNCH_PARAMS).get('vk_app_id') || '';
  } catch {
    return '';
  }
}

/** Ссылки приглашения для шаринга */
export function buildReferralLinks(code: string): {
  telegram: string;
  web: string;
  vk: string | null;
  shareText: string;
} {
  const appId = vkAppId();
  return {
    telegram: `https://t.me/buryat_fillword_bot/buryatgameapp?startapp=ref_${code}`,
    web: `https://buryat-game.ru/webapp/?ref=${code}`,
    vk: appId ? `https://vk.com/app${appId}#ref_${code}` : null,
    shareText: 'Учу бурятский в игре «Буряад үгэнүүд» — присоединяйся, обоим начислят бонус! 🎁',
  };
}

/**
 * Нативный шаринг: внутри VK — VKWebAppShare, иначе системный Web Share API.
 * true = поделились (или открыли диалог), false = способа нет / отменено.
 */
export async function shareReferral(code: string): Promise<boolean> {
  const links = buildReferralLinks(code);
  if (IS_VK_MINIAPP && links.vk) {
    try {
      await vkBridge.send('VKWebAppShare', { link: links.vk });
      return true;
    } catch {
      return false; // юзер закрыл диалог — не считаем ошибкой
    }
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: links.shareText, url: links.web });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** Доступен ли какой-то нативный шаринг (для показа кнопки) */
export function canShareReferral(): boolean {
  return IS_VK_MINIAPP || typeof navigator.share === 'function';
}

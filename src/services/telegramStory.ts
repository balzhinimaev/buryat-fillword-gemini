// Публикация в Telegram Stories из Mini App (Bot API 7.8+, WebApp.shareToStory):
// открывает редактор истории с брендированной подложкой, текстом и — для премиум
// пользователей — кнопкой-ссылкой на игру. Ссылка несёт реф-код автора истории.
import { buildReferralLinks } from './referral';

const STORY_INVITE_URL = 'https://buryat-game.ru/webapp/story/story-invite-v3.png';
const STORY_WIN_URL = 'https://buryat-game.ru/api/share/story.png';

interface StoryWidgetLink {
  url: string;
  name?: string;
}

interface ShareToStoryParams {
  text?: string;
  widget_link?: StoryWidgetLink;
}

type TgWebAppWithStory = {
  shareToStory?: (mediaUrl: string, params?: ShareToStoryParams) => void;
  isVersionAtLeast?: (v: string) => boolean;
};

function webApp(): TgWebAppWithStory | null {
  return (window.Telegram?.WebApp as TgWebAppWithStory | undefined) ?? null;
}

/** Доступна ли публикация истории (Telegram Mini App версии 7.8+) */
export function canShareStory(): boolean {
  const wa = webApp();
  return !!wa
    && typeof wa.shareToStory === 'function'
    && (wa.isVersionAtLeast?.('7.8') ?? false);
}

function gameLink(refCode?: string | null): string {
  return refCode
    ? buildReferralLinks(refCode).telegram
    : 'https://t.me/buryat_fillword_bot/buryatgameapp';
}

/** История-приглашение (из карточки рефералки) */
export function shareInviteStory(refCode?: string | null): void {
  const wa = webApp();
  if (!wa?.shareToStory) return;
  const link = gameLink(refCode);
  wa.shareToStory(STORY_INVITE_URL, {
    text: `Учу бурятский в игре «Буряад үгэнүүд» — присоединяйся, обоим бонус! 🎁\n${link}`,
    // кнопка на истории — только у премиум-авторов, остальным Telegram её опустит
    widget_link: { url: link, name: 'Играть' },
  });
}

/** История с результатом уровня (из win-модалки) */
export function shareWinStory(
  opts: { stars?: number; wordsFound?: number; levelName?: string; seconds?: number },
  refCode?: string | null,
): void {
  const wa = webApp();
  if (!wa?.shareToStory) return;
  const link = gameLink(refCode);
  const star = opts.stars ? '⭐'.repeat(Math.max(1, Math.min(3, opts.stars))) : '';
  const what = opts.levelName ? `«${opts.levelName}»` : 'уровень';
  const words = opts.wordsFound ? `, ${opts.wordsFound} слов найдено` : '';
  const media = new URL(STORY_WIN_URL);
  const bounded = (value: number | undefined, max: number) => String(Math.max(0, Math.min(max, Math.round(Number.isFinite(value) ? value! : 0))));
  media.search = new URLSearchParams({
    title: (opts.levelName || 'Филлворд').slice(0, 60),
    words: bounded(opts.wordsFound, 999),
    stars: bounded(opts.stars, 3),
    seconds: bounded(opts.seconds, 86400),
  }).toString();
  wa.shareToStory(media.toString(), {
    text: `Прошёл ${what} ${star}${words} — филлворд на бурятском!\nА сколько слов найдёшь ты? Прими вызов: ${link}`,
    widget_link: { url: link, name: 'Сыграть' },
  });
}

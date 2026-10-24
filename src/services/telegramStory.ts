// Публикация в Telegram Stories из Mini App (Bot API 7.8+, WebApp.shareToStory):
// открывает редактор истории с брендированной подложкой, текстом и — для премиум
// пользователей — кнопкой-ссылкой на игру. Ссылка несёт реф-код автора истории.
import { buildReferralLinks } from './referral';

const STORY_INVITE_URL = 'https://buryat-game.ru/app/story/story-invite-v2.png';
const STORY_WIN_URL = 'https://buryat-game.ru/app/story/story-win-v2.png';

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
  opts: { stars?: number; wordsFound?: number; levelName?: string },
  refCode?: string | null,
): void {
  const wa = webApp();
  if (!wa?.shareToStory) return;
  const link = gameLink(refCode);
  const star = opts.stars ? '⭐'.repeat(Math.max(1, Math.min(3, opts.stars))) : '';
  const what = opts.levelName ? `«${opts.levelName}»` : 'уровень';
  const words = opts.wordsFound ? `, ${opts.wordsFound} слов найдено` : '';
  wa.shareToStory(STORY_WIN_URL, {
    text: `Прошёл ${what} ${star}${words} — филлворд на бурятском!\nСможешь лучше? ${link}`,
    widget_link: { url: link, name: 'Сыграть' },
  });
}

// Язык подсказок игры (перевод бурятских слов): ru — базовый, en — из word.translations.
// Хранится локально; ru всегда fallback, если перевода на выбранный язык нет.

export type GameLang = 'ru' | 'en';

const STORAGE_KEY = 'burlive_game_lang';

export const GAME_LANGS: { value: GameLang; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

export function getGameLang(): GameLang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' ? 'en' : 'ru';
  } catch {
    return 'ru';
  }
}

export function setGameLang(lang: GameLang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* приватный режим */
  }
}

export interface Translatable {
  ru: string;
  translations?: Record<string, string>;
}

/** подсказка на выбранном языке с fallback на русский */
export function hintOf(word: Translatable): string {
  const lang = getGameLang();
  if (lang === 'ru') return word.ru;
  return word.translations?.[lang] || word.ru;
}

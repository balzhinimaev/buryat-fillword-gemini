// Язык подсказок игры (перевод бурятских слов): ru — базовый, en — из word.translations.
// Реактивный модуль: setGameLang уведомляет подписчиков, useGameLang() перерисовывает
// компоненты на лету (переключатель прямо в игре). ru всегда fallback.
import { useSyncExternalStore } from 'react';

export type GameLang = 'ru' | 'en';

const STORAGE_KEY = 'burlive_game_lang';

export const GAME_LANGS: { value: GameLang; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

function readStored(): GameLang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ru';
  } catch {
    return 'ru';
  }
}

let current: GameLang = readStored();
const listeners = new Set<() => void>();

export function getGameLang(): GameLang {
  return current;
}

export function setGameLang(lang: GameLang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* приватный режим */
  }
  listeners.forEach((fn) => fn());
}

export function toggleGameLang(): GameLang {
  const next: GameLang = current === 'ru' ? 'en' : 'ru';
  setGameLang(next);
  return next;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** реактивный язык подсказок — компонент перерисуется при переключении */
export function useGameLang(): GameLang {
  return useSyncExternalStore(subscribe, getGameLang);
}

export interface Translatable {
  ru: string;
  translations?: Record<string, string>;
}

/** подсказка на выбранном языке с fallback на русский */
export function hintOf(word: Translatable): string {
  if (current === 'ru') return word.ru;
  return word.translations?.[current] || word.ru;
}

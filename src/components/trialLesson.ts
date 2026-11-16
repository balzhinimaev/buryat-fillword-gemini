// Self-contained practice. No account, API, XP or ranked results.
export const TRIAL_LETTERS = [...'НАРАНҮБЭСОУҺАНДМҮЛЭАГЭРБО'];
export const TRIAL_WORDS = [
  { bur: 'НАРАН', ru: 'Солнце', path: [0, 1, 2, 3, 4] },
  { bur: 'УҺАН', ru: 'Вода', path: [10, 11, 12, 13] },
  { bur: 'ГЭР', ru: 'Дом', path: [20, 21, 22] },
];
export function extendTrialPath(path: number[], cell: number): number[] {
  if (!Number.isInteger(cell) || cell < 0 || cell >= TRIAL_LETTERS.length) return path;
  if (!path.length) return [cell];
  const last = path[path.length - 1];
  if (cell === last) return path;
  if (path.length > 1 && cell === path[path.length - 2]) return path.slice(0, -1);
  if (path.includes(cell)) return path;
  const distance = Math.abs(Math.floor(cell / 5) - Math.floor(last / 5)) + Math.abs(cell % 5 - last % 5);
  return distance === 1 ? [...path, cell] : path;
}
export function matchTrialWord(path: number[], words = TRIAL_WORDS): number {
  return words.findIndex(word => word.path.length === path.length && (
    word.path.every((cell, i) => cell === path[i]) || word.path.every((cell, i) => cell === path[path.length - 1 - i])
  ));
}

export function languageTrial(language: string) {
  if (language === 'bua-ru') return { letters: TRIAL_LETTERS, words: TRIAL_WORDS };
  const words = language === 'en-ru'
    ? [{ bur: 'SUN', ru: 'Солнце', path: [0, 1, 2] }, { bur: 'WATER', ru: 'Вода', path: [10, 11, 12, 13, 14] }, { bur: 'HOME', ru: 'Дом', path: [20, 21, 22, 23] }]
    : [{ bur: 'LES', ru: 'Лес', path: [0, 1, 2] }, { bur: 'VODA', ru: 'Вода', path: [10, 11, 12, 13] }, { bur: 'DŮM', ru: 'Дом', path: [20, 21, 22] }];
  const letters = Array.from({ length: 25 }, (_, i) => 'ASOTELM'[i % 7]);
  for (const w of words) w.path.forEach((cell, i) => { letters[cell] = w.bur[i]; });
  return { letters, words };
}

import type { Coord } from '../types';
import type { CourseLesson, CourseWord, LearningCourse } from './czech';
export interface CoursePlacement { word: CourseWord; path: Coord[] }
export interface CourseBoard { grid: string[][]; words: CoursePlacement[]; size: number }
/** Czech CH is one cell; NFC preserves accents even for decomposed input. */
export function courseLetters(text: string, language = 'cs'): string[] {
  const value = text.normalize('NFC').toLocaleUpperCase(language);
  if (!/^[\p{L}]+$/u.test(value)) throw new Error('A course word must contain letters only');
  return language === 'cs' ? value.match(/CH|./gu) || [] : [...value];
}
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function courseBoard(course: LearningCourse, lesson: CourseLesson, random = Math.random, version: 1 | 2 = 2): CourseBoard {
  const words = shuffle(lesson.words, random);
  const total = words.reduce((n, word) => n + courseLetters(word.text, course.language).length, 0);
  const size = Math.max(4, Math.ceil(Math.sqrt(total)));
  if (size > 9 || !total) throw new Error('Invalid lesson size');
  const path: Coord[] = [];
  for (let r = 0; r < size; r++) for (let i = 0; i < size; i++) path.push({ r, c: r % 2 ? size - i - 1 : i });
  if (random() > .5) path.reverse();
  const rotate = Math.floor(random() * 4);
  const mapped = path.map(cell => {
    let { r, c } = cell;
    for (let turn = 0; turn < rotate; turn++) [r, c] = [c, size - r - 1];
    return { r, c };
  });
  // Backbite moves mix a Hamiltonian path without disconnecting it or
  // losing cells. Bounded work avoids retries/hangs on small mobile devices.
  if (version === 2) for (let step = 0; step < size * size * 12; step++) {
    if (random() < .5) mapped.reverse();
    const head = mapped[0];
    const candidates = mapped.map((cell, index) => ({ cell, index })).filter(({cell,index}) => index > 1 && Math.abs(cell.r-head.r)+Math.abs(cell.c-head.c) === 1);
    if (!candidates.length) continue;
    const target = candidates[Math.floor(random()*candidates.length)].index;
    mapped.splice(0, target, ...mapped.slice(0, target).reverse());
  }
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => course.alphabet[Math.floor(random() * course.alphabet.length)]));
  let offset = 0;
  const placements = words.map(word => {
    const letters = courseLetters(word.text, course.language);
    const cells = mapped.slice(offset, offset + letters.length); offset += letters.length;
    cells.forEach(({ r, c }, index) => { grid[r][c] = letters[index]; });
    return { word, path: cells };
  });
  return { grid, words: placements, size };
}
export function extendSelection(path: Coord[], cell: Coord): Coord[] {
  if (!path.length) return [cell];
  const last = path[path.length - 1];
  if (last.r === cell.r && last.c === cell.c) return path;
  const previous = path[path.length - 2];
  if (previous?.r === cell.r && previous.c === cell.c) return path.slice(0, -1);
  if (Math.abs(last.r - cell.r) + Math.abs(last.c - cell.c) !== 1 || path.some(p => p.r === cell.r && p.c === cell.c)) return path;
  return [...path, cell];
}
export function selectedWord(board: CourseBoard, path: Coord[]): CourseWord | undefined {
  return board.words.find(word => word.path.length === path.length && word.path.every((p, i) => p.r === path[i].r && p.c === path[i].c))?.word;
}

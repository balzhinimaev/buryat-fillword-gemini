import { beforeEach, describe, expect, it, vi } from 'vitest';
import { czechCourse } from './czech';
import { courseBoard, courseLetters, extendSelection, selectedWord } from './engine';
import { completeCourseLesson, completedLessons, chosenCourse, chooseCourse, syncCourseProgress } from './progress';
import { writeProgress, readProgress } from '../services/progressStorage';
vi.mock('../services/api', () => ({ apiRequest: vi.fn() }));
import { apiRequest } from '../services/api';
const login = (id: string) => localStorage.setItem('auth_tokens', JSON.stringify({ access_token: `x.${btoa(JSON.stringify({ sub: id }))}.x` }));
beforeEach(() => { localStorage.clear(); vi.mocked(apiRequest).mockReset(); });
describe('Czech course content and orthography', () => {
  it('has 48 unique words, 8 stable lessons and Russian explanations', () => {
    expect(czechCourse.lessons).toHaveLength(8);
    const words = czechCourse.lessons.flatMap(l => l.words);
    expect(words).toHaveLength(48);
    expect(new Set(words.map(w => w.id)).size).toBe(48);
    expect(new Set(words.map(w => w.text)).size).toBe(48);
    for (const word of words) {
      expect(word.ru).toMatch(/[а-яё]/i);
      expect(courseLetters(word.text).every(letter => czechCourse.alphabet.includes(letter))).toBe(true);
    }
  });
  it('preserves diacritics, normalizes Unicode and treats CH as one cell', () => {
    expect(courseLetters('chléb')).toEqual(['CH', 'L', 'É', 'B']);
    expect(courseLetters('kůň'.normalize('NFD'))).toEqual(['K', 'Ů', 'Ň']);
    expect(courseLetters('řeka')).not.toEqual(courseLetters('reka'));
    expect(() => courseLetters('two words')).toThrow();
  });
  it('always places every word on adjacent, non-overlapping cells', () => {
    for (const lesson of czechCourse.lessons) for (let run = 0; run < 20; run++) {
      const board = courseBoard(czechCourse, lesson); const occupied = new Set<string>();
      expect(board.words.length).toBe(lesson.words.length);
      for (const placement of board.words) {
        expect(placement.path.map(p => board.grid[p.r][p.c])).toEqual(courseLetters(placement.word.text));
        expect(selectedWord(board, placement.path)?.id).toBe(placement.word.id);
        placement.path.forEach((p, i) => {
          const key = `${p.r}:${p.c}`; expect(occupied.has(key)).toBe(false); occupied.add(key);
          if (i) { const previous = placement.path[i - 1]; expect(Math.abs(p.r - previous.r) + Math.abs(p.c - previous.c)).toBe(1); }
        });
      }
      expect(board.grid.flat().every(letter => czechCourse.alphabet.includes(letter))).toBe(true);
    }
  });
  it('rejects jumps and repeated cells, supports stepping back', () => {
    const path = [{ r: 0, c: 0 }, { r: 0, c: 1 }];
    expect(extendSelection(path, { r: 2, c: 2 })).toBe(path);
    expect(extendSelection(path, path[0])).toEqual([path[0]]);
    expect(extendSelection(path, { r: 1, c: 1 })).toHaveLength(3);
  });
});
describe('isolated course progress', () => {
  it('leaves Buryat progress untouched and isolates guest and accounts', () => {
    writeProgress('offline_lm_progress', 'BURYAT');
    completeCourseLesson('food'); chooseCourse('cs-ru');
    expect(completedLessons()).toEqual(['food']); expect(chosenCourse()).toBe('cs-ru');
    expect(readProgress('offline_lm_progress')).toBe('BURYAT');
    login('alice'); expect(completedLessons()).toEqual([]); expect(chosenCourse()).toBe('bua-ru');
    completeCourseLesson('home'); login('bob'); expect(completedLessons()).toEqual([]);
    login('alice'); expect(completedLessons()).toEqual(['home']);
  });
  it('rejects unknown lessons and account changes', () => {
    expect(() => completeCourseLesson('invented')).toThrow();
    login('alice'); expect(() => completeCourseLesson('food', 'bob')).toThrow();
  });
  it('does not sync guest progress into a later login', async () => {
    completeCourseLesson('food'); expect(await syncCourseProgress()).toBe(false); expect(apiRequest).not.toHaveBeenCalled();
  });
  it('merges devices without overwriting either completion', async () => {
    login('alice'); completeCourseLesson('food');
    vi.mocked(apiRequest).mockResolvedValueOnce({ completedLessons: ['family'] }).mockResolvedValueOnce({ completedLessons: ['family', 'food'] });
    expect(await syncCourseProgress()).toBe(true);
    expect(completedLessons().sort()).toEqual(['family', 'food']);
    expect(JSON.parse(vi.mocked(apiRequest).mock.calls[1][1]!.body as string).completedLessons.sort()).toEqual(['family', 'food']);
  });
  it('retains local progress on network failures', async () => {
    login('alice'); completeCourseLesson('food'); vi.mocked(apiRequest).mockRejectedValue(new Error('offline'));
    await expect(syncCourseProgress()).rejects.toThrow(); expect(completedLessons()).toEqual(['food']);
  });
  it('never writes a late response into a different account', async () => {
    login('alice'); let resolve!: (value: unknown) => void;
    vi.mocked(apiRequest).mockReturnValueOnce(new Promise(r => { resolve = r; }));
    const pending = syncCourseProgress(); login('bob'); resolve({ completedLessons: ['food'] });
    expect(await pending).toBe(false); expect(completedLessons()).toEqual([]); expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});

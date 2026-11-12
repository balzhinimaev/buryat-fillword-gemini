import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CourseMenu from './CourseMenu';
import { courses } from './catalog';
import { buryatCourse } from './buryat';
import { czechCourse } from './czech';
import { englishCourse } from './english';
import { courseBoard, courseLetters } from './engine';
import * as engine from './engine';
import { draftBoard, readDraft, writeDraft } from './draft';
import { completeCourseLesson, completedLessons, syncCourseProgress } from './progress';
import { correctAnswer, dueWords, recordReview } from './review';
import { notifyOwnerChange, prepareOwnerChange, progressOwner, writeProgress } from '../services/progressStorage';
import { apiRequest } from '../services/api';
vi.mock('../services/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../screens/MainMenu', () => ({ default: () => <div>Старые режимы</div> }));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const login = (sub: string) => {
  prepareOwnerChange();
  const token = `x.${btoa(JSON.stringify({ sub }))}.x`;
  localStorage.setItem('auth_tokens', JSON.stringify({ access_token: token }));
  notifyOwnerChange(token);
};

it('uses the same generator for all curricula with unique IDs and language-specific letters', () => {
  expect(buryatCourse.lessons).toHaveLength(31);
  expect(courseLetters('ҮҺӨ', 'bua')).toEqual(['Ү', 'Һ', 'Ө']);
  expect(correctAnswer('УҺАН', { id: 'water', text: 'УҺАН', ru: 'вода' }, 'bua')).toBe(true);
  expect(correctAnswer('УХАН', { id: 'water', text: 'УҺАН', ru: 'вода' }, 'bua')).toBe(false);
  for (const course of courses) {
    expect(new Set(course.lessons.map(lesson => lesson.id)).size).toBe(course.lessons.length);
    for (const lesson of course.lessons) for (let seed = 0; seed < 10; seed++) {
      expect(new Set(lesson.words.map(word => word.id)).size).toBe(lesson.words.length);
      const board = draftBoard(lesson, seed, course, 2);
      const used = new Set<string>();
      for (const placement of board.words) {
        expect(placement.path.map(({ r, c }) => board.grid[r][c]).join('')).toBe(placement.word.text.toLocaleUpperCase(course.language));
        placement.path.forEach((p, i) => {
          const key = `${p.r}:${p.c}`;
          expect(used.has(key)).toBe(false); used.add(key);
          if (i) expect(Math.abs(p.r - placement.path[i-1].r) + Math.abs(p.c - placement.path[i-1].c)).toBe(1);
        });
      }
    }
  }
});

it('bridges local legacy completion without changing stars, sessions or other courses', () => {
  const legacy = JSON.stringify({ 'nature-1': { stars: 3, attempts: 2 }, 'nature-2': { stars: 0, attempts: 1 } });
  localStorage.setItem('offline_campaign_levels', legacy);
  localStorage.setItem('offline_campaign_sessions', 'unchanged');
  expect(completedLessons('guest', buryatCourse)).toEqual(['nature-1']);
  completeCourseLesson('nature-2', 'guest', buryatCourse);
  expect(completedLessons('guest', buryatCourse)).toEqual(['nature-1', 'nature-2']);
  expect(localStorage.getItem('offline_campaign_levels')).toBe(legacy);
  expect(localStorage.getItem('offline_campaign_sessions')).toBe('unchanged');
  expect(completedLessons('guest', czechCourse)).toEqual([]);
  expect(completedLessons('guest', englishCourse)).toEqual([]);
  login('second');
  expect(completedLessons(undefined, buryatCourse)).toEqual([]);
});

it('merges server legacy completion into Buryat only and never posts legacy scores', async () => {
  login('first');
  const overview = { modules: [{ levels: [{ slug: 'nature-1', earnedStars: 3 }, { slug: 'nature-2', earnedStars: 0 }] }], categories: [] };
  vi.mocked(apiRequest).mockResolvedValueOnce(overview).mockResolvedValueOnce({ completedLessons: ['home-1'] }).mockResolvedValueOnce({ completedLessons: ['nature-1', 'home-1'] });
  await syncCourseProgress(buryatCourse);
  expect(apiRequest).toHaveBeenNthCalledWith(1, '/campaign/overview');
  expect(apiRequest).toHaveBeenNthCalledWith(3, '/courses/bua-ru/progress', { method: 'PATCH', body: JSON.stringify({ completedLessons: ['nature-1', 'home-1'] }) });
  expect(completedLessons(undefined, buryatCourse)).toEqual(['nature-1', 'home-1']);
  expect(completedLessons(undefined, englishCourse)).toEqual([]);
});

it('drops legacy server results after an account change', async () => {
  login('first');
  let resolve!: (value: unknown) => void;
  vi.mocked(apiRequest).mockImplementationOnce(() => new Promise(r => { resolve = r; }) as never);
  const sync = syncCourseProgress(buryatCourse);
  login('second');
  resolve({ modules: [{ levels: [{ slug: 'nature-1', earnedStars: 3 }] }] });
  expect(await sync).toBe(false);
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(completedLessons(undefined, buryatCourse)).toEqual([]);
});

it('keeps syncing new Buryat progress when the old campaign service is unavailable', async () => {
  login('first');
  completeCourseLesson('nature-2', 'first', buryatCourse);
  vi.mocked(apiRequest).mockRejectedValueOnce(new Error('legacy temporarily unavailable'))
    .mockResolvedValueOnce({ completedLessons: [] }).mockResolvedValueOnce({ completedLessons: ['nature-2'] });
  expect(await syncCourseProgress(buryatCourse)).toBe(true);
  expect(completedLessons(undefined, buryatCourse)).toEqual(['nature-2']);
});

it('still reads legacy progress if the new local cache is corrupt', () => {
  writeProgress('learning-course:bua-ru:progress:v1', '{');
  writeProgress('offline_campaign_levels', JSON.stringify({ 'home-1': { stars: 2 } }));
  expect(completedLessons(undefined, buryatCourse)).toEqual(['home-1']);
});

it('deduplicates repeated Buryat vocabulary and isolates review and draft state', () => {
  for (const lesson of buryatCourse.lessons) completeCourseLesson(lesson.id, 'guest', buryatCourse);
  const due = dueWords(buryatCourse, 100);
  expect(due.length).toBeLessThan(buryatCourse.lessons.flatMap(l => l.words).length);
  expect(new Set(due.map(word => word.id)).size).toBe(due.length);
  recordReview(buryatCourse, due[0], true, 'guest', false, 100);
  expect(dueWords(buryatCourse, 101).some(word => word.id === due[0].id)).toBe(false);
  writeDraft(buryatCourse.lessons[0], 42, [], 'guest', buryatCourse, 2);
  expect(readDraft(buryatCourse.lessons[0], buryatCourse)?.seed).toBe(42);
  expect(dueWords(czechCourse)).toEqual([]);
  login('second');
  expect(readDraft(buryatCourse.lessons[0], buryatCourse)).toBeNull();
  expect(dueWords(buryatCourse)).toEqual([]);
});

it('finishes Buryat through the shared UI, enters recall and retains classic access', async () => {
  const generate = courseBoard;
  vi.spyOn(engine, 'courseBoard').mockImplementation((course, lesson) => generate(course, lesson, () => 0));
  render(<CourseMenu store={{} as never} />);
  fireEvent.click(screen.getByRole('button', { name: 'Начать первый урок' }));
  fireEvent.click(screen.getByRole('button', { name: 'Найти слова на поле' }));
  const board = generate(buryatCourse, buryatCourse.lessons[0], () => 0);
  for (const placement of board.words) {
    for (const { r, c } of placement.path) fireEvent.click(document.querySelector(`[data-course-cell][data-row="${r}"][data-col="${c}"]`)!, { detail: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Проверить' }));
  }
  expect(completedLessons(undefined, buryatCourse)).toEqual(['nature-1']);
  fireEvent.click(screen.getByRole('button', { name: 'Проверить запоминание' }));
  expect(screen.getByRole('heading', { name: 'Повторение слов' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Классические режимы, звёзды и учебник' }));
  expect(await screen.findByText('Старые режимы')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '← К общему курсу' }));
  expect(screen.getByText('Пройдено 1 из 31 уроков')).toBeTruthy();
  await act(async () => { await Promise.resolve(); });
});

it('unmounts another owner’s active lesson immediately on account change', async () => {
  render(<CourseMenu store={{} as never} />);
  fireEvent.click(screen.getByRole('button', { name: 'Начать первый урок' }));
  fireEvent.click(screen.getByRole('button', { name: 'Найти слова на поле' }));
  vi.mocked(apiRequest).mockRejectedValue(new Error('offline'));
  act(() => login('second'));
  expect(screen.queryByLabelText('Поле филворда: Бурятский')).toBeNull();
  expect(screen.getByText('Пройдено 0 из 31 уроков')).toBeTruthy();
  expect(progressOwner()).toBe('second');
  writeProgress('offline_campaign_levels', '{}');
  await act(async () => { await Promise.resolve(); });
});

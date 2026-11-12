import { fireEvent, render, screen, cleanup, act } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CourseMenu, { CzechCourse } from './CourseMenu';
import { completedLessons } from './progress';
import { czechCourse } from './czech';
import * as engine from './engine';
vi.mock('../services/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../screens/MainMenu', () => ({ default: () => <div>Бурятский учебник</div> }));
const generate = engine.courseBoard;
beforeEach(() => { localStorage.clear(); vi.spyOn(engine, 'courseBoard').mockImplementation((course, lesson) => generate(course, lesson, () => 0)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('switches courses and leaves Buryat as the default', async () => {
  render(<CourseMenu store={{} as never} />);
  expect(await screen.findByText('Бурятский учебник')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Чешский' }));
  expect(screen.getByText('Чешский через игру')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Бурятский' }));
  expect(await screen.findByText('Бурятский учебник')).toBeTruthy();
});
it('lets a keyboard user finish a lesson and records only Czech completion', async () => {
  render(<CzechCourse />);
  fireEvent.click(screen.getByRole('button', { name: /Еда и напитки/ }));
  expect(screen.getByText(/CH–L–É–B/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Найти слова на поле' }));
  const lesson = czechCourse.lessons.find(l => l.id === 'food')!;
  const board = generate(czechCourse, lesson, () => 0);
  for (const word of board.words) {
    for (const { r, c } of word.path) fireEvent.click(screen.getByRole('button', { name: `${board.grid[r][c]}, строка ${r + 1}, столбец ${c + 1}` }), { detail: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Проверить' }));
  }
  expect(screen.getByText('Отлично! Все слова найдены')).toBeTruthy();
  expect(completedLessons()).toEqual(['food']);
  await act(async () => { await Promise.resolve(); });
});

it('restores the same board and found words after leaving and reopening a lesson', async () => {
  const view = render(<CzechCourse />);
  fireEvent.click(screen.getByRole('button', { name: /Еда и напитки/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Найти слова на поле' }));
  const lesson = czechCourse.lessons.find(l => l.id === 'food')!;
  const board = generate(czechCourse, lesson, () => 0);
  for (const { r, c } of board.words[0].path) fireEvent.click(screen.getByRole('button', { name: `${board.grid[r][c]}, строка ${r + 1}, столбец ${c + 1}` }), { detail: 0 });
  fireEvent.click(screen.getByRole('button', { name: 'Проверить' }));
  expect(screen.getByText('Найдено 1 из 6')).toBeTruthy();
  const cells = screen.getAllByRole('button').filter(b => b.hasAttribute('data-course-cell')).map(b => b.textContent);
  view.unmount();
  render(<CzechCourse />);
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить обучение' }));
  expect(screen.getByText('Игра восстановлена. Продолжайте с того же места.')).toBeTruthy();
  expect(screen.getByText('Найдено 1 из 6')).toBeTruthy();
  expect(screen.getAllByRole('button').filter(b => b.hasAttribute('data-course-cell')).map(b => b.textContent)).toEqual(cells);
  expect(completedLessons()).toEqual([]);
  await act(async () => { await Promise.resolve(); });
});

it('opens English, completes a lesson and keeps Czech progress untouched', async () => {
  const { englishCourse } = await import('./english');
  render(<CourseMenu store={{} as never} />);
  fireEvent.click(screen.getByRole('button', { name: 'Английский' }));
  expect(screen.getByText('Английский через игру')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Дома/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Найти слова на поле' }));
  const board = generate(englishCourse, englishCourse.lessons[2], () => 0);
  for (const word of board.words) {
    for (const {r,c} of word.path) fireEvent.click(screen.getByRole('button', { name: `${board.grid[r][c]}, строка ${r+1}, столбец ${c+1}` }), {detail:0});
    fireEvent.click(screen.getByRole('button', {name:'Проверить'}));
  }
  expect(screen.getByText('Отлично! Все слова найдены')).toBeTruthy();
  expect(completedLessons(undefined,englishCourse)).toEqual(['home']);
  expect(completedLessons()).toEqual([]);
  fireEvent.click(screen.getByRole('button',{name:'Чешский'}));
  expect(screen.getByText('Чешский через игру')).toBeTruthy();
  await act(async()=>{await Promise.resolve();});
});
it('offers a first-letter hint without marking a word found and clears selection on blur', async () => {
  render(<CzechCourse />);
  fireEvent.click(screen.getByRole('button', {name:/Еда и напитки/}));
  fireEvent.click(screen.getByRole('button',{name:'Найти слова на поле'}));
  fireEvent.click(screen.getByRole('button',{name:'Показать первую букву'}));
  expect(screen.getByText(/Начните здесь:/)).toBeTruthy();
  expect(screen.getByText('Найдено 0 из 6')).toBeTruthy();
  const cell = screen.getAllByRole('button').find(b=>b.hasAttribute('data-course-cell'))!;
  fireEvent.click(cell,{detail:0});
  expect(cell.getAttribute('aria-pressed')).toBe('true');
  fireEvent.blur(window);
  expect(cell.getAttribute('aria-pressed')).toBe('false');
  expect(completedLessons()).toEqual([]);
  await act(async()=>{await Promise.resolve();});
});

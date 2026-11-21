import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookHome } from './BookHome';
import { BookChapter } from './BookChapter';
import { GrammarPractice } from './GrammarPractice';
import { englishBook as book } from '../../data/books/en-ru';
import { setRuntimeCourse } from '../../courses/activeCourse';
import type { GameStore } from '../../store/gameStore';
import type { BookQuestion } from './model';
import { readBookProgress, saveBookProgress } from './bookProgress';
const store = { navigateToBookChapter: vi.fn(), navigateToTextbookUnit: vi.fn(), replaceScreen: vi.fn(), goBack: vi.fn() } as unknown as GameStore;
beforeEach(() => { localStorage.clear(); setRuntimeCourse('en-ru'); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('compact book navigation', () => {
  it('keeps search clearable and restores focus without changing saved progress', () => {
    saveBookProgress(p => ({ ...p, chapters: { 'en-01': { read: true, bookmark: true, best: .8 } } }));
    const before = readBookProgress(); render(<BookHome store={store} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'no-result-1923' } });
    expect(screen.queryByRole('heading', { name: book.title })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Очистить поиск' }));
    expect(input).toHaveFocus(); expect(input).toHaveValue('');
    expect(screen.getByRole('heading', { name: book.title })).toBeInTheDocument();
    expect(readBookProgress()).toEqual(before);
  });
  it('opens practice for the last chapter and expands mixed sets on demand', () => {
    saveBookProgress(p => ({ ...p, last: 'en-09' })); render(<BookHome store={store} />);
    fireEvent.click(screen.getByRole('button', { name: 'Перейти к практике' }));
    expect(screen.getByRole('combobox', { name: 'Глава для тренировки' })).toHaveValue('en-09');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    expect(screen.queryByRole('heading', { name: book.title })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Смешанная проверка · главы 1–4' })).not.toBeVisible();
    fireEvent.click(screen.getByText('Смешанные проверки'));
    fireEvent.click(screen.getByRole('button', { name: 'Смешанная проверка · главы 1–4' }));
    expect(screen.getByRole('heading', { name: 'Смешанная проверка · главы 1–4' })).toBeInTheDocument();
  });
  it('closes chapter contents after jumping and never marks reading or checks complete', () => {
    render(<BookChapter store={store} chapter={book.chapters[0]} />);
    expect(screen.queryByRole('navigation', { name: 'Темы главы' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Темы главы/ }));
    const contents = screen.getByRole('navigation', { name: 'Темы главы' });
    const target = document.getElementById('en-01-s3')!; target.scrollIntoView = vi.fn();
    fireEvent.click(within(contents).getByRole('button', { name: book.chapters[0].sections[2].title }));
    expect(target).toHaveFocus(); expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(screen.getByRole('button', { name: /Темы главы/ })).toHaveAttribute('aria-expanded', 'false');
    expect(readBookProgress().chapters['en-01']?.read).not.toBe(true);
    expect(readBookProgress().chapters['en-01']?.best).toBeUndefined();
  });
});

const questions: BookQuestion[] = [1, 2, 3].map(n => ({ id: `ui-q${n}`, type: 'input', prompt: `Введите слово ${n}`, answers: ['hello'], explanation: 'Hello — приветствие.' }));
describe('question navigation without changing grading', () => {
  it('jumps freely, skips checked questions, wraps to the unanswered one and saves exactly once', () => {
    const onResult = vi.fn(); render(<GrammarPractice questions={questions} onResult={onResult} />);
    const groups = questions.map((q, n) => screen.getByRole('group', { name: `${n + 1}. ${q.prompt}` }));
    groups.forEach(node => { node.scrollIntoView = vi.fn(); });
    fireEvent.click(screen.getByRole('button', { name: 'Задание 3 — не проверено' }));
    expect(groups[2]).toHaveFocus(); expect(onResult).not.toHaveBeenCalled();
    const answer = (n: number, value: string) => {
      fireEvent.change(within(groups[n]).getByRole('textbox'), { target: { value } });
      fireEvent.click(within(groups[n]).getByRole('button', { name: 'Проверить ответ' }));
    };
    answer(1, 'hello'); answer(2, 'wrong');
    expect(screen.getByRole('button', { name: 'Задание 2 — верно' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Задание 3 — разобрать ошибку' })).toBeInTheDocument();
    fireEvent.click(within(groups[2]).getByRole('button', { name: 'Следующее задание' }));
    expect(groups[0]).toHaveFocus(); expect(onResult).not.toHaveBeenCalled();
    answer(0, 'hello'); expect(onResult).toHaveBeenCalledExactlyOnceWith(2, 3, ['ui-q3']);
    const result = document.querySelector('.book-practice-result')!;
    fireEvent.click(within(groups[0]).getByRole('button', { name: 'К результату' }));
    expect(result).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Пройти проверку заново' }));
    expect(screen.getByRole('button', { name: 'Задание 2 — не проверено' })).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledTimes(1);
  });
});

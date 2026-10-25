import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import TrialLesson from './TrialLesson';
import { extendTrialPath, matchTrialWord, TRIAL_WORDS } from './trialLesson';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const cells = () => within(screen.getByRole('group', { name: 'Буквы филлворда' })).getAllByRole('button');
const findWord = (path: number[]) => {
  path.forEach(index => fireEvent.click(cells()[index], { detail: 0 }));
  fireEvent.click(screen.getByRole('button', { name: 'Проверить слово' }));
};

describe('trial lesson', () => {
  it('finishes with keyboard-accessible cells, waits for an answer and never writes achievements', () => {
    const onContinue = vi.fn();
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    localStorage.setItem('existing-progress', 'keep');
    render(<TrialLesson guest onExit={vi.fn()} onContinue={onContinue} continueLabel="Войти" />);
    findWord(TRIAL_WORDS[0].path);
    findWord(TRIAL_WORDS[0].path);
    expect(screen.getByText('1 / 3 найдено')).toBeInTheDocument();
    findWord([...TRIAL_WORDS[1].path].reverse());
    findWord(TRIAL_WORDS[2].path);
    expect(screen.getByRole('heading', { name: 'Что значит «УҺАН»?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Войти' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Дом' }));
    expect(screen.getByRole('status')).toHaveTextContent('Уһан — вода');
    expect(onContinue).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem('existing-progress')).toBe('keep');
  });
  it('accepts a real pointer drag but drops a cancelled gesture', () => {
    render(<TrialLesson onExit={vi.fn()} onContinue={vi.fn()} />);
    const board = screen.getByRole('group', { name: 'Буквы филлворда' });
    const grid = cells();
    const hit = vi.fn();
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hit });
    const drag = () => {
      fireEvent.pointerDown(grid[0], { pointerId: 4, button: 0 });
      for (const i of [1, 2, 3, 4]) {
        hit.mockReturnValue(grid[i]);
        fireEvent.pointerMove(board, { pointerId: 4, clientX: i * 50, clientY: 10 });
      }
    };
    drag(); fireEvent.pointerCancel(board, { pointerId: 4 }); fireEvent.pointerUp(board, { pointerId: 4 });
    expect(screen.getByText('0 / 3 найдено')).toBeInTheDocument();
    drag(); fireEvent.pointerUp(board, { pointerId: 4 });
    expect(screen.getByText('1 / 3 найдено')).toBeInTheDocument();
    // Browser compatibility click after pointerup must not add a second selection.
    fireEvent.click(grid[4], { detail: 1 });
    expect(screen.getByRole('button', { name: 'Проверить слово' })).toBeDisabled();
  });
  it('supports sequential touch taps and clears selection on backgrounding', () => {
    render(<TrialLesson onExit={vi.fn()} onContinue={vi.fn()} />);
    const board = screen.getByRole('group', { name: 'Буквы филлворда' });
    for (const i of [0, 1, 2, 3, 4]) {
      fireEvent.pointerDown(cells()[i], { pointerId: 7, button: 0 });
      fireEvent.pointerUp(board, { pointerId: 7 });
      fireEvent.click(cells()[i], { detail: 1 });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Проверить слово' }));
    expect(screen.getByText('1 / 3 найдено')).toBeInTheDocument();
    fireEvent.click(cells()[10]);
    fireEvent.blur(window);
    expect(screen.getByRole('button', { name: 'Проверить слово' })).toBeDisabled();
  });
  it('rejects jumps, diagonals and row wrapping, while allowing backtracking', () => {
    expect(extendTrialPath([0], 2)).toEqual([0]);
    expect(extendTrialPath([0], 6)).toEqual([0]);
    expect(extendTrialPath([4], 5)).toEqual([4]);
    expect(extendTrialPath([0, 1, 2], 1)).toEqual([0, 1]);
    expect(matchTrialWord([0, 1, 2])).toBe(-1);
    expect(matchTrialWord([4, 3, 2, 1, 0])).toBe(0);
  });
});

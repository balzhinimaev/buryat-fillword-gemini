import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { englishBook as book } from '../../data/books/en-ru';
import { setRuntimeCourse } from '../../courses/activeCourse';
import { useGameStore } from '../../store/gameStore';
import { ThemeProvider } from '../../theme/ThemeContext';
import { notifyOwnerChange } from '../../services/progressStorage';
import { readBookProgress, saveBookProgress } from './bookProgress';
import { searchText } from './model';
import { BookUsagePanel } from './BookUsagePanel';
import EnglishBookScreen from './EnglishBookScreen';

beforeEach(() => { localStorage.clear(); setRuntimeCourse('en-ru'); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('authored situations', () => {
  it('provides a complete bilingual, actionable situation for every chapter without replacing scored exercises', () => {
    expect(book.chapters).toHaveLength(24);
    expect(book.chapters.flatMap(ch => ch.questions.concat(...(ch.practice || []).map(s => s.questions)))).toHaveLength(420);
    expect(new Set(book.chapters.map(ch => ch.usage?.title)).size).toBe(24);
    for (const ch of book.chapters) {
      const usage = ch.usage!;
      expect(usage, ch.id).toBeDefined(); expect(usage.dialogue, ch.id).toHaveLength(4);
      expect(usage.contrast, ch.id).toHaveLength(2); expect(usage.checklist, ch.id).toHaveLength(3);
      for (const [en, ru] of [...usage.dialogue, ...usage.contrast, usage.model]) {
        expect(en, ch.id).toMatch(/[a-zA-Z]/); expect(ru, ch.id).toMatch(/[а-яё]/i);
        expect(en.trim().length, ch.id).toBeGreaterThan(6); expect(ru.trim().length, ch.id).toBeGreaterThan(8);
      }
      expect(usage.task.length, ch.id).toBeGreaterThan(60);
      expect(usage.takeaway.length, ch.id).toBeGreaterThan(100);
    }
  });
  it('finds dialogue, contrasts and writing models through the same book search', () => {
    expect(searchText(book.chapters[0])).toContain('how do you pronounce');
    expect(searchText(book.chapters[17])).toContain('brakes are still being checked');
    expect(searchText(book.chapters[23])).toContain('worksheet');
    expect(searchText(book.chapters[23])).toContain('рабочей встречи');
  });
});
describe('reading first, translations and self-check', () => {
  it('reveals and hides the dialogue translation without hiding the English', () => {
    const usage = book.chapters[0].usage!;
    render(<BookUsagePanel chapterId="en-01" usage={usage} />);
    const dialogue = screen.getByRole('list', { name: 'Диалог с переводом' });
    expect(within(dialogue).getByText(usage.dialogue[0][0])).toBeVisible();
    expect(within(dialogue).getByText(usage.dialogue[0][1])).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Показать перевод диалога' }));
    expect(within(dialogue).getByText(usage.dialogue[0][1])).toBeVisible();
    expect(screen.getByRole('button', { name: 'Скрыть перевод диалога' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть перевод диалога' }));
    expect(within(dialogue).getByText(usage.dialogue[0][1])).not.toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
  });
  it('keeps the writing sample optional and labels free work as unscored', () => {
    const usage = book.chapters[23].usage!;
    render(<BookUsagePanel chapterId="en-24" usage={usage} />);
    const sample = document.querySelector('.book-usage-model')!;
    expect(sample).not.toHaveAttribute('open');
    expect(within(sample as HTMLElement).getByText(usage.model[0].replace(/\s+/g, ' '))).not.toBeVisible();
    fireEvent.click(screen.getByText('Сравнить с образцом'));
    expect(sample).toHaveAttribute('open');
    expect(within(sample as HTMLElement).getByText(usage.model[0].replace(/\s+/g, ' '))).toBeVisible();
    expect(screen.getByText(/нет автоматической оценки/)).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
function Harness() {
  const store = useGameStore();
  if (['textbook', 'bookChapter'].includes(store.state.currentScreen)) return <EnglishBookScreen store={store} />;
  return <button onClick={() => store.navigate('textbook')}>Учиться</button>;
}
const open = () => { render(<ThemeProvider themeId="light"><Harness /></ThemeProvider>); fireEvent.click(screen.getByRole('button', { name: 'Учиться' })); fireEvent.click(screen.getByRole('button', { name: 'Начать с первой главы' })); };
describe('integration and existing progress', () => {
  it('jumps to the new section and never awards reading/test completion for opening it', () => {
    saveBookProgress(p => ({ ...p, chapters: { 'en-01': { bookmark: true, best: .8, latest: .6, wrong: ['en-01-q2'], practice: { 'en-01-practice': { best: .9, latest: .7, wrong: ['en-01-practice-q1'] } } } } }));
    const before = readBookProgress().chapters['en-01'];
    open();
    const section = document.getElementById('en-01-usage')!; section.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole('button', { name: 'К диалогу ↓' }));
    expect(section.scrollIntoView).toHaveBeenCalledWith({ block: 'start' }); expect(section).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Показать перевод диалога' }));
    fireEvent.click(screen.getByText('Сравнить с образцом'));
    expect(readBookProgress().chapters['en-01']).toEqual(before);
    expect(readBookProgress().chapters['en-01'].read).not.toBe(true);
  });
  it('restores the new reading anchor while retaining an old score', async () => {
    saveBookProgress(p => ({ ...p, chapters: { 'en-01': { section: 'en-01-usage', best: .8 } } }));
    open(); const section = document.getElementById('en-01-usage')!; section.scrollIntoView = vi.fn();
    await waitFor(() => expect(section.scrollIntoView).toHaveBeenCalled());
    expect(readBookProgress().chapters['en-01']).toMatchObject({ section: 'en-01-usage', best: .8 });
  });
  it('resets reveal state when changing account instead of carrying the previous reading state', () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Показать перевод диалога' }));
    const token = `header.${btoa(JSON.stringify({ sub: 'material-new-owner' }))}.signature`;
    act(() => { localStorage.setItem('auth_tokens', JSON.stringify({ access_token: token })); setRuntimeCourse('en-ru'); notifyOwnerChange(token); });
    expect(screen.getByRole('button', { name: 'Показать перевод диалога' })).toHaveAttribute('aria-expanded', 'false');
    expect(readBookProgress('material-new-owner').chapters['en-01']).toBeUndefined();
  });
});

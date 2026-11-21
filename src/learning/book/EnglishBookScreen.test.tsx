import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { setRuntimeCourse } from '../../courses/activeCourse';
import { englishBook as book } from '../../data/books/en-ru';
import { isCorrect } from './model';
import { readBookProgress, recordBookResult, saveBookProgress } from './bookProgress';
import EnglishBookScreen from './EnglishBookScreen';
import { GrammarPractice } from './GrammarPractice';
import { notifyOwnerChange } from '../../services/progressStorage';
import { ThemeProvider } from '../../theme/ThemeContext';

function Harness() {
  const store = useGameStore();
  if (store.state.currentScreen === 'textbook' || store.state.currentScreen === 'bookChapter') return <>
    <button onClick={store.goBack}>Системная назад</button><EnglishBookScreen store={store} />
  </>;
  if (store.state.currentScreen === 'textbookLesson') return <><h1>Старый урок: {store.state.selectedTextbookUnit}</h1><button onClick={store.goBack}>Назад из слов</button></>;
  return <button onClick={() => store.navigate('textbook')}>Учиться</button>;
}
beforeEach(() => {
  localStorage.clear(); setRuntimeCourse('en-ru');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const open = () => { render(<ThemeProvider themeId="light"><Harness /></ThemeProvider>); fireEvent.click(screen.getByRole('button', { name: 'Учиться' })); };

describe('book integration', () => {
  it('searches full content and opens reference tables', () => {
    open(); expect(screen.getByRole('heading', { name: book.title })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'university' } });
    expect(screen.getByRole('button', { name: /Существительные, артикли и принадлежность/ })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Артикли: быстрый выбор' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no-such-grammar-812' } });
    expect(screen.getByText(/Ничего не найдено/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Таблицы' }));
    expect(screen.getByRole('heading', { name: 'Быстрый справочник' })).toBeInTheDocument();
  });
  it('marks reading without passing a test, bookmarks, changes type size, and resumes', async () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Начать с первой главы' }));
    expect(screen.getByRole('heading', { name: book.chapters[0].title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Добавить закладку' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отметить главу прочитанной' }));
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить текст' }));
    expect(readBookProgress().chapters['en-01']).toMatchObject({ read: true, bookmark: true });
    expect(readBookProgress().chapters['en-01'].best).toBeUndefined();
    expect(readBookProgress().font).toBe(20);
    fireEvent.click(screen.getByRole('button', { name: 'К оглавлению' }));
    expect(screen.getByText('Прочитано: 1 / 24')).toBeInTheDocument();
    expect(screen.getByText('Проверено: 0 / 24')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bookmarks' } });
    expect(screen.getAllByRole('button').filter(button => button.className === 'book-chapter-card')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить чтение' }));
    expect(screen.getByRole('button', { name: 'Убрать закладку' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(readBookProgress().last).toBe('en-01'));
  });
  it('chapter → next → hardware back returns to contents without cycling', () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Начать с первой главы' }));
    fireEvent.click(screen.getByRole('button', { name: /Далее: Предложение/ }));
    expect(screen.getByRole('heading', { name: book.chapters[1].title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Системная назад' }));
    expect(screen.getByRole('heading', { name: book.title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Системная назад' }));
    expect(screen.getByRole('button', { name: 'Учиться' })).toBeInTheDocument();
  });
  it('keeps lexical lessons accessible and returns from a linked lesson to the chapter', () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Практика слов' }));
    const lessons = screen.getAllByRole('button').filter(button => button.className === 'book-chapter-card');
    expect(lessons).toHaveLength(8); fireEvent.click(lessons[0]);
    expect(screen.getByRole('heading', { name: 'Старый урок: greetings' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Назад из слов' }));
    fireEvent.click(screen.getByRole('button', { name: 'Начать с первой главы' }));
    fireEvent.click(screen.getByRole('button', { name: 'Открыть связанный урок слов' }));
    fireEvent.click(screen.getByRole('button', { name: 'Назад из слов' }));
    expect(screen.getByRole('heading', { name: book.chapters[0].title })).toBeInTheDocument();
  });
  it('filters chapters with latest mistakes, even after a prior pass', () => {
    recordBookResult('en-03', 5, 5, []); recordBookResult('en-03', 3, 5, ['en-03-q1', 'en-03-q2']);
    open(); fireEvent.change(screen.getByRole('combobox'), { target: { value: 'review' } });
    expect(screen.getByRole('button', { name: /Существительные, артикли/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button').filter(button => button.className === 'book-chapter-card')).toHaveLength(1);
  });
  it('restores the stable reading anchor without marking the chapter read', async () => {
    saveBookProgress(p => ({ ...p, last: 'en-04', chapters: { 'en-04': { section: 'en-04-s3' } } }));
    const scroll = vi.fn(); Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
    open(); fireEvent.click(screen.getByRole('button', { name: 'Продолжить чтение' }));
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(readBookProgress().chapters['en-04'].read).not.toBe(true);
  });
  it.each(['bua-ru', 'cs-ru'] as const)('does not open the English book in %s', course => {
    setRuntimeCourse(course); open(); expect(screen.getByText('Эта книга доступна в английском курсе.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: book.title })).not.toBeInTheDocument();
  });
  it('clears an unfinished practice when the account changes', () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Начать с первой главы' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Долгий звук' }));
    expect(screen.getByRole('radio', { name: 'Долгий звук' })).toBeChecked();
    const token = `header.${btoa(JSON.stringify({ sub: 'new-book-owner' }))}.signature`;
    act(() => {
      localStorage.setItem('auth_tokens', JSON.stringify({ access_token: token }));
      setRuntimeCourse('en-ru'); notifyOwnerChange(token);
    });
    expect(screen.getByRole('radio', { name: 'Долгий звук' })).not.toBeChecked();
    expect(readBookProgress('new-book-owner').chapters['en-01']?.best).toBeUndefined();
  });
  it('has semantic tables and applies the selected theme', () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Начать с первой главы' }));
    expect(document.querySelector('.english-book')).toHaveAttribute('data-tone', 'light');
    expect(screen.getByRole('table', { name: 'Алфавит и звук' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
  });
});

describe('grammar interactions', () => {
  it('requires answers, explains errors, checks all types and submits one result per complete attempt', () => {
    const questions = book.chapters[3].questions; const onResult = vi.fn();
    render(<GrammarPractice questions={questions} onResult={onResult} />);
    expect(screen.getAllByRole('button', { name: 'Проверить ответ' }).every(button => button.hasAttribute('disabled'))).toBe(true);
    for (const [n, q] of questions.entries()) {
      const group = screen.getByRole('group', { name: `${n + 1}. ${q.prompt}` });
      if (q.type === 'choice') fireEvent.click(within(group).getByRole('radio', { name: n === 0 ? q.options.find(v => !isCorrect(q, v))! : q.answer }));
      if (q.type === 'input') fireEvent.change(within(group).getByRole('textbox'), { target: { value: 'DOES' } });
      if (q.type === 'order') for (const token of q.answer.split(' ')) fireEvent.click(within(group).getByRole('button', { name: token }));
      fireEvent.click(within(group).getByRole('button', { name: 'Проверить ответ' }));
    }
    expect(screen.getByText('Пока неверно.')).toBeInTheDocument();
    expect(screen.getByText(questions[0].explanation)).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledExactlyOnceWith(4, 5, [questions[0].id]);
    expect(screen.getByRole('heading', { name: 'Проверка пройдена' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Пройти проверку заново' }));
    expect(screen.getByText('Проверено 0 из 5. Правильно: 0.')).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledTimes(1);
  });
  it('can use repeated tokens separately and undo a token', () => {
    const q = book.chapters[20].questions[4]; if (q.type !== 'order') throw Error('Expected order question');
    render(<GrammarPractice questions={[q]} onResult={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'I' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Убрать последнее слово' }));
    expect(screen.getAllByRole('button', { name: 'I' }).every(b => !b.hasAttribute('disabled'))).toBe(true);
    for (const word of q.answer.split(' ')) fireEvent.click(screen.getAllByRole('button', { name: word }).find(b => !b.hasAttribute('disabled'))!);
    fireEvent.click(screen.getByRole('button', { name: 'Проверить ответ' }));
    expect(screen.getByText('Верно.')).toBeInTheDocument();
  });
  it('updates live progress after an external book change', () => {
    open(); act(() => recordBookResult('en-02', 5, 5, []));
    expect(screen.getByText('Проверено: 1 / 24')).toBeInTheDocument();
  });
});

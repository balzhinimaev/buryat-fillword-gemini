import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { englishBook as book } from '../../data/books/en-ru';
import { foundations } from '../../data/books/en-ru/foundations';
import { development } from '../../data/books/en-ru/development';
import { advanced } from '../../data/books/en-ru/advanced';
import { answerText, isCorrect, normaliseAnswer, type BookQuestion } from './model';
import { chapterMistakes, chapterPassed, readBookProgress, recordBookResult, recordPracticeResult, saveBookProgress } from './bookProgress';
import { notifyOwnerChange, progressKey } from '../../services/progressStorage';
import { setRuntimeCourse } from '../../courses/activeCourse';
import { useGameStore } from '../../store/gameStore';
import { ThemeProvider } from '../../theme/ThemeContext';
import EnglishBookScreen from './EnglishBookScreen';

const sets = book.chapters.flatMap(ch => ch.practice || []);
const added = sets.flatMap(set => set.questions);
const question = (id: string) => added.find(q => q.id === id)!;
beforeEach(() => { localStorage.clear(); setRuntimeCourse('en-ru'); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('expanded authored content', () => {
  it('covers all 120 topics twice without changing the original questions or theory', () => {
    expect(sets.filter(s => s.kind === 'training')).toHaveLength(24);
    expect(sets.filter(s => s.kind === 'mixed')).toHaveLength(6);
    expect(added).toHaveLength(300);
    const original = [...foundations, ...development, ...advanced];
    book.chapters.forEach((ch, n) => {
      expect(ch.questions).toEqual(original[n].questions);
      expect(ch.sections).toEqual(original[n].sections);
      ch.sections.forEach(section => expect(ch.practice![0].questions.filter(q => q.sectionIds?.includes(section.id))).toHaveLength(2));
    });
    for (const set of sets) expect(set.questions).toHaveLength(10);
    for (const set of sets.filter(s => s.kind === 'mixed')) {
      const chapters = new Set(set.questions.flatMap(q => q.sectionIds!.map(id => id.slice(0, 5))));
      expect([...chapters].sort()).toEqual([...set.chapterIds].sort());
      expect(set.questions.filter(q => new Set(q.sectionIds!.map(id => id.slice(0, 5))).size > 1).length).toBeGreaterThanOrEqual(5);
    }
  });
  it('has unique IDs, valid topic links, keyed choices and reconstructable scrambled sentences', () => {
    const all = [...book.chapters.flatMap(ch => ch.questions), ...added];
    expect(new Set(all.map(q => q.id)).size).toBe(420);
    const topicIds = new Set(book.chapters.flatMap(ch => ch.sections.map(s => s.id)));
    const positions = new Set<number>();
    for (const q of added) {
      expect(isCorrect(q, answerText(q)), q.id).toBe(true);
      expect(isCorrect(q, 'not an acceptable answer'), q.id).toBe(false);
      expect(q.explanation.length, q.id).toBeGreaterThan(30);
      for (const id of q.sectionIds!) expect(topicIds.has(id), `${q.id} → ${id}`).toBe(true);
      if (q.type === 'input') for (const answer of q.answers) expect(isCorrect(q, answer)).toBe(true);
      if (q.type === 'choice') {
        expect(new Set(q.options.map(normaliseAnswer)).size, q.id).toBe(q.options.length);
        expect(q.options.filter(a => isCorrect(q, a)), q.id).toHaveLength(1);
        positions.add(q.options.indexOf(q.answer));
      }
      if (q.type === 'order') {
        expect([...q.tokens].sort(), q.id).toEqual(q.answer.split(' ').sort());
        expect(q.tokens.join(' '), q.id).not.toBe(q.answer);
      }
    }
    expect(positions.size).toBe(3);
  });
  it.each([
    ['en-02-practice-q3', 'we'], ['en-02-practice-q5', "WE’RE AT HOME!"],
    ['en-04-practice-q6', "My brother doesn't like tea"],
    ['en-08-practice-q6', 'She bought a new bag last week'],
    ['en-14-practice-q4', 'Does she have to pay?'],
    ['en-20-practice-q2', 'The book I bought is useful'],
    ['en-21-practice-q2', 'If she had left earlier she would have caught the train.'],
    ['en-24-mixed-q4', "Everyone has finished, haven’t they?"],
  ])('accepts the intended grammatical variant for %s', (id, answer) => expect(isCorrect(question(id), answer)).toBe(true));
  it.each([
    ['en-08-practice-q6', 'She buyed a new bag last week'],
    ['en-14-practice-q4', 'Does she has to pay'],
    ['en-17-practice-q4', 'I have been knowing her for years'],
    ['en-19-practice-q7', 'She asked where did I live'],
    ['en-23-practice-q7', 'Please turn off it'],
    ['en-24-practice-q8', 'I am looking forward to hear from you'],
  ])('rejects the actual target mistake for %s', (id, answer) => expect(isCorrect(question(id), answer)).toBe(false));
});

describe('independent, backward-compatible practice results', () => {
  it('retains legacy reading/base results and independently stores training and mixed attempts', () => {
    const owner = 'expanded-owner';
    saveBookProgress(p => ({ ...p, font: 20, last: 'en-04', chapters: { 'en-04': { read: true, bookmark: true, section: 'en-04-s2', best: .8, latest: .6, wrong: ['en-04-q1'] } } }), owner);
    recordPracticeResult('en-04', 'en-04-practice', 10, 10, [], owner);
    recordPracticeResult('en-04', 'en-04-mixed', 5, 10, ['en-04-mixed-q1'], owner);
    recordPracticeResult('en-04', 'en-04-practice', 7, 10, ['en-04-practice-q3'], owner);
    recordBookResult('en-04', 5, 5, [], owner);
    const saved = readBookProgress(owner);
    expect(saved).toMatchObject({ font: 20, last: 'en-04', chapters: { 'en-04': { read: true, bookmark: true, section: 'en-04-s2', best: 1, latest: 1,
      practice: { 'en-04-practice': { best: 1, latest: .7, wrong: ['en-04-practice-q3'] }, 'en-04-mixed': { best: .5 } } } } });
    expect(chapterMistakes(saved.chapters['en-04'])).toBe(2);
    expect(readBookProgress('different-owner').chapters).toEqual({});
  });
  it('never marks reading or the base test completed by an expanded score', () => {
    recordPracticeResult('en-01', 'en-01-practice', 10, 10, [], 'only-practice');
    const chapter = readBookProgress('only-practice').chapters['en-01'];
    expect(chapter.read).not.toBe(true); expect(chapterPassed(chapter)).toBe(false); expect(chapter.best).toBeUndefined();
  });
  it('rejects invalid new score writes and sanitizes corrupt stored sets', () => {
    expect(recordPracticeResult('en-01', 'en-02-practice', 10, 10, [], 'invalid')).toBe(false);
    expect(recordPracticeResult('en-01', 'en-01-practice', NaN, 10, [], 'invalid')).toBe(false);
    expect(recordPracticeResult('en-01', 'en-01-practice', 10, 0, [], 'invalid')).toBe(false);
    localStorage.setItem(progressKey('course:en-ru:self-study-book:v1', 'invalid'), JSON.stringify({ chapters: { 'en-01': { practice: { 'en-01-practice': { best: 99, latest: .4, wrong: [4, 'en-02-q1', 'en-01-practice-q2'] }, '__proto__': null, 'en-99-mixed': { best: 1 } } } } }));
    expect(readBookProgress('invalid').chapters['en-01'].practice).toEqual({ 'en-01-practice': { best: undefined, latest: .4, wrong: ['en-01-practice-q2'] } });
  });
  it('preserves new results through storage failure then recovery, without leaking to another owner', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota'); });
    expect(recordPracticeResult('en-02', 'en-02-practice', 8, 10, [], 'expanded-quota')).toBe(false);
    expect(readBookProgress('expanded-quota').chapters['en-02'].practice?.['en-02-practice'].best).toBe(.8);
    expect(readBookProgress('expanded-other').chapters).toEqual({});
    spy.mockRestore();
    recordBookResult('en-02', 3, 5, [], 'expanded-quota');
    expect(readBookProgress('expanded-quota').chapters['en-02'].practice?.['en-02-practice'].best).toBe(.8);
  });
});
function Harness() {
  const store = useGameStore();
  if (['textbook', 'bookChapter'].includes(store.state.currentScreen)) return <EnglishBookScreen store={store} />;
  return <button onClick={() => store.navigate('textbook')}>Учиться</button>;
}
const open = () => { render(<ThemeProvider themeId="light"><Harness /></ThemeProvider>); fireEvent.click(screen.getByRole('button', { name: 'Учиться' })); };
function solve(q: BookQuestion, n: number, wrong = false) {
  const group = screen.getByRole('group', { name: `${n + 1}. ${q.prompt}` });
  if (q.type === 'choice') fireEvent.click(within(group).getByRole('radio', { name: wrong ? q.options.find(v => v !== q.answer)! : q.answer }));
  if (q.type === 'input') fireEvent.change(within(group).getByRole('textbox'), { target: { value: wrong ? 'wrong' : q.answers[0] } });
  if (q.type === 'order') for (const word of q.answer.split(' ')) fireEvent.click(within(group).getAllByRole('button', { name: word }).find(b => !b.hasAttribute('disabled'))!);
  fireEvent.click(within(group).getByRole('button', { name: 'Проверить ответ' }));
}
describe('practice entry, attempts and review navigation', () => {
  it('keeps an unfinished base attempt when changing sets and hides inactive controls', () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Начать с первой главы' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Долгий звук' }));
    fireEvent.click(screen.getByRole('button', { name: /Расширенная практика/ }));
    expect(within(screen.getByRole('region', { name: 'Практика главы' })).getAllByRole('group')).toHaveLength(10);
    expect(screen.queryByRole('radio', { name: 'Долгий звук' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Базовая проверка/ }));
    expect(screen.getByRole('radio', { name: 'Долгий звук' })).toBeChecked();
    const ids = Array.from(document.querySelectorAll('[id]'), el => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('completes expanded practice, shows feedback and filters its errors without passing the base test', () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Практика' }));
    const set = book.chapters[0].practice![0];
    set.questions.forEach((q, n) => solve(q, n, n === 0));
    expect(screen.getByText(set.questions[0].explanation)).toBeInTheDocument();
    expect(readBookProgress().chapters['en-01'].practice?.[set.id]).toMatchObject({ best: .9, latest: .9, wrong: [set.questions[0].id] });
    fireEvent.click(screen.getByRole('button', { name: 'Главы' }));
    expect(screen.getByText('Проверено: 0 / 24')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Показать' }), { target: { value: 'review' } });
    expect(screen.getAllByRole('button').filter(b => b.className === 'book-chapter-card')).toHaveLength(1);
    expect(screen.getByText('Повторить ошибки: 1')).toBeInTheDocument();
  }, 15000);
  it('opens mixed checks directly and returns to the linked rule of another chapter', async () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Практика' }));
    fireEvent.click(screen.getByText('Смешанные проверки'));
    fireEvent.click(screen.getByRole('button', { name: 'Смешанная проверка · главы 1–4' }));
    const q = book.chapters[3].practice![1].questions[0]; solve(q, 0);
    fireEvent.click(screen.getByRole('button', { name: 'Глава 2, тема 3' }));
    expect(screen.getByRole('heading', { name: book.chapters[1].title })).toBeInTheDocument();
    await waitFor(() => expect(readBookProgress().chapters['en-02'].section).toBe('en-02-s3'));
  });
  it('resets unfinished expanded attempts on account change', () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Практика' }));
    solve(book.chapters[0].practice![0].questions[0], 0);
    const token = `header.${btoa(JSON.stringify({ sub: 'practice-next-owner' }))}.signature`;
    act(() => { localStorage.setItem('auth_tokens', JSON.stringify({ access_token: token })); setRuntimeCourse('en-ru'); notifyOwnerChange(token); });
    expect(screen.queryByText('Верно.')).not.toBeInTheDocument();
    expect(readBookProgress('practice-next-owner').chapters['en-01']?.practice).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Главы' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Практика' }));
    expect(screen.getByText('Проверено 0 из 10. Правильно: 0.')).toBeInTheDocument();
  });
});

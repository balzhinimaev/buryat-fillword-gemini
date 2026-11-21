import { describe, expect, it, beforeEach, vi } from 'vitest';
import { englishBook as book } from '../../data/books/en-ru';
import { englishCourse } from '../../courses/english';
import { answerText, isCorrect, searchText } from './model';
import { chapterPassed, readBookProgress, recordBookResult, saveBookProgress } from './bookProgress';
import { progressKey } from '../../services/progressStorage';
import { setRuntimeCourse } from '../../courses/activeCourse';

beforeEach(() => localStorage.clear());
describe('authored English book', () => {
  it('has complete, uniquely addressable chapters, sections and reference tables', () => {
    expect(book.chapters).toHaveLength(24);
    expect(book.chapters.flatMap(ch => ch.sections)).toHaveLength(120);
    expect(book.chapters.flatMap(ch => ch.questions)).toHaveLength(120);
    expect(book.references).toHaveLength(15);
    const ids = book.chapters.flatMap(ch => [ch.id, ...ch.sections.map(s => s.id), ...ch.questions.map(q => q.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ch of book.chapters) {
      expect(ch.sections).toHaveLength(5); expect(ch.questions).toHaveLength(5);
      expect(ch.mistakes.length).toBeGreaterThanOrEqual(2);
      expect(ch.task.length).toBeGreaterThan(30);
      if (ch.vocabulary) expect(englishCourse.lessons.some(l => l.id === ch.vocabulary)).toBe(true);
      for (const s of ch.sections) {
        expect(s.body.length).toBeGreaterThan(120); expect(s.examples.length).toBeGreaterThanOrEqual(2);
        if (s.table) for (const row of s.table.rows) expect(row).toHaveLength(s.table.headers.length);
      }
    }
    for (const ref of book.references) {
      expect(ref.rows.length).toBeGreaterThan(3);
      for (const row of ref.rows) expect(row).toHaveLength(ref.headers.length);
    }
  });
  it('has unambiguous keyed choices and buildable token answers, with varied correct positions', () => {
    const positions = new Set<number>();
    for (const q of book.chapters.flatMap(ch => ch.questions)) {
      expect(isCorrect(q, answerText(q))).toBe(true);
      expect(isCorrect(q, 'an intentionally wrong answer')).toBe(false);
      expect(q.explanation.length, q.id).toBeGreaterThanOrEqual(20);
      if (q.type === 'choice') {
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.options.filter(option => isCorrect(q, option))).toHaveLength(1);
        positions.add(q.options.indexOf(q.answer));
      }
      if (q.type === 'order') expect([...q.tokens].sort()).toEqual(q.answer.split(' ').sort());
    }
    expect(positions.size).toBe(3);
  });
  it('accepts case, whitespace and curly apostrophes but not wrong grammatical forms', () => {
    const q = book.chapters[3].questions[3];
    expect(isCorrect(q, '  DOES! ')).toBe(true);
    expect(isCorrect(q, 'do')).toBe(false);
    const order = book.chapters[4].questions[4];
    expect(isCorrect(order, 'Is  there a park?')).toBe(true);
  });
  it('indexes translated explanations and table examples, not just headings', () => {
    expect(searchText(book.chapters[3])).toContain('does');
    expect(searchText(book.chapters[2])).toContain('university');
    expect(searchText(book.chapters[20])).toContain('сожаление');
  });
});
describe('book progress separate from lexical progress', () => {
  const key = 'course:en-ru:self-study-book:v1';
  it('keeps reading, testing and bookmarks separate, retaining the best score', () => {
    const owner = 'book-student';
    saveBookProgress(p => ({ ...p, chapters: { 'en-01': { read: true, bookmark: true } } }), owner);
    expect(chapterPassed(readBookProgress(owner).chapters['en-01'])).toBe(false);
    recordBookResult('en-01', 4, 5, ['en-01-q2'], owner);
    expect(chapterPassed(readBookProgress(owner).chapters['en-01'])).toBe(true);
    recordBookResult('en-01', 2, 5, ['en-01-q1', 'en-01-q2', 'en-01-q3'], owner);
    expect(readBookProgress(owner).chapters['en-01']).toMatchObject({ read: true, bookmark: true, best: .8, latest: .4 });
    expect(readBookProgress('another-student').chapters).toEqual({});
  });
  it('does not read or overwrite old textbook data or another course', () => {
    localStorage.setItem('burlive_textbook_progress', 'original-buryat-data');
    localStorage.setItem(progressKey('course:cs-ru:self-study-book:v1', 'course-test'), 'czech-data');
    setRuntimeCourse('cs-ru');
    saveBookProgress(p => ({ ...p, last: 'en-04' }), 'course-test');
    expect(localStorage.getItem('burlive_textbook_progress')).toBe('original-buryat-data');
    expect(localStorage.getItem(progressKey('course:cs-ru:self-study-book:v1', 'course-test'))).toBe('czech-data');
    expect(JSON.parse(localStorage.getItem(progressKey(key, 'course-test'))!).last).toBe('en-04');
  });
  it('does not resurrect deliberately cleared browser progress from memory', () => {
    saveBookProgress(p => ({ ...p, last: 'en-08' }), 'clear-test');
    localStorage.clear();
    expect(readBookProgress('clear-test')).toEqual({ chapters: {}, font: 18 });
  });
  it('handles corrupt JSON and rejects invalid stored fields', () => {
    localStorage.setItem(progressKey(key, 'corrupt'), '{');
    expect(readBookProgress('corrupt')).toEqual({ chapters: {}, font: 18 });
    localStorage.setItem(progressKey(key, 'corrupt'), JSON.stringify({ font: 900, chapters: { 'en-01': { best: 9, section: '"]', wrong: [3, 'en-01-q1'] }, unknown: {} } }));
    expect(readBookProgress('corrupt')).toMatchObject({ font: 18, chapters: { 'en-01': { best: undefined, section: undefined, wrong: ['en-01-q1'] } } });
    expect(Object.keys(readBookProgress('corrupt').chapters)).toEqual(['en-01']);
  });
  it('keeps session progress when storage fails and retries later without losing updates', () => {
    const owner = 'quota-test';
    saveBookProgress(p => ({ ...p, last: 'en-01' }), owner);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    expect(saveBookProgress(p => ({ ...p, last: 'en-02' }), owner)).toBe(false);
    expect(readBookProgress(owner).last).toBe('en-02');
    spy.mockRestore();
    expect(saveBookProgress(p => ({ ...p, font: 20 }), owner)).toBe(true);
    expect(readBookProgress(owner)).toMatchObject({ last: 'en-02', font: 20 });
  });
});

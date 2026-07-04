import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildQuiz,
  courseProgress,
  getQuizBest,
  getTextbook,
  getUnitStatuses,
  isTheoryRead,
  markTheoryRead,
  saveQuizResult,
} from './textbook';

describe('textbook', () => {
  beforeEach(() => localStorage.clear());

  it('контент: 12 юнитов, у каждого есть лексика и цель', () => {
    const book = getTextbook();
    expect(book.units.length).toBe(12);
    for (const u of book.units) {
      expect(u.slug).toBeTruthy();
      expect(u.goal).toBeTruthy();
      expect(u.vocab.length).toBeGreaterThan(0);
    }
  });

  it('practiceSlugs юнитов ссылаются на известные уроки кампаний', () => {
    const re = /^(chapter2-square-\d+x\d+|nature-\d+|home-\d+|colors-\d+|time-\d+|verbs-\d+|food-\d+)$/;
    for (const u of getTextbook().units) {
      for (const s of u.practiceSlugs) expect(s).toMatch(re);
    }
  });

  it('теория: отметка читается и снимается', () => {
    expect(isTheoryRead('family')).toBe(false);
    markTheoryRead('family');
    expect(isTheoryRead('family')).toBe(true);
    markTheoryRead('family', false);
    expect(isTheoryRead('family')).toBe(false);
  });

  it('юнит пройден = теория + ≥1★ практики + квиз', () => {
    const unit = getTextbook().units.find((u) => u.practiceSlugs.length > 0)!;
    const find = (m: Record<string, number>) =>
      getUnitStatuses(m).find((s) => s.unit.slug === unit.slug)!;
    expect(find({}).completed).toBe(false);

    markTheoryRead(unit.slug);
    expect(find({ [unit.practiceSlugs[0]]: 2 }).completed).toBe(false); // квиза нет

    saveQuizResult(unit.slug, 8, 8);
    const st = find({ [unit.practiceSlugs[0]]: 2 });
    expect(st.practiceStars).toBe(2);
    expect(st.quizPassed).toBe(true);
    expect(st.completed).toBe(true);
  });

  it('юнит без практики: теория + квиз', () => {
    const theoryOnly = getTextbook().units.find((u) => u.practiceSlugs.length === 0);
    expect(theoryOnly).toBeTruthy();
    markTheoryRead(theoryOnly!.slug);
    saveQuizResult(theoryOnly!.slug, 6, 8);
    const st = getUnitStatuses({}).find((s) => s.unit.slug === theoryOnly!.slug)!;
    expect(st.completed).toBe(true); // 6/8 = 75%
  });

  it('квиз: провал не засчитывается, лучший результат не ухудшается', () => {
    saveQuizResult('family', 3, 8);
    let st = getUnitStatuses({}).find((s) => s.unit.slug === 'family')!;
    expect(st.quizPassed).toBe(false);
    expect(getQuizBest('family')).toEqual({ correct: 3, total: 8 });

    saveQuizResult('family', 7, 8);
    st = getUnitStatuses({}).find((s) => s.unit.slug === 'family')!;
    expect(st.quizPassed).toBe(true);

    saveQuizResult('family', 2, 8); // хуже — best остаётся
    expect(getQuizBest('family')).toEqual({ correct: 7, total: 8 });
    expect(getUnitStatuses({}).find((s) => s.unit.slug === 'family')!.quizPassed).toBe(true);
  });

  it('buildQuiz: 4 уникальных варианта, правильный на месте, направления чередуются', () => {
    const unit = getTextbook().units.find((u) => u.vocab.length >= 8)!;
    const quiz = buildQuiz(unit);
    expect(quiz.length).toBe(8);
    for (const q of quiz) {
      expect(q.options.length).toBe(4);
      expect(new Set(q.options.map((o) => o.bur)).size).toBe(4);
      expect(new Set(q.options.map((o) => o.ru)).size).toBe(4);
      expect(q.options[q.correctIndex].bur).toBe(q.word.bur);
    }
    expect(quiz[0].type).toBe('bur2tr');
    expect(quiz[1].type).toBe('tr2bur');
  });

  it('прогресс курса считается', () => {
    const statuses = getUnitStatuses({});
    expect(courseProgress(statuses)).toEqual({ done: 0, total: 12 });
  });
});

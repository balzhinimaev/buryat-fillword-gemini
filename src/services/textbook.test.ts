import { describe, it, expect, beforeEach } from 'vitest';
import {
  courseProgress,
  getTextbook,
  getUnitStatuses,
  isTheoryRead,
  markTheoryRead,
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

  it('юнит пройден = теория + ≥1★ хотя бы в одном уроке практики', () => {
    const unit = getTextbook().units.find((u) => u.practiceSlugs.length > 0)!;
    let statuses = getUnitStatuses({});
    let st = statuses.find((s) => s.unit.slug === unit.slug)!;
    expect(st.completed).toBe(false);

    markTheoryRead(unit.slug);
    statuses = getUnitStatuses({});
    st = statuses.find((s) => s.unit.slug === unit.slug)!;
    expect(st.theoryRead).toBe(true);
    expect(st.completed).toBe(false); // практика не сыграна

    statuses = getUnitStatuses({ [unit.practiceSlugs[0]]: 2 });
    st = statuses.find((s) => s.unit.slug === unit.slug)!;
    expect(st.practiceStars).toBe(2);
    expect(st.completed).toBe(true);
  });

  it('юнит без практики завершается одной теорией', () => {
    const theoryOnly = getTextbook().units.find((u) => u.practiceSlugs.length === 0);
    expect(theoryOnly).toBeTruthy();
    markTheoryRead(theoryOnly!.slug);
    const st = getUnitStatuses({}).find((s) => s.unit.slug === theoryOnly!.slug)!;
    expect(st.completed).toBe(true);
  });

  it('прогресс курса считается', () => {
    const statuses = getUnitStatuses({});
    expect(courseProgress(statuses)).toEqual({ done: 0, total: 12 });
  });
});

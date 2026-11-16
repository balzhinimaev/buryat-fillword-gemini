import { describe, expect, it } from 'vitest';
import type { UnitStatus } from '../services/textbook';
import { nextLearningUnit, nextLearningStep } from './learningNavigation';
const unit = (slug: string, overrides: Partial<UnitStatus> = {}): UnitStatus => ({
  unit: { slug, title: slug, practiceSlugs: [slug], goal: '', vocab: [], intro: '', phrases: [], grammar: null, tip: '' },
  completed: false, theoryRead: false, practiceDone: false, practiceStars: 0, quizPassed: false, quizBest: null, ...overrides,
});
describe('learning continuation', () => {
  it('resumes an attempted quiz ahead of a completely new earlier lesson', () => {
    const attempted = unit('started', { quizBest: { correct: 1, total: 4 } });
    expect(nextLearningUnit([unit('new'), attempted])).toBe(attempted);
  });
  it('does not mistake a lesson without a practice section for a started one', () => {
    const first = unit('first');
    const theoryOnly = unit('theory', { practiceDone: true }); theoryOnly.unit.practiceSlugs = [];
    expect(nextLearningUnit([first, theoryOnly])).toBe(first);
  });
  it('recognizes migrated completed practice without inventing stars', () => {
    const imported = unit('imported', { practiceDone: true });
    expect(nextLearningUnit([unit('new'), imported])).toBe(imported);
    expect(imported.practiceStars).toBe(0);
  });
  it('suggests only missing steps and stops when everything is completed', () => {
    expect(nextLearningStep(unit('lesson'))).toMatch(/материал/);
    expect(nextLearningStep(unit('lesson', { theoryRead: true }))).toMatch(/филворде/);
    expect(nextLearningStep(unit('lesson', { theoryRead: true, practiceDone: true }))).toMatch(/квизе/);
    expect(nextLearningUnit([unit('done', { completed: true })])).toBeUndefined();
  });
});

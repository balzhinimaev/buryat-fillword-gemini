import { beforeEach, expect, it } from 'vitest';
import { czechCourse } from './czech';
import { readDraft, writeDraft, clearDraft, draftBoard } from './draft';
import { writeProgress } from '../services/progressStorage';
const lesson = czechCourse.lessons[0];
beforeEach(() => localStorage.clear());
it('recreates exactly the same board from its seed', () => {
  expect(draftBoard(lesson, 123)).toEqual(draftBoard(lesson, 123));
  expect(draftBoard(lesson, 123)).not.toEqual(draftBoard(lesson, 456));
});
it('persists found words and clears only the chosen lesson', () => {
  writeDraft(lesson, 123, [lesson.words[0].id], 'guest');
  writeDraft(czechCourse.lessons[1], 456, [], 'guest');
  expect(readDraft(lesson)?.found).toEqual([lesson.words[0].id]);
  clearDraft(lesson, 'guest');
  expect(readDraft(lesson)).toBeNull();
  expect(readDraft(czechCourse.lessons[1])).not.toBeNull();
});
it('rejects malformed or outdated content', () => {
  writeProgress(`learning-course:cs-ru:draft:${lesson.id}`, '{broken');
  expect(readDraft(lesson)).toBeNull();
  writeDraft(lesson, 12, ['unknown'], 'guest');
  expect(readDraft(lesson)).toBeNull();
  writeDraft(lesson, 12, [], 'guest');
  expect(readDraft({ ...lesson, words: [] })).toBeNull();
});
it('isolates accounts and blocks a late write by a different owner', () => {
  writeDraft(lesson, 123, [], 'guest');
  localStorage.setItem('auth_tokens', JSON.stringify({ access_token: `x.${btoa(JSON.stringify({sub:'another-user'}))}.x` }));
  expect(readDraft(lesson)).toBeNull();
  expect(() => writeDraft(lesson, 123, [], 'guest')).toThrow('Account changed');
  expect(() => clearDraft(lesson, 'guest')).toThrow('Account changed');
});
it('retains old draft generator and records the new generator version', () => {
  const raw = {seed:123,found:[],content:JSON.stringify(lesson.words)};
  writeProgress(`learning-course:cs-ru:draft:${lesson.id}`, JSON.stringify(raw));
  expect(readDraft(lesson)?.version).toBe(1);
  writeDraft(lesson,123,[], 'guest',undefined,2);
  expect(readDraft(lesson)?.version).toBe(2);
  expect(draftBoard(lesson,123,undefined,2)).not.toEqual(draftBoard(lesson,123,undefined,1));
});

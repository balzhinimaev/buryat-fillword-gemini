import { progressOwner, readProgress, writeProgress } from '../services/progressStorage';
import { czechCourse, type CourseLesson } from './czech';
import { courseBoard } from './engine';
const key = (id: string, course = czechCourse) => `learning-course:${course.id}:draft:${id}`;
export interface LessonDraft { seed: number; version: 1 | 2; found: string[]; content: string }
const signature = (lesson: CourseLesson) => JSON.stringify(lesson.words);
export function draftBoard(lesson: CourseLesson, seed: number, course = czechCourse, version: 1 | 2 = 1) {
  let state = seed >>> 0;
  return courseBoard(course, lesson, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  }, version);
}
export function readDraft(lesson: CourseLesson, course = czechCourse): LessonDraft | null {
  try {
    const draft = JSON.parse(readProgress(key(lesson.id, course)) || 'null');
    if (!draft || !Number.isInteger(draft.seed) || draft.seed < 0 || draft.seed > 4294967295 || draft.content !== signature(lesson) || !Array.isArray(draft.found)) return null;
    if (draft.version !== undefined && draft.version !== 1 && draft.version !== 2) return null;
    if (!draft.found.every((id: unknown) => typeof id === 'string' && lesson.words.some(w => w.id === id))) return null;
    return { seed: draft.seed, version: draft.version ?? 1, content: draft.content, found: [...new Set<string>(draft.found)] };
  } catch { return null; }
}
export function writeDraft(lesson: CourseLesson, seed: number, found: string[], owner: string, course = czechCourse, version: 1 | 2 = 1) {
  if (progressOwner() !== owner) throw new Error('Account changed');
  writeProgress(key(lesson.id, course), JSON.stringify({ seed, version, found, content: signature(lesson) }), owner);
}
export function clearDraft(lesson: CourseLesson, owner: string, course = czechCourse) {
  if (progressOwner() !== owner) throw new Error('Account changed');
  writeProgress(key(lesson.id, course), 'null', owner);
}

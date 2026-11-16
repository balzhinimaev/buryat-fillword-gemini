import { progressKey, progressOwner } from '../services/progressStorage';
import { isCourseId, type CourseId } from './model';
import { COURSE_CATALOG, starterCourse } from './catalog';

// Content selection only. The original screens and services remain the engine.
let snapshot: { owner: string; id: CourseId } | undefined;
export function setRuntimeCourse(id: CourseId): void { snapshot = { owner: progressOwner(), id }; }
export function activeCourseId(): CourseId {
  const owner = progressOwner();
  if (snapshot?.owner === owner) return snapshot.id;
  let selected: string | null = null;
  try { selected = localStorage.getItem(progressKey('learning-course:selected', owner)); } catch { /* unavailable */ }
  const id = isCourseId(selected) ? selected : 'bua-ru';
  snapshot = { owner, id };
  return id;
}
export const isAdditionalCourse = () => activeCourseId() !== 'bua-ru';
export const additionalCourse = () => starterCourse(activeCourseId());
export const courseTitle = () => COURSE_CATALOG[activeCourseId()].title;
export const courseTextbookTitle = () => COURSE_CATALOG[activeCourseId()].textbookTitle;
export const courseLetters = (text: string) => COURSE_CATALOG[activeCourseId()].tokenize(text);
export function courseGridRules() {
  const course = additionalCourse();
  return course ? { letters: courseLetters, alphabet: course.alphabet } : undefined;
}
export function courseWords() {
  return additionalCourse()?.lessons.flatMap(l => l.words.map(w => ({
    id: w.id, bur: w.text.normalize('NFC').toUpperCase(), ru: w.ru, difficulty: 2, translations: undefined as Record<string, string> | undefined,
  }))) ?? [];
}

// A full remount also cancels old puzzle timers and pending UI work.
export function restartCourseApp(): void { window.location.reload(); }

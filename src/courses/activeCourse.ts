import { progressKey, progressOwner } from '../services/progressStorage';
import { czechCourse, type CourseId } from './czech';
import { englishCourse } from './english';

// Content selection only. The original screens and services remain the engine.
let snapshot: { owner: string; id: CourseId } | undefined;
export function setRuntimeCourse(id: CourseId): void { snapshot = { owner: progressOwner(), id }; }
export function activeCourseId(): CourseId {
  const owner = progressOwner();
  if (snapshot?.owner === owner) return snapshot.id;
  let selected: string | null = null;
  try { selected = localStorage.getItem(progressKey('learning-course:selected', owner)); } catch { /* unavailable */ }
  const id = selected === 'cs-ru' || selected === 'en-ru' ? selected : 'bua-ru';
  snapshot = { owner, id };
  return id;
}
export const isAdditionalCourse = () => activeCourseId() !== 'bua-ru';
export function additionalCourse() {
  const id = activeCourseId();
  return id === 'en-ru' ? englishCourse : id === 'cs-ru' ? czechCourse : null;
}
export const courseTitle = () => additionalCourse()?.title ?? 'Бурятский';
export const courseTextbookTitle = () => activeCourseId() === 'bua-ru' ? 'Учебник бурятского' : activeCourseId() === 'en-ru' ? 'Учебник английского' : 'Учебник чешского';
export function courseLetters(text: string): string[] {
  const normalized = text.normalize('NFC').toUpperCase().replace(/[^\p{L}]/gu, '');
  return activeCourseId() === 'cs-ru' ? normalized.match(/CH|./gu) ?? [] : Array.from(normalized);
}
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

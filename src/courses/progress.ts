import { progressOwner, readProgress, writeProgress } from '../services/progressStorage';
import { apiRequest } from '../services/api';
import { czechCourse, type LearningCourse, type CourseId } from './czech';
const key = (course: LearningCourse) => `learning-course:${course.id}:progress:v1`;
export const COURSE_PROGRESS_EVENT = 'course:progress';
export function completedLessons(owner = progressOwner(), course = czechCourse): string[] {
  try {
    const parsed: unknown = JSON.parse(readProgress(key(course), owner) || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && course.lessons.some(l => l.id === id)))] : [];
  } catch { return []; }
}
function store(ids: string[], owner: string, course: LearningCourse) {
  const merged = [...new Set([...completedLessons(owner, course), ...ids])].filter(id => course.lessons.some(l => l.id === id));
  writeProgress(key(course), JSON.stringify(merged), owner);
  window.dispatchEvent(new Event(COURSE_PROGRESS_EVENT));
}
export function completeCourseLesson(id: string, owner = progressOwner(), course = czechCourse): void {
  if (!course.lessons.some(l => l.id === id)) throw new Error('Unknown lesson');
  if (owner !== progressOwner()) throw new Error('Account changed');
  store([id], owner, course);
}
let running: { owner: string; courseId: string; promise: Promise<boolean> } | undefined;
export function syncCourseProgress(course = czechCourse): Promise<boolean> {
  const owner = progressOwner();
  if (owner === 'guest' || (typeof navigator !== 'undefined' && !navigator.onLine)) return Promise.resolve(false);
  if (running?.owner === owner && running.courseId === course.id) return running.promise;
  const promise = (async () => {
    const remote = await apiRequest<{ completedLessons: string[] }>(`/courses/${course.id}/progress`);
    if (progressOwner() !== owner) return false;
    if (!Array.isArray(remote.completedLessons)) throw new Error('Invalid progress');
    store(remote.completedLessons, owner, course);
    const sent = completedLessons(owner, course);
    const result = await apiRequest<{ completedLessons: string[] }>(`/courses/${course.id}/progress`, { method: 'PATCH', body: JSON.stringify({ completedLessons: sent }) });
    if (progressOwner() !== owner) return false;
    if (!Array.isArray(result.completedLessons)) throw new Error('Invalid progress');
    store(result.completedLessons, owner, course);
    return true;
  })().finally(() => { if (running?.promise === promise) running = undefined; });
  running = { owner, courseId: course.id, promise }; return promise;
}
export function chosenCourse(): CourseId {
  try { const id = readProgress('learning-course:selected'); return id === 'cs-ru' || id === 'en-ru' ? id : 'bua-ru'; } catch { return 'bua-ru'; }
}
export function chooseCourse(course: CourseId): void {
  writeProgress('learning-course:selected', course);
}

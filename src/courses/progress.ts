import { progressOwner, readProgress, writeProgress } from '../services/progressStorage';
import { apiRequest } from '../services/api';
import { czechCourse, type LearningCourse, type CourseId } from './czech';
import { COURSE_IDS } from './model';
import { localLegacyCompletions, remoteLegacyCompletions } from './legacyProgress';
import type { CampaignOverviewResponse } from '../services/api';
const key = (course: LearningCourse) => `learning-course:${course.id}:progress:v1`;
export const COURSE_PROGRESS_EVENT = 'course:progress';
export function completedLessons(owner = progressOwner(), course = czechCourse): string[] {
  let ids: unknown[] = [];
  try {
    const parsed: unknown = JSON.parse(readProgress(key(course), owner) || '[]');
    ids = Array.isArray(parsed) ? parsed : [];
  } catch { /* A broken new cache must not hide intact legacy completions. */ }
  if (course.id === 'bua-ru') ids.push(...localLegacyCompletions(owner));
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && course.lessons.some(l => l.id === id)))];
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
const running = new Map<string, Promise<boolean>>();
export function syncCourseProgress(course = czechCourse): Promise<boolean> {
  const owner = progressOwner();
  if (owner === 'guest' || (typeof navigator !== 'undefined' && !navigator.onLine)) return Promise.resolve(false);
  const scope = `${owner}:${course.id}`;
  const existing = running.get(scope);
  if (existing) return existing;
  const promise = (async () => {
    if (course.id === 'bua-ru') {
      // Read the server explicitly even in Android offline mode; additive import only.
      const overview = await apiRequest<CampaignOverviewResponse>('/campaign/overview').catch(() => null);
      if (progressOwner() !== owner) return false;
      // Legacy service may be temporarily unavailable. Retry on the next sync,
      // but do not block new-course progress on that optional bridge.
      if (overview) store(remoteLegacyCompletions(overview), owner, course);
    }
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
  })().finally(() => { if (running.get(scope) === promise) running.delete(scope); });
  running.set(scope, promise); return promise;
}
export function chosenCourse(): CourseId {
  try { const id = readProgress('learning-course:selected'); return COURSE_IDS.find(course => course === id) || 'bua-ru'; } catch { return 'bua-ru'; }
}
export function chooseCourse(course: CourseId): void {
  writeProgress('learning-course:selected', course);
}

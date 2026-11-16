import { apiRequest } from '../services/api';
import { progressKey, progressOwner, readProgress, writeProgress } from '../services/progressStorage';
import { COURSE_IDS, isCourseId, type CourseId, type InterfaceLocale, type InstructionLocale } from './model';
export const GOALS = { everyday: 'Общаться в повседневной жизни', travel: 'Подготовиться к поездке', culture: 'Знакомиться с языком и культурой' } as const;
export interface CoursePlan { courseId: CourseId; status: 'active' | 'paused'; goal: keyof typeof GOALS; minutes: 5 | 10 | 15; revision: number }
interface LocalPlan extends CoursePlan { dirty: boolean; explicit: boolean; version: number; conflict?: CoursePlan }
export interface LearningProfile { version: 1; interfaceLocale: InterfaceLocale; instructionLocale: InstructionLocale; courses: Partial<Record<CourseId, LocalPlan>> }
const KEY = 'learning-profile:v1';
export const PROFILE_EVENT = 'learning:profile';
const valid = (p: unknown): p is CoursePlan => {
  const v = p as CoursePlan | undefined;
  return !!v && isCourseId(v.courseId) && ['active', 'paused'].includes(v.status) && Object.hasOwn(GOALS, v.goal) && [5, 10, 15].includes(v.minutes) && Number.isSafeInteger(v.revision) && v.revision >= 0;
};
const seed = (id: CourseId): LocalPlan => ({ courseId: id, status: 'active', goal: 'everyday', minutes: 5, revision: 0, dirty: true, explicit: false, version: 0 });
function legacyCourses(owner: string): CourseId[] {
  const ids = new Set<CourseId>(['bua-ru']);
  const selected = readProgress('learning-course:selected', owner); if (isCourseId(selected)) ids.add(selected);
  // Scope key matching to this owner; reading another account's course must not enroll it.
  const suffix = progressKey('', owner);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (!key.endsWith(suffix)) {
      if (!key.includes(':v2:')) for (const id of COURSE_IDS) {
        if (key.startsWith(`course:${id}:`) || key.startsWith(`learning-course:${id}:`)) {
          const migrated = readProgress(key, owner);
          if (migrated && !['null', '[]', '{}'].includes(migrated)) ids.add(id);
        }
      }
      continue;
    }
    for (const id of COURSE_IDS) if (key.startsWith(`course:${id}:`) || key.startsWith(`learning-course:${id}:`)) ids.add(id);
  }
  return [...ids];
}
export function learningProfile(owner = progressOwner()): LearningProfile {
  const profile: LearningProfile = { version: 1, interfaceLocale: 'ru', instructionLocale: 'ru', courses: {} };
  try {
    const raw = JSON.parse(readProgress(KEY, owner) || 'null');
    if (raw?.version === 1 && raw.courses && typeof raw.courses === 'object') {
      for (const id of COURSE_IDS) {
        const p = raw.courses[id] as LocalPlan;
        if (valid(p) && p.courseId === id) profile.courses[id] = { ...p, dirty: p.dirty === true, explicit: p.explicit === true, version: Number.isSafeInteger(p.version) ? p.version : 0, conflict: valid(p.conflict) ? p.conflict : undefined };
      }
    }
    // Migration is additive; no existing game, textbook, stars or review record is rewritten.
    for (const id of legacyCourses(owner)) if (!profile.courses[id]) profile.courses[id] = seed(id);
  } catch { profile.courses['bua-ru'] = seed('bua-ru'); }
  return profile;
}
function persist(profile: LearningProfile, owner: string) {
  if (owner !== progressOwner()) throw new Error('Account changed');
  writeProgress(KEY, JSON.stringify(profile), owner); window.dispatchEvent(new Event(PROFILE_EVENT));
}
export function saveCoursePlan(id: CourseId, input: Pick<CoursePlan, 'status' | 'goal' | 'minutes'>, owner = progressOwner()) {
  const profile = learningProfile(owner), old = profile.courses[id] ?? seed(id);
  const plan = { ...old, ...input, courseId: id, revision: old.conflict?.revision ?? old.revision, version: old.version + 1, dirty: true, explicit: true, conflict: undefined };
  if (!valid(plan)) throw new Error('Invalid course plan');
  profile.courses[id] = plan; persist(profile, owner);
}
export function acceptRemotePlan(id: CourseId, owner = progressOwner()) {
  const p = learningProfile(owner), old = p.courses[id];
  if (old?.conflict) { p.courses[id] = { ...old.conflict, version: old.version + 1, explicit: true, dirty: false }; persist(p, owner); }
}
const same = (a: CoursePlan, b: CoursePlan) => a.status === b.status && a.goal === b.goal && a.minutes === b.minutes;
let running: { owner: string; promise: Promise<'synced' | 'local' | 'conflict'> } | undefined;
export function syncLearningProfile(): Promise<'synced' | 'local' | 'conflict'> {
  const owner = progressOwner();
  if (owner === 'guest' || !navigator.onLine) return Promise.resolve('local');
  if (running?.owner === owner) return running.promise;
  const promise = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const remote = await apiRequest<{ enrollments: CoursePlan[] }>('/courses/enrollments');
      if (owner !== progressOwner()) return 'local' as const;
      if (!Array.isArray(remote.enrollments) || !remote.enrollments.every(valid)) throw new Error('Invalid profile');
      const profile = learningProfile(owner);
      for (const r of remote.enrollments) {
        const local = profile.courses[r.courseId];
        if (!local || !local.dirty || (!local.explicit && local.revision === 0) || same(local, r)) {
          profile.courses[r.courseId] = { ...r, dirty: false, explicit: true, version: local?.version ?? 0 };
        } else if (local.revision !== r.revision) { local.conflict = r; }
      }
      persist(profile, owner);
      let retry = false;
      for (const id of COURSE_IDS) {
        const current = learningProfile(owner).courses[id];
        if (!current?.dirty || current.conflict) continue;
        const { courseId, status, goal, minutes, revision } = current;
        let result: CoursePlan;
        try { result = await apiRequest<CoursePlan>(`/courses/enrollments/${courseId}`, { method: 'PATCH', body: JSON.stringify({ status, goal, minutes, revision }) }); }
        catch (e) { if (owner !== progressOwner()) return 'local' as const; if ((e as { statusCode?: number }).statusCode === 409) { retry = true; continue; } throw e; }
        if (owner !== progressOwner()) return 'local' as const;
        if (!valid(result) || result.courseId !== id) throw new Error('Invalid course plan');
        const latest = learningProfile(owner), local = latest.courses[id];
        if (local?.version === current.version) latest.courses[id] = { ...result, version: current.version, dirty: false, explicit: true };
        else if (local) { local.revision = result.revision; retry = true; }
        persist(latest, owner);
      }
      if (!retry) break;
    }
    const courses = Object.values(learningProfile(owner).courses);
    return courses.some(c => c?.conflict) ? 'conflict' as const : courses.some(c => c?.dirty) ? 'local' as const : 'synced' as const;
  })().finally(() => { if (running?.promise === promise) running = undefined; });
  running = { owner, promise }; return promise;
}

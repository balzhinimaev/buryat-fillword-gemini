import { readProgress as read, writeProgress as write, progressOwner } from './progressStorage';
import { activeCourseId } from '../courses/activeCourse';
export { progressOwner } from './progressStorage';

// Buryat keys stay byte-for-byte unchanged; new courses never claim its legacy data.
export function courseStorageKey(key: string): string {
  const course = activeCourseId();
  return course === 'bua-ru' ? key : `course:${course}:${key}`;
}
export const readProgress = (key: string, owner = progressOwner()) => read(courseStorageKey(key), owner);
export const writeProgress = (key: string, value: string, owner = progressOwner()) => write(courseStorageKey(key), value, owner);

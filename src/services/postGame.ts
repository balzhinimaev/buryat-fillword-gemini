import { isAdditionalCourse } from '../courses/activeCourse';
import { activateReferral, getStoredTokens } from './api';
export const ROUND_COMPLETED = 'fillword:round-completed';
export function afterCompletedRound(stars: number): void {
  if (stars <= 0 || !getStoredTokens()?.access_token) return;
  window.dispatchEvent(new Event(ROUND_COMPLETED));
  if (!isAdditionalCourse()) void activateReferral().catch(() => undefined); // retries on the next authenticated app start
}

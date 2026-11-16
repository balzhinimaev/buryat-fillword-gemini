import type { UnitStatus } from '../services/textbook';

// Resume a started lesson before suggesting a new one. Used by Today and the textbook.
export function nextLearningUnit(statuses: UnitStatus[]): UnitStatus | undefined {
  return statuses.find(s => !s.completed && (s.theoryRead || s.quizBest !== null || s.quizPassed || s.practiceStars > 0 || (s.unit.practiceSlugs.length > 0 && s.practiceDone)))
    ?? statuses.find(s => !s.completed);
}

export function nextLearningStep(status: UnitStatus): string {
  if (!status.theoryRead) return 'Познакомься с материалом и отметь его изученным';
  if (!status.practiceDone) return 'Закрепи слова в филворде';
  if (!status.quizPassed) return 'Проверь себя в коротком квизе';
  return 'Урок пройден — можно повторить';
}

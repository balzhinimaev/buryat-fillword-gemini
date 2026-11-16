import { czechCourse } from './czech';
import { englishCourse } from './english';
import { COURSE_IDS, type CourseId, type LanguageCode, type LearningCourse } from './model';

export interface CourseDefinition {
  id: CourseId;
  targetLanguage: LanguageCode;
  instructionLanguage: 'ru';
  title: string;
  nativeTitle: string;
  description: string;
  scope: string;
  letterNote: string;
  textbookTitle: string;
  /** Original backend/bundled Buryat content remains authoritative. */
  content: { kind: 'original-buryat' } | { kind: 'starter'; course: LearningCourse };
  tokenize: (text: string) => string[];
}
const letters = (text: string) => Array.from(text.normalize('NFC').toUpperCase().replace(/[^\p{L}]/gu, ''));
export const COURSE_CATALOG: Record<CourseId, CourseDefinition> = {
  'bua-ru': {
    id: 'bua-ru', targetLanguage: 'bua', instructionLanguage: 'ru', title: 'Бурятский', nativeTitle: 'Буряад хэлэн',
    description: 'Язык, повседневные слова и культура Бурятии.',
    scope: 'Существующая программа: учебник, главы, игры и сообщество.',
    letterNote: 'Бурятские буквы и исходные правила игрового поля.', textbookTitle: 'Учебник бурятского',
    content: { kind: 'original-buryat' }, tokenize: letters,
  },
  'cs-ru': {
    id: 'cs-ru', targetLanguage: 'cs', instructionLanguage: 'ru', title: 'Чешский', nativeTitle: 'Čeština',
    description: 'Первые слова для знакомства с чешским языком.', scope: 'Стартовая лексическая программа, не полный языковой уровень.',
    letterNote: 'Знаки над буквами сохраняются; CH занимает одну клетку.', textbookTitle: 'Учебник чешского',
    content: { kind: 'starter', course: czechCourse }, tokenize: text => letters(text).join('').match(/CH|./gu) ?? [],
  },
  'en-ru': {
    id: 'en-ru', targetLanguage: 'en', instructionLanguage: 'ru', title: 'Английский', nativeTitle: 'English',
    description: 'Базовые слова о семье, доме и окружающем мире.', scope: 'Стартовая лексическая программа, не полный языковой уровень.',
    letterNote: 'Латинские буквы занимают отдельные клетки, включая C и H.', textbookTitle: 'Учебник английского',
    content: { kind: 'starter', course: englishCourse }, tokenize: letters,
  },
};
export const availableCourses = () => COURSE_IDS.map(id => COURSE_CATALOG[id]);
export function starterCourse(id: CourseId): LearningCourse | null {
  const content = COURSE_CATALOG[id].content;
  return content.kind === 'starter' ? content.course : null;
}

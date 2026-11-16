/** Language, instruction locale and UI locale are independent concepts. */
export const COURSE_IDS = ['bua-ru', 'cs-ru', 'en-ru'] as const;
export type CourseId = typeof COURSE_IDS[number];
export type LanguageCode = 'bua' | 'cs' | 'en' | 'ru';
export type InstructionLocale = 'ru';
export type InterfaceLocale = 'ru';
export interface CourseWord { id: string; text: string; ru: string }
export interface CourseLesson { id: string; title: string; note: string; words: CourseWord[] }
export interface LearningCourse { id: CourseId; language: LanguageCode; instructionLanguage: InstructionLocale; title: string; nativeTitle: string; alphabet: string[]; lessons: CourseLesson[] }
export const isCourseId = (id: unknown): id is CourseId => COURSE_IDS.includes(id as CourseId);

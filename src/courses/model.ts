export const COURSE_IDS = ['bua-ru', 'cs-ru', 'en-ru'] as const;
export type CourseId = typeof COURSE_IDS[number];
export interface CourseWord { id: string; text: string; ru: string }
export interface CourseLesson { id: string; title: string; note: string; words: CourseWord[]; chapter?: string }
export interface LearningCourse {
  id: CourseId; language: string; instructionLanguage: 'ru'; title: string;
  nativeTitle: string; alphabet: string[]; lessons: CourseLesson[];
}
// Orthography is data, not a separate game implementation per language.
export const languageRules: Record<string, { digraphs: string[]; note: string }> = {
  bua: { digraphs: [], note: 'Ү, Ө и Һ — самостоятельные буквы. Одна буква занимает одну клетку.' },
  cs: { digraphs: ['CH'], note: 'Знаки над буквами важны. CH занимает одну клетку.' },
  en: { digraphs: [], note: 'Одна буква занимает одну клетку, включая отдельные C и H.' },
};

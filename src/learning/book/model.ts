export interface BookTable { headers: string[]; rows: string[][] }
export interface BookSection {
  id: string;
  title: string;
  body: string;
  table?: BookTable;
  examples: [string, string][];
}
interface QuestionBase { id: string; prompt: string; explanation: string; skill?: 'translation' | 'correction'; sectionIds?: string[]; hint?: string }
export type BookQuestion =
  | (QuestionBase & { type: 'choice'; options: string[]; answer: string })
  | (QuestionBase & { type: 'input'; answers: string[] })
  | (QuestionBase & { type: 'order'; tokens: string[]; answer: string });
export interface BookPracticeSet {
  id: string; title: string; description: string; kind: 'training' | 'mixed';
  chapterIds: string[]; questions: BookQuestion[];
}
export interface BookUsage {
  title: string;
  situation: string;
  dialogue: [string, string][];
  contrast: [string, string][];
  takeaway: string;
  task: string;
  model: [string, string];
  checklist: string[];
}
export interface BookChapter {
  usage?: BookUsage;
  id: string;
  title: string;
  level: 'Старт' | 'A1' | 'A2' | 'B1' | 'B2';
  goal: string;
  sections: BookSection[];
  mistakes: [string, string, string][];
  task: string;
  questions: BookQuestion[];
  practice?: BookPracticeSet[];
  vocabulary?: string;
}
export interface BookReference extends BookTable { id: string; title: string; note: string }
export interface LearningBook {
  id: 'en-ru'; title: string; version: number;
  chapters: BookChapter[]; references: BookReference[];
}
export function normaliseAnswer(value: string): string {
  return value.normalize('NFC').trim().toLowerCase().replace(/[’‘]/g, "'")
    .replace(/[.!?]+$/g, '').replace(/\s+/g, ' ');
}
export function isCorrect(question: BookQuestion, answer: string): boolean {
  const accepted = question.type === 'input' ? question.answers : [question.answer];
  // Full-phrase practice checks grammar, not comma placement. Keep apostrophes and words significant.
  const normalise = (value: string) => normaliseAnswer(question.type === 'input' && question.skill ? value.replace(/,/g, '') : value);
  return accepted.some(value => normalise(value) === normalise(answer));
}
export function answerText(question: BookQuestion): string {
  return question.type === 'input' ? question.answers[0] : question.answer;
}
export const BOOK_PASS_RATIO = 0.8;
export function searchText(chapter: BookChapter): string {
  return [chapter.title, chapter.goal, ...(chapter.usage ? [chapter.usage.title, chapter.usage.situation, ...chapter.usage.dialogue.flat(), ...chapter.usage.contrast.flat(), chapter.usage.takeaway, chapter.usage.task, ...chapter.usage.model, ...chapter.usage.checklist] : []), ...chapter.sections.flatMap(s => [s.title, s.body,
    ...s.examples.flat(), ...(s.table?.rows.flat() || [])])].join(' ').toLowerCase().replace(/ё/g, 'е');
}

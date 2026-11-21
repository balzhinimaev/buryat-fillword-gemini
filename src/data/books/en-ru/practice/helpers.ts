import type { BookQuestion } from '../../../../learning/book/model';
import { choice, input, order } from '../helpers';
export type TopicPair = [BookQuestion, BookQuestion];
export const pick = choice;
export const fill = input;
export function translate(ru: string, answers: string[], explanation: string, constraint = ''): BookQuestion {
  return { ...input(`Переведите: «${ru}».${constraint ? ` ${constraint}` : ''}`, answers, explanation), skill: 'translation',
    hint: 'Напишите всю фразу. Условия в задании задают нужную конструкцию.' };
}
export function fix(wrong: string, answers: string[], explanation: string, constraint = 'Исправьте только грамматическую ошибку, сохранив остальные слова.'): BookQuestion {
  return { ...input(`Исправьте: ${wrong}`, answers, explanation), skill: 'correction', hint: constraint };
}
export function arrange(ru: string, answer: string, explanation: string): BookQuestion {
  // Deterministic scrambling, including duplicate tokens; never show the answer in its original order.
  const words = answer.split(' ');
  const tokens = words.filter((_, i) => i % 2 === 1).reverse().concat(words.filter((_, i) => i % 2 === 0).reverse());
  return { ...order(`Соберите перевод: «${ru}».`, tokens, answer, explanation), skill: 'translation', hint: 'Используйте все слова, не меняя их формы.' };
}
export function topic(chapter: number, section: number, question: BookQuestion): BookQuestion {
  return { ...question, sectionIds: [`en-${String(chapter).padStart(2, '0')}-s${section}`] };
}
export function identify(questions: BookQuestion[], setId: string): BookQuestion[] {
  return questions.map((question, i) => {
    const id = `${setId}-q${i + 1}`;
    const hash = (text: string) => Array.from(id + text).reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
    return question.type === 'choice' ? { ...question, id, options: [...question.options].sort((a,b) => hash(a) - hash(b)) } : { ...question, id };
  });
}

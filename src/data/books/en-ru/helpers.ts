import type { BookChapter, BookQuestion, BookSection, BookTable } from '../../../learning/book/model';
export const table = (headers: string[], rows: string[][]): BookTable => ({ headers, rows });
export const section = (title: string, body: string, examples: [string, string][], grid?: BookTable): BookSection => ({ id: '', title, body, examples, table: grid });
export const choice = (prompt: string, options: string[], answer: string, explanation: string): BookQuestion => ({ id: '', type: 'choice', prompt, options, answer, explanation });
export const input = (prompt: string, answers: string[], explanation: string): BookQuestion => ({ id: '', type: 'input', prompt, answers, explanation });
export const order = (prompt: string, tokens: string[], answer: string, explanation: string): BookQuestion => ({ id: '', type: 'order', prompt, tokens, answer, explanation });
export const chapter = (number: number, content: Omit<BookChapter, 'id'>): BookChapter => {
  const id = `en-${String(number).padStart(2, '0')}`;
  return { ...content, id,
    sections: content.sections.map((s, i) => ({ ...s, id: `${id}-s${i + 1}` })),
    questions: content.questions.map((q, i) => {
      const questionId = `${id}-q${i + 1}`;
      const rank = (text: string) => Array.from(questionId + text).reduce((hash, ch) => Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
      return q.type === 'choice' ? { ...q, id: questionId, options: [...q.options].sort((a, b) => rank(a) - rank(b)) } : { ...q, id: questionId };
    }),
  };
};

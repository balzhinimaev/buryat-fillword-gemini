import type { BookChapter, BookPracticeSet } from '../../../../learning/book/model';
import { foundationPractice } from './foundations';
import { developmentPractice } from './development';
import { advancedPractice } from './advanced';
import { mixedPractice } from './mixed';
import { identify, topic } from './helpers';
const chapterId = (n: number) => `en-${String(n).padStart(2, '0')}`;
const topics = [...foundationPractice, ...developmentPractice, ...advancedPractice];
export function withPractice(chapters: BookChapter[]): BookChapter[] {
  return chapters.map((chapter, index) => {
    const id = `${chapter.id}-practice`;
    const practice: BookPracticeSet[] = [{ id, title: 'Расширенная практика', kind: 'training',
      description: 'Десять новых заданий: по два на каждую тему главы. Перевод, исправление ошибок и применение правил.',
      chapterIds: [chapter.id], questions: identify(topics[index].flatMap((pair, section) => pair.map(q => topic(index + 1, section + 1, q))), id) }];
    if ((index + 1) % 4 === 0) {
      const setId = `${chapter.id}-mixed`;
      practice.push({ id: setId, title: `Смешанная проверка · главы ${index - 2}–${index + 1}`, kind: 'mixed',
        description: 'Соедините несколько правил в новых ситуациях. После ответа можно вернуться к нужным темам.',
        chapterIds: Array.from({ length: 4 }, (_, n) => chapterId(index - 2 + n)), questions: identify(mixedPractice[(index + 1) / 4 - 1], setId) });
    }
    return { ...chapter, practice };
  });
}

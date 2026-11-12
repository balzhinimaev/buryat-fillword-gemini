import chapters from '../data/offlineCampaignLevels.json';
import type { LearningCourse } from './model';

/** Adapt existing curriculum; never manufacture translations or change legacy slugs. */
export const buryatCourse: LearningCourse = {
  id: 'bua-ru', language: 'bua', instructionLanguage: 'ru', title: 'Бурятский', nativeTitle: 'Буряад хэлэн',
  alphabet: [...'АБВГДЕЁЖЗИЙКЛМНОӨПРСТУҮФХҺЦЧШЩЪЫЬЭЮЯ'],
  lessons: [...chapters].sort((a, b) => a.order - b.order).flatMap(chapter =>
    [...chapter.lessons].sort((a, b) => a.order - b.order).map(lesson => ({
      id: lesson.slug, title: lesson.name, chapter: chapter.title,
      note: 'Познакомьтесь со словами и их переводами. Затем найдите слова на поле и проверьте, что запомнили. Ү, Ө и Һ отличаются от У, О и Х.',
      // Same word in different lessons has one review schedule.
      words: lesson.words.map(word => ({ id: `bua:${word.bur.normalize('NFC')}`, text: word.bur, ru: word.ru })),
    }))),
};

import type { LearningBook } from '../../../learning/book/model';
import { foundations } from './foundations';
import { development } from './development';
import { advanced } from './advanced';
import { withUsage } from './usage';
import { withPractice } from './practice';
import { references } from './reference';
export const englishBook: LearningBook = {
  id: 'en-ru', title: 'Английский: от правила к речи', version: 3,
  chapters: withUsage(withPractice([...foundations, ...development, ...advanced])), references,
};

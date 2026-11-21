import type { BookChapter } from '../../../../learning/book/model';
import { foundationUsage } from './foundations';
import { developmentUsage } from './development';
import { advancedUsage } from './advanced';
const usage = [...foundationUsage, ...developmentUsage, ...advancedUsage];
export const withUsage = (chapters: BookChapter[]): BookChapter[] => chapters.map((chapter, n) => ({ ...chapter, usage: usage[n] }));

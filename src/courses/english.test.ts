import { beforeEach, expect, it, vi } from 'vitest';
import { englishCourse } from './english';
import { czechCourse } from './czech';
import { courseBoard, courseLetters } from './engine';
import { completeCourseLesson, completedLessons, syncCourseProgress } from './progress';
import { readDraft, writeDraft, draftBoard } from './draft';
import { apiRequest } from '../services/api';
vi.mock('../services/api', () => ({ apiRequest: vi.fn() }));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
it('has 48 unique English words in eight Russian-language lessons', () => {
 const words=englishCourse.lessons.flatMap(l=>l.words);
 expect(words).toHaveLength(48); expect(new Set(words.map(w=>w.text)).size).toBe(48);
 expect(courseLetters('chair','en')).toEqual(['C','H','A','I','R']);
 expect(courseLetters('chléb','cs')).toEqual(['CH','L','É','B']);
 for(const lesson of englishCourse.lessons) for(let i=0;i<10;i++) {
  const board=courseBoard(englishCourse,lesson);
  expect(board.words).toHaveLength(6);
  for(const placement of board.words) expect(placement.path.map(p=>board.grid[p.r][p.c]).join('')).toBe(placement.word.text.toUpperCase());
 }
});
it('keeps Czech and English completion and drafts separate even with matching lesson IDs', () => {
 completeCourseLesson('home','guest',englishCourse);
 expect(completedLessons('guest',englishCourse)).toEqual(['home']);
 expect(completedLessons()).toEqual([]);
 writeDraft(englishCourse.lessons[0],123,[], 'guest',englishCourse);
 expect(readDraft(czechCourse.lessons[0])).toBeNull();
 expect(readDraft(englishCourse.lessons[0],englishCourse)?.seed).toBe(123);
 expect(draftBoard(englishCourse.lessons[0],123,englishCourse)).toEqual(draftBoard(englishCourse.lessons[0],123,englishCourse));
});
it('syncs English using its own API endpoint without touching Czech', async () => {
 localStorage.setItem('auth_tokens',JSON.stringify({access_token:`x.${btoa(JSON.stringify({sub:'user1'}))}.x`}));
 vi.mocked(apiRequest).mockResolvedValue({completedLessons:['food']});
 await syncCourseProgress(englishCourse);
 expect(apiRequest).toHaveBeenNthCalledWith(1,'/courses/en-ru/progress');
 expect(completedLessons(undefined,englishCourse)).toEqual(['food']);
 expect(completedLessons()).toEqual([]);
});
it('mixed layouts remain adjacent, non-overlapping and reproducible across many seeds', () => {
 for (const course of [englishCourse,czechCourse]) for(const lesson of course.lessons) for(let seed=0;seed<30;seed++) {
  const board=draftBoard(lesson,seed,course,2);
  const used=new Set<string>();
  for (const word of board.words) word.path.forEach((p,i)=>{
   const key=`${p.r}:${p.c}`; expect(used.has(key)).toBe(false); used.add(key);
   expect(p.r>=0 && p.r<board.size && p.c>=0 && p.c<board.size).toBe(true);
   if(i) expect(Math.abs(p.r-word.path[i-1].r)+Math.abs(p.c-word.path[i-1].c)).toBe(1);
  });
 }
});

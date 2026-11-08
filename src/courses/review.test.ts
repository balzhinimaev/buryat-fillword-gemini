import {beforeEach,expect,it} from 'vitest';
import {englishCourse} from './english';
import {czechCourse} from './czech';
import {completeCourseLesson} from './progress';
import {correctAnswer,dueWords,recordReview,reviewRecords} from './review';
beforeEach(()=>localStorage.clear());
it('only reviews completed lessons and isolates languages',()=>{
 expect(dueWords(englishCourse)).toEqual([]);
 completeCourseLesson('home','guest',englishCourse);
 expect(dueWords(englishCourse)).toHaveLength(6);expect(dueWords(czechCourse)).toEqual([]);
});
it('spaces successes, resets errors and does not promote an immediately repeated answer',()=>{
 completeCourseLesson('home','guest',englishCourse); const w=englishCourse.lessons[2].words[0],now=1000;
 recordReview(englishCourse,w,true,'guest',false,now);
 expect(reviewRecords(englishCourse)[w.id].due).toBe(now+86400000);
 recordReview(englishCourse,w,true,'guest',false,now+86400000);
 expect(reviewRecords(englishCourse)[w.id].stage).toBe(2);
 recordReview(englishCourse,w,false,'guest',false,now);
 expect(reviewRecords(englishCourse)[w.id]).toMatchObject({stage:0,due:601000,mistakes:1});
 recordReview(englishCourse,w,true,'guest',true,now);
 expect(reviewRecords(englishCourse)[w.id].stage).toBe(0);
 expect(dueWords(englishCourse,601000)[0].id).toBe(w.id);
});
it('rejects unlearned words and account changes',()=>{
 const w=englishCourse.lessons[0].words[0];
 expect(()=>recordReview(englishCourse,w,true,'guest')).toThrow();
 completeCourseLesson('greetings','guest',englishCourse);
 localStorage.setItem('auth_tokens',JSON.stringify({access_token:`x.${btoa(JSON.stringify({sub:'new-owner'}))}.x`}));
 expect(()=>recordReview(englishCourse,w,true,'guest')).toThrow('Account changed');
 expect(reviewRecords(englishCourse)).toEqual({});
});
it('normalizes case and Unicode without dropping Czech accents',()=>{
 expect(correctAnswer(' HELLO ',englishCourse.lessons[0].words[0],'en')).toBe(true);
 const w=czechCourse.lessons[3].words[1];
 expect(correctAnswer(w.text.normalize('NFD'),w,'cs')).toBe(true);
 expect(correctAnswer('chleb',w,'cs')).toBe(false);
});

import type { LearningCourse, CourseWord } from './czech';
import { completedLessons } from './progress';
import { progressOwner, readProgress, writeProgress } from '../services/progressStorage';
export interface ReviewRecord { text: string; stage: number; due: number; mistakes: number }
const key = (course: LearningCourse) => `learning-course:${course.id}:review:v1`;
const intervals = [1, 3, 7, 14, 30];
export function reviewRecords(course: LearningCourse, owner = progressOwner()): Record<string,ReviewRecord> {
 try {
  const raw = JSON.parse(readProgress(key(course),owner)||'{}');
  const result: Record<string,ReviewRecord> = {};
  for(const word of course.lessons.flatMap(l=>l.words)) {
   const r=raw?.[word.id];
   if(r && r.text===word.text && Number.isInteger(r.stage) && r.stage>=0 && r.stage<=5 && Number.isFinite(r.due) && r.due>=0 && Number.isInteger(r.mistakes) && r.mistakes>=0) result[word.id]=r;
  }
  return result;
 } catch { return {}; }
}
export function dueWords(course: LearningCourse, now=Date.now()): CourseWord[] {
 const completed=completedLessons(undefined,course), records=reviewRecords(course);
 return course.lessons.filter(l=>completed.includes(l.id)).flatMap(l=>l.words)
  .filter(w=>!records[w.id] || records[w.id].due<=now)
  .sort((a,b)=>(records[b.id]?.mistakes||0)-(records[a.id]?.mistakes||0) || (records[a.id]?.due||0)-(records[b.id]?.due||0));
}
export function correctAnswer(answer:string, word:CourseWord, language:string) {
 return answer.trim().normalize('NFC').toLocaleLowerCase(language)===word.text.normalize('NFC').toLocaleLowerCase(language);
}
export function recordReview(course:LearningCourse, word:CourseWord, correct:boolean, owner:string, reinforcement=false, now=Date.now()) {
 if(owner!==progressOwner()) throw new Error('Account changed');
 if(!course.lessons.some(l=>completedLessons(owner,course).includes(l.id) && l.words.some(w=>w.id===word.id && w.text===word.text))) throw new Error('Word is not learned');
 const records=reviewRecords(course,owner), old=records[word.id];
 const stage=correct && !reinforcement ? Math.min((old?.stage||0)+1,5) : 0;
 records[word.id]={text:word.text,stage,due:now+(stage ? intervals[stage-1]*86400000 : 600000),mistakes:(old?.mistakes||0)+(correct?0:1)};
 writeProgress(key(course),JSON.stringify(records),owner);
}

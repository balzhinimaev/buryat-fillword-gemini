import { useState } from 'react';
import type { LearningCourse } from './czech';
import { progressOwner } from '../services/progressStorage';
import { correctAnswer, dueWords, recordReview } from './review';
const button='min-h-11 rounded-xl px-4 py-2 font-semibold bg-emerald-700 text-white disabled:opacity-50';
export default function ReviewPractice({course,onBack}:{course:LearningCourse;onBack:()=>void}) {
 const [owner]=useState(progressOwner);
 const [queue,setQueue]=useState(()=>dueWords(course).slice(0,10).map(word=>({word,retry:false})));
 const [index,setIndex]=useState(0),[answer,setAnswer]=useState('');
 const [feedback,setFeedback]=useState<{correct:boolean; saved:boolean}|null>(null);
 const [error,setError]=useState('');
 const [correctCount,setCorrectCount]=useState(0),[mistakes,setMistakes]=useState(0);
 const current=queue[index];
 const save=(correct:boolean)=>{
  try { recordReview(course,current.word,correct,owner,current.retry); setError(''); return true; }
  catch { setError('Не удалось сохранить повторение. Проверьте свободное место и текущий аккаунт.'); return false; }
 };
 const submit=(unknown=false)=>{
  if(feedback||!current) return;
  const correct=!unknown && correctAnswer(answer,current.word,course.language);
  setFeedback({correct,saved:save(correct)});
  if(correct) setCorrectCount(n=>n+1); else {
   setMistakes(n=>n+1);
   if(!current.retry) setQueue(q=>[...q,{word:current.word,retry:true}]);
  }
 };
 return <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
  <button type="button" onClick={onBack} className="mb-4 min-h-11 font-semibold">← К курсу</button>
  <h1 className="text-2xl font-bold">Повторение слов</h1>
  {!current ? <><h2 className="mt-4 text-xl font-bold">Повторение завершено</h2><p className="my-3">Верных ответов: {correctCount}. Ошибок: {mistakes}.</p><p>Трудные слова вернутся через 10 минут, уверенные — начиная с завтрашнего дня.</p></> : <>
   <p className="my-3 text-sm">Задание {index+1} из {queue.length}{current.retry ? ' · закрепление после ошибки' : ''}</p>
   <p className="mb-2">Вспомните слово и напишите его на языке курса.</p>
   <p className="my-4 text-2xl font-bold">{current.word.ru}</p>
   <form onSubmit={e=>{e.preventDefault();submit();}}>
    <label className="block font-semibold" htmlFor="review-answer">Ваш ответ ({course.title.toLowerCase()})</label>
    <input id="review-answer" key={index} autoFocus lang={course.language} autoComplete="off" autoCorrect="off" spellCheck={false} autoCapitalize="none" disabled={!!feedback} value={answer} onChange={e=>setAnswer(e.target.value)} className="my-3 w-full rounded-xl border border-stone-400 bg-transparent p-3 text-xl" />
    {!feedback && <div className="flex flex-wrap gap-2"><button className={button} disabled={!answer.trim()} type="submit">Проверить ответ</button><button className={button} type="button" onClick={()=>submit(true)}>Не помню</button></div>}
   </form>
   {feedback && <div className="mt-4 rounded-xl bg-stone-100 p-4 text-stone-900 dark:bg-stone-800 dark:text-stone-100" role="status">
    <p className="font-bold">{feedback.correct?'Верно!':'Разберём слово'}</p>
    <p className="my-2"><span lang={course.language} className="text-xl font-bold">{current.word.text}</span> — {current.word.ru}</p>
    {!feedback.correct && <p className="mb-3">{current.retry ? 'Вернёмся к нему позже.' : 'Посмотрите на написание: слово ещё раз появится в конце этого повторения.'} {course.language==='cs' ? 'Знаки над буквами важны.' : ''}</p>}
    {!feedback.saved && <button className={button} onClick={()=>{if(save(feedback.correct)) setFeedback({...feedback,saved:true});}}>Повторить сохранение</button>}
    <button className={`${button} ml-2`} disabled={!feedback.saved} onClick={()=>{setIndex(i=>i+1);setAnswer('');setFeedback(null);}}>Далее</button>
   </div>}
   {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
  </>}
  <p className="mt-5 text-xs text-stone-500">Расписание повторений сохраняется на этом устройстве, отдельно для каждого языка и аккаунта. Завершённые уроки не сбрасываются.</p>
 </section>;
}

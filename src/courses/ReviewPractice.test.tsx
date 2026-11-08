import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {beforeEach,afterEach,expect,it} from 'vitest';
import ReviewPractice from './ReviewPractice';
import {englishCourse} from './english';
import {completeCourseLesson,completedLessons} from './progress';
import {reviewRecords} from './review';
beforeEach(()=>{localStorage.clear();completeCourseLesson('greetings','guest',englishCourse);});
afterEach(cleanup);
it('waits for explicit next, repeats a mistake once, and retains completed lessons',()=>{
 render(<ReviewPractice course={englishCourse} onBack={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Не помню'}));
 expect(screen.getByText('Разберём слово')).toBeTruthy();
 expect(screen.getByText('hello')).toBeTruthy();
 expect(screen.getByText(/Задание 1 из 7/)).toBeTruthy();
 for(const word of englishCourse.lessons[0].words.slice(1)) {
  fireEvent.click(screen.getByRole('button',{name:'Далее'}));
  fireEvent.change(screen.getByLabelText(/Ваш ответ/),{target:{value:word.text}});
  fireEvent.click(screen.getByRole('button',{name:'Проверить ответ'}));
 }
 fireEvent.click(screen.getByRole('button',{name:'Далее'}));
 expect(screen.getByText(/закрепление после ошибки/)).toBeTruthy();
 fireEvent.change(screen.getByLabelText(/Ваш ответ/),{target:{value:'hello'}});
 fireEvent.click(screen.getByRole('button',{name:'Проверить ответ'}));
 fireEvent.click(screen.getByRole('button',{name:'Далее'}));
 expect(screen.getByText('Повторение завершено')).toBeTruthy();
 expect(reviewRecords(englishCourse)['greetings-1'].stage).toBe(0);
 expect(completedLessons(undefined,englishCourse)).toEqual(['greetings']);
});

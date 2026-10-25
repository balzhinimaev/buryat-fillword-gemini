import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TextbookQuiz } from './TextbookQuiz';
import { getQuizBest } from '../services/textbook';
afterEach(() => {cleanup(); vi.restoreAllMocks();});
test('answer feedback stays until explicit next; final result is stored with selected answers', async () => {
  localStorage.clear();
  const a = {bur:'АБА',ru:'Отец'}, b = {bur:'ЭЖЫ',ru:'Мать'};
  const finished = vi.fn();
  render(<TextbookQuiz title="Проверка" saveSlug="family" onClose={vi.fn()} onFinished={finished}
    makeQuestions={() => [{type:'bur2tr',word:a,options:[a,b],correctIndex:0}]}/>);
  fireEvent.click(screen.getByRole('button',{name:'Отец'}));
  // Old implementation auto-finished in 700 ms and removed feedback.
  await new Promise(r => setTimeout(r,800));
  expect(finished).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Посмотреть результат'}));
  expect(finished).toHaveBeenCalledOnce();
  expect(getQuizBest('family')).toEqual({correct:1,total:1});
});

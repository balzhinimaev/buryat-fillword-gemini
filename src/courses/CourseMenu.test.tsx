import { fireEvent, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CourseMenu from './CourseMenu';
import { chooseCourse, completedLessons } from './progress';
import { activeCourseId, restartCourseApp } from './activeCourse';
import { isTheoryRead } from '../services/textbook';
import { englishCourse } from './english';
import { useGameStore } from '../store/gameStore';
import { GameScreen } from '../screens/GameScreen';
import { TextbookScreen } from '../screens/TextbookScreen';
import { TextbookLessonScreen } from '../screens/TextbookLessonScreen';
import { writeProgress } from '../services/courseStorage';
import { readClassicDraft } from './classicDraft';
import { offlineGetCampaignOverview } from '../services/offlineCampaign';
const auth = vi.hoisted(() => ({ state: { user: null, isAuthenticated: false }, refreshUser: vi.fn() }));
vi.mock('../store/authStore', () => ({ useAuth: () => auth }));
vi.mock('../utils/analytics', () => ({ trackAnalyticsEventNonBlocking: vi.fn() }));
vi.mock('../utils/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('./activeCourse', async original => ({ ...await original<object>(), restartCourseApp: vi.fn() }));
function Harness() {
  const store = useGameStore();
  switch (store.state.currentScreen) {
    case 'game': return <GameScreen store={store} />;
    case 'textbook': return <TextbookScreen store={store} />;
    case 'textbookLesson': return <TextbookLessonScreen store={store} />;
    default: return <CourseMenu store={store} />;
  }
}
beforeEach(() => {
  localStorage.clear(); chooseCourse('bua-ru');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  vi.stubGlobal('PointerEvent', MouseEvent);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const prepare = (id: 'bua-ru' | 'en-ru' | 'cs-ru') => {
  chooseCourse(id); writeProgress('buryat_fillword_game', JSON.stringify({ settings: { hasSeenHowTo: true, hasSeenTimerOnboarding: true, timerEnabled: false, soundEnabled: false } }));
};
it('keeps the original Buryat Today, modes, textbook and dictionary as the primary application', async () => {
  prepare('bua-ru'); render(<Harness />);
  expect(await screen.findByRole('heading', { name: 'Сегодня' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Все игровые режимы' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Учиться' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Профиль' })).toBeInTheDocument();
  expect(screen.queryByText('Классический бурятский режим')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Мои курсы. Сейчас/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Каталог курсов' }));
  const english = screen.getByRole('heading', { name: 'Английский' }).closest('article')!;
  fireEvent.click(within(english).getByRole('button', { name: 'Посмотреть курс' }));
  expect(activeCourseId()).toBe('bua-ru');
  expect(restartCourseApp).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Зачем изучаю язык'), { target: { value: 'travel' } });
  fireEvent.click(screen.getByRole('radio', { name: '10 мин.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Добавить курс и начать' }));
  expect(activeCourseId()).toBe('en-ru'); expect(restartCourseApp).toHaveBeenCalledOnce();
});
it.each(['en-ru', 'cs-ru'] as const)('uses the original Today → textbook → cards/quiz/practice flow for %s', async id => {
  prepare(id); render(<Harness />);
  expect(await screen.findByRole('heading', { name: 'Сегодня' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Учиться' }));
  expect(await screen.findByRole('heading', { name: id === 'en-ru' ? 'Учебник английского' : 'Учебник чешского' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Продолжить занятие/ }));
  expect(await screen.findByRole('button', { name: /Карточки/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Квиз/ })).toBeInTheDocument();
  expect(screen.getByText('Практика · найди слова в филлворде')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Филворд' }));
  expect(document.activeElement).toHaveAttribute('aria-label', 'Практика урока');
  fireEvent.click(screen.getByRole('button', { name: 'Материал' }));
  expect(document.activeElement).toHaveAttribute('aria-label', 'Материал урока');
  expect(isTheoryRead('greetings')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Проверка' }));
  expect(await screen.findByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
  fireEvent.click(screen.getByRole('button', { name: 'К списку уроков' }));
  expect(await screen.findByRole('heading', { name: id === 'en-ru' ? 'Учебник английского' : 'Учебник чешского' })).toBeInTheDocument();
});
it('plays English with the original drag field and stars, restores it, and leaves Czech untouched', async () => {
  prepare('en-ru');
  // Resume is the original store navigation, not a second course screen.
  writeProgress('buryat_fillword_game', JSON.stringify({ campaignResumeSlug: 'home', settings: { hasSeenHowTo: true, hasSeenTimerOnboarding: true, timerEnabled: false, soundEnabled: false } }));
  let view = render(<Harness />);
  fireEvent.click(await screen.findByRole('button', { name: /Продолжить игру/ }));
  await waitFor(() => expect(document.querySelector('[data-r]')).toBeTruthy());
  const draft = readClassicDraft('home')!;
  const letters = () => [...document.querySelectorAll<HTMLElement>('[data-r]')];
  const draw = (index: number) => {
    letters().forEach(cell => {
      const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
      cell.getBoundingClientRect = () => ({ x: c*50, y: r*50, left: c*50, top: r*50, right: c*50+48, bottom: r*50+48, width: 48, height: 48, toJSON: () => ({}) });
    });
    const path = draft.board.placedWords[index].path;
    const start = document.querySelector(`[data-r="${path[0].r}"][data-c="${path[0].c}"]`)!;
    fireEvent.pointerDown(start, { button: 0, clientX: path[0].c*50+20, clientY: path[0].r*50+20 });
    path.slice(1).forEach(c => fireEvent.pointerMove(window, { clientX: c.c*50+20, clientY: c.r*50+20 }));
    fireEvent.pointerUp(window);
  };
  draw(0);
  await waitFor(() => expect(readClassicDraft('home')?.found).toHaveLength(1));
  const before = letters().map(c => c.textContent);
  view.unmount();
  // The store clears the resume hint on entry; the new draft recovery supplies it on return.
  view = render(<Harness />);
  fireEvent.click(await screen.findByRole('button', { name: /Продолжить игру/ }));
  await waitFor(() => expect(screen.getByText('1/6')).toBeInTheDocument());
  expect(letters().map(c => c.textContent)).toEqual(before);
  for (let i = 1; i < draft.board.placedWords.length; i++) draw(i);
  await waitFor(() => expect(completedLessons(undefined, englishCourse)).toEqual(['home']));
  expect(offlineGetCampaignOverview().earnedStars).toBe(3);
  expect(readClassicDraft('home')).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  view.unmount(); chooseCourse('cs-ru');
  expect(offlineGetCampaignOverview().earnedStars).toBe(0);
});

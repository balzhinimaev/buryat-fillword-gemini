import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import MainMenu from './MainMenu';
import type { GameStore } from '../store/gameStore';
import * as textbook from '../services/textbook';

const refreshUser = vi.fn();
vi.mock('../store/authStore', () => ({ useAuth: () => ({ state: { isAuthenticated: true, isNewUser: false, user: { name: 'Игрок', role: 'user' } }, refreshUser }) }));
vi.mock('../hooks/useTelegram', () => ({ useTelegram: () => ({ openLink: vi.fn() }) }));
vi.mock('../utils/analytics', () => ({ trackAnalyticsEventNonBlocking: vi.fn() }));
const makeStore = () => ({
  state: { campaignResumeSlug: null as string | null, settings: { hasSeenHowTo: true }, stats: { totalStars: 3, currentStreak: 1, level: 1, lastPlayedDate: null as string | null } },
  updateSettings: vi.fn(), xpProgress: 0.2, xpToNextLevel: 30, navigate: vi.fn(), navigateToTextbookUnit: vi.fn(), setCampaignLandingView: vi.fn(), selectCategory: vi.fn(), setCampaignResumeSlug: vi.fn(), startDailyGame: vi.fn(),
});
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(textbook, 'fetchPracticeLessons').mockResolvedValue({});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const show = async (store = makeStore()) => {
  render(<MainMenu store={store as unknown as GameStore} />);
  await act(async () => {});
  return store;
};

describe('Today home', () => {
  it('takes a new player directly to interactive practice, without loading a campaign on click', async () => {
    const store = makeStore(); store.state.settings.hasSeenHowTo = false;
    await show(store);
    fireEvent.click(screen.getByRole('button', { name: /Начать с трёх слов/ }));
    expect(store.navigate).toHaveBeenCalledWith('howto');
    expect(store.selectCategory).not.toHaveBeenCalled();
  });
  it('prioritizes the saved campaign over the next textbook unit', async () => {
    const store = makeStore(); store.state.campaignResumeSlug = 'saved-level';
    await show(store);
    fireEvent.click(screen.getByRole('button', { name: /Продолжить игру/ }));
    expect(store.selectCategory).toHaveBeenCalledWith('saved-level');
    expect(store.setCampaignResumeSlug).toHaveBeenCalledWith(null);
    expect(store.navigateToTextbookUnit).not.toHaveBeenCalled();
  });
  it('keeps lessons and game modes usable when server loading fails', async () => {
    vi.mocked(textbook.fetchPracticeLessons).mockRejectedValue(new Error('offline'));
    const store = await show();
    fireEvent.click(screen.getByRole('button', { name: /Продолжить занятие/ }));
    expect(store.navigateToTextbookUnit).toHaveBeenCalledWith(textbook.getTextbook().units[0].slug);
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать тип игры' }));
    expect(store.navigate).toHaveBeenCalledWith('gameCatalog');
  });
  it('updates restored course progress without a reload', async () => {
    await show();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    const real = textbook.getUnitStatuses({});
    vi.spyOn(textbook, 'getUnitStatuses').mockReturnValue(real.map((unit, i) => ({ ...unit, completed: i === 0 })));
    act(() => window.dispatchEvent(new Event(textbook.TEXTBOOK_PROGRESS_EVENT)));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });
  it('opens existing mistake review and refreshes the count on close', async () => {
    vi.spyOn(textbook, 'getMistakeWords').mockReturnValue([textbook.getTextbook().units.flatMap(u => u.vocab)[0]]);
    await show();
    fireEvent.click(screen.getByRole('button', { name: /Повторить трудные слова/ }));
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
    vi.mocked(textbook.getMistakeWords).mockReturnValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(screen.queryByRole('button', { name: /Повторить трудные слова/ })).not.toBeInTheDocument();
    expect(screen.getByText('Здесь появятся слова для повторения после проверки знаний.')).toBeInTheDocument();
  });
  it('keeps a saved game ahead of the first-time tutorial', async () => {
    const store = makeStore(); store.state.settings.hasSeenHowTo = false; store.state.campaignResumeSlug = 'saved-level';
    await show(store);
    fireEvent.click(screen.getByRole('button', { name: /Продолжить игру/ }));
    expect(store.selectCategory).toHaveBeenCalledWith('saved-level');
    expect(store.navigate).not.toHaveBeenCalledWith('howto');
  });
  it('offers visible play and daily actions without opening More', async () => {
    const store = await show();
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать тип игры' }));
    expect(store.navigate).toHaveBeenCalledWith('gameCatalog');
    fireEvent.click(screen.getByRole('button', { name: /Филворд дня/ }));
    expect(store.startDailyGame).toHaveBeenCalledOnce();
  });
  it('lets a failed progress load be retried without leaving Today', async () => {
    vi.mocked(textbook.fetchPracticeLessons).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({});
    await show();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить загрузку' }));
    await act(async () => {});
    expect(textbook.fetchPracticeLessons).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Повторить загрузку' })).not.toBeInTheDocument();
  });
  it('recognizes an ISO local day even with single-digit day or month', async () => {
    const now = new Date();
    const store = makeStore();
    store.state.stats.lastPlayedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await show(store);
    expect(screen.getByText('Цель дня выполнена')).toBeInTheDocument();
  });
});

it('offers theme selection between settings and profile using the existing settings store', async () => {
  const store = await show();
  const trigger = screen.getByRole('button', {name: 'Сменить тему'});
  expect(trigger.previousElementSibling).toBeNull();
  expect(trigger.parentElement?.previousElementSibling).toBe(screen.getByRole('button', {name: 'Открыть настройки'}));
  expect(trigger.parentElement?.nextElementSibling).toBe(screen.getByRole('button', {name: 'Открыть профиль'}));
  fireEvent.click(trigger);
  expect(screen.getByRole('radio', {name: 'Степь'})).toBeChecked();
  fireEvent.click(screen.getByRole('radio', {name: 'Светлая'}));
  expect(store.updateSettings).toHaveBeenCalledWith({theme: 'light'});
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
  expect(store.navigate).not.toHaveBeenCalled();
});
it('closes theme picker with Escape or an outside click without changing settings', async () => {
  const store = await show();
  const trigger = screen.getByRole('button', {name: 'Сменить тему'});
  fireEvent.click(trigger);
  fireEvent.keyDown(document, {key:'Escape'});
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole('group', {name:'Тема оформления'})).not.toBeInTheDocument();
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(store.updateSettings).not.toHaveBeenCalled();
});

import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GameScreen } from './GameScreen';
import { api } from '../services/api';
import type { GameStore } from '../store/gameStore';
const auth = vi.hoisted(() => ({ state: {user:null}, refreshUser: vi.fn() }));
vi.mock('../store/authStore', () => ({useAuth: () => auth}));
vi.mock('../utils/analytics', () => ({trackAnalyticsEventNonBlocking: vi.fn()}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
test('daily game displays the target word list without a campaign or endless session', async () => {
  vi.spyOn(api,'getLevelDifficultyThresholds').mockRejectedValue(new Error('optional'));
  vi.spyOn(api,'trackActivity').mockResolvedValue({} as never);
  vi.spyOn(api,'getDailyWordToday').mockResolvedValue({
    sessionId:'daily-session', date:'2026-10-24', gridSize:2,
    grid:[['А','Б'],['А','А']], words:[{bur:'АБА',rus:'Отец'}],
    wordPlacements:[{bur:'АБА',rus:'Отец',path:[{r:0,c:0},{r:0,c:1},{r:1,c:1}]}],
    timeLimitSeconds:120,
  } as never);
  const store = {state:{gameMode:'daily',settings:{timerEnabled:false}},navigate:vi.fn(),goBack:vi.fn(),
    replaceScreen:vi.fn(),completeEndlessLevel:vi.fn(),recordRoundPlayed:vi.fn(),addToLeaderboard:vi.fn(),
    selectEndlessLevel:vi.fn(),navigateToLevelEditor:vi.fn(),updateSettings:vi.fn()} as unknown as GameStore;
  render(<GameScreen store={store}/>);
  expect(await screen.findByText('Отец')).toBeInTheDocument();
});

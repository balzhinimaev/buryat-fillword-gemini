import { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useGameStore } from '../store/gameStore';
import LevelsScreen from './LevelsScreen';
import GameScreen from './GameScreen';
vi.mock('../store/authStore', () => ({ useAuth: () => ({state:{user:null},refreshUser:vi.fn()}) }));
vi.mock('../utils/analytics', () => ({trackAnalyticsEventNonBlocking:vi.fn()}));
import { api } from '../services/api';

const module = (id: string, order: number, name: string, count: number) => ({
  id, order, title: name, requiredStars: 0, isUnlocked: true, earnedStars: 0, totalStars: count * 3,
  levels: Array.from({ length: count }, (_, i) => ({ id: `${id}-${i}`, slug: `${id}-${i}`, name: i === 0 ? 'Семья и дом' : `${name}: ${i}`, difficulty: 'beginner' as const, requiredStars: 0, isUnlocked: true, earnedStars: 0, maxStars: 3 })),
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function Flow({ direct, realGame = false }: { direct: boolean; realGame?: boolean }) {
  const store = useGameStore();
  const { navigate, setCampaignPreferredModuleId, updateSettings } = store;
  useEffect(() => {
    updateSettings({timerEnabled:false, hasSeenTimerOnboarding:true}, {localOnly:true});
    navigate('gameMode');
    setCampaignPreferredModuleId(direct ? '__chapter2__' : null);
    navigate('levels');
  }, [direct, navigate, setCampaignPreferredModuleId, updateSettings]); // Mount a real navigation chain, then allow screens to unmount/remount.
  if (store.state.currentScreen === 'levels') return <LevelsScreen store={store} />;
  if (store.state.currentScreen === 'game' && realGame) return <GameScreen store={store} />;
  if (store.state.currentScreen === 'game') return <div>
    <h1>Игровое поле</h1>
    <button onClick={store.goBack}>Назад из игры</button>
    <button onClick={() => store.selectCategory('chapter2-1')}>Следующий уровень</button>
    <button onClick={() => store.replaceScreen('levels')}>К списку уровней</button>
  </div>;
  return <div><h1>Режимы филлворда</h1><button onClick={() => { store.setCampaignPreferredModuleId('__chapter2__'); store.navigate('levels'); }}>Глава 2</button></div>;
}
it.each([true, false])('preserves chapter through game remount and subsequent Back (direct=%s)', async direct => {
  vi.spyOn(api, 'getCampaignOverview').mockResolvedValue({ categories: [], modules: [module('chapter1',1,'Первая глава',1), module('chapter2',2,'Вторая глава',24)], totalStars:75, earnedStars:0, progressPercent:0 });
  vi.spyOn(api, 'trackCampaignModuleOpened').mockResolvedValue({ok:true});
  render(<Flow direct={direct} />);
  if (!direct) fireEvent.click(await screen.findByText('Вторая глава'));
  fireEvent.click(await screen.findByText('Семья и дом'));
  expect(screen.getByText('Игровое поле')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Следующий уровень'));
  fireEvent.click(screen.getByText('Назад из игры'));
  await screen.findByText('Вторая глава: 23');
  expect(screen.queryByText('Первая глава')).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Назад'));
  if (!direct) { await screen.findByText('Первая глава'); fireEvent.click(screen.getByLabelText('Назад')); }
  expect(screen.getByRole('heading', {name:'Режимы филлворда'})).toBeInTheDocument();
  fireEvent.click(screen.getByText('Глава 2'));
  fireEvent.click(await screen.findByText('Семья и дом'));
  fireEvent.click(screen.getByText('К списку уровней'));
  await screen.findByText('Вторая глава: 23');
  fireEvent.click(screen.getByLabelText('Назад'));
  expect(screen.getByRole('heading', {name:'Режимы филлворда'})).toBeInTheDocument();
});
it('does not accumulate previous endless games and clears history on Home', () => {
  const {result} = renderHook(() => useGameStore());
  act(() => { result.current.navigate('gameCatalog'); result.current.navigate('gameMode'); result.current.selectLevelPack('pack1'); result.current.selectEndlessLevel(1); });
  act(() => result.current.selectEndlessLevel(2));
  act(() => result.current.goBack());
  expect(result.current.state.currentScreen).toBe('levelPack');
  act(() => result.current.navigate('menu'));
  expect(result.current.state.screenHistory).toEqual([]);
  act(() => result.current.goBack());
  expect(result.current.state.currentScreen).toBe('menu');
});

it.each(['header', 'telegram'])('returns from the actual campaign GameScreen via %s', async back => {
  const handlers = new Set<() => void>();
  vi.stubGlobal('Telegram', {WebApp:{BackButton:{onClick:(fn:()=>void)=>handlers.add(fn),offClick:(fn:()=>void)=>handlers.delete(fn),show:vi.fn(),hide:vi.fn()}}});
  vi.spyOn(api, 'getCampaignOverview').mockResolvedValue({ categories: [], modules: [module('chapter2',2,'Вторая глава',24)], totalStars:72, earnedStars:0, progressPercent:0 });
  vi.spyOn(api, 'getCampaignLevel').mockResolvedValue({id:'family',slug:'chapter2-0', name:'Семья и дом', words:[{bur:'АБА',ru:'Отец'}],gridSize:2,grid:[['А','Б'],['А','А']], wordPlacements:[{bur:'АБА',ru:'Отец',path:[{r:0,c:0},{r:0,c:1},{r:1,c:1}]}]});
  vi.spyOn(api, 'startCampaignLevel').mockResolvedValue({sessionId:'test-session',expiresAt:'2099-01-01'});
  vi.spyOn(api, 'getLevelDifficultyThresholds').mockRejectedValue(new Error('optional'));
  vi.spyOn(api, 'trackActivity').mockResolvedValue({} as never);
  render(<Flow direct realGame />);
  fireEvent.click(await screen.findByText('Семья и дом'));
  await screen.findByText('Отец');
  if (back === 'header') fireEvent.click(screen.getByLabelText('Назад'));
  else { expect(handlers.size).toBe(1); act(() => [...handlers][0]()); }
  await screen.findByText('Вторая глава: 23');
  fireEvent.click(screen.getByLabelText('Назад'));
  expect(screen.getByRole('heading',{name:'Режимы филлворда'})).toBeInTheDocument();
});

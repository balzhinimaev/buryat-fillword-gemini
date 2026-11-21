import { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGameStore } from '../store/gameStore';
import * as api from '../services/api';
import type { LoreItem } from '../services/api';
import LoreArticleScreen from './LoreArticleScreen';
import CommunityLoreScreen from './CommunityLoreScreen';
vi.mock('../store/authStore', () => ({ useAuth: () => ({ state: { user: null } }) }));

const article: LoreItem = {
  _id: 'article1', type: 'story', lessonSlug: '', title: 'Длинная история',
  bodyRu: Array.from({length: 40}, (_, i) => `Абзац ${i}: читаем материал сообщества.`).join('\n'),
  status: 'approved', featured: false, contributorName: 'Автор', createdAt: '2026-11-18', comments: [],
};
const handlers = new Set<() => void>();
let visible = false;
function nativeBack() {
  expect(visible).toBe(true);
  expect(handlers.size).toBe(1);
  act(() => [...handlers][0]());
}
function Flow() {
  const store = useGameStore();
  const { navigate } = store;
  useEffect(() => { navigate('community'); }, [navigate]);
  if (store.state.currentScreen === 'community') return <CommunityLoreScreen store={store} />;
  if (store.state.currentScreen === 'loreArticle') return <LoreArticleScreen store={store} />;
  return <h1>Главная</h1>;
}
beforeEach(() => {
  handlers.clear(); visible = false;
  vi.stubGlobal('Telegram', {WebApp: { BackButton: {
    onClick: (fn: () => void) => handlers.add(fn), offClick: (fn: () => void) => handlers.delete(fn),
    show: () => { visible = true; }, hide: () => { visible = false; },
  }}});
  vi.spyOn(api, 'getCommunityLore').mockResolvedValue([article]);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('returns from a long article to the feed, can reopen it, and hides native Back on Home', async () => {
  vi.spyOn(api, 'getLoreItem').mockResolvedValue(article);
  render(<Flow />);
  for (let n = 0; n < 2; n++) {
    fireEvent.click(await screen.findByText(article.title));
    await screen.findByText('Абзац 39: читаем материал сообщества.');
    fireEvent.scroll(window, {target: {scrollY: 2500}});
    nativeBack();
    await screen.findByRole('heading', {name: 'Из сообщества'});
  }
  nativeBack();
  expect(screen.getByRole('heading', {name: 'Главная'})).toBeInTheDocument();
  expect(visible).toBe(false);
  expect(handlers.size).toBe(0);
});
it.each(['loading', 'error'])('allows native Back while the article is %s', async state => {
  const request = vi.spyOn(api, 'getLoreItem');
  if (state === 'loading') request.mockReturnValue(new Promise(() => {}));
  else request.mockRejectedValue(new Error('offline'));
  render(<Flow />);
  fireEvent.click(await screen.findByText(article.title));
  if (state === 'error') await screen.findByText('Статья не найдена или недоступна офлайн.');
  nativeBack();
  await screen.findByRole('heading', {name:'Из сообщества'});
  nativeBack();
  expect(screen.getByRole('heading', {name:'Главная'})).toBeInTheDocument();
});

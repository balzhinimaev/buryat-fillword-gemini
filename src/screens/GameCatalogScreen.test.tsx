import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { GameStore } from '../store/gameStore';
import GameCatalogScreen from './GameCatalogScreen';
vi.mock('../hooks/useTelegram', () => ({ useBackButton: vi.fn() }));
afterEach(cleanup);
it('separates game types from fillword modes and preserves back navigation', () => {
  const navigate = vi.fn(), goBack = vi.fn();
  render(<GameCatalogScreen store={{ navigate, goBack } as unknown as GameStore} />);
  fireEvent.click(screen.getByRole('button', { name: /Филлворд/ }));
  expect(navigate).toHaveBeenLastCalledWith('gameMode');
  fireEvent.click(screen.getByRole('button', { name: /Викторина по урокам/ }));
  expect(navigate).toHaveBeenLastCalledWith('textbook');
  fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
  expect(goBack).toHaveBeenCalledOnce();
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), request: vi.fn() }));
vi.mock('../store/authStore', () => ({ useAuth: () => ({ state: { user: { _id: 'player', telegramId: 42 } } }) }));
vi.mock('../services/api', () => ({ getReminderConsent: mocks.get, setReminderConsent: mocks.set, activateReferral: vi.fn(), getStoredTokens: vi.fn() }));
import TelegramReminders from './TelegramReminders';
import { ROUND_COMPLETED } from '../services/postGame';
beforeEach(() => {
 localStorage.clear(); vi.clearAllMocks(); mocks.get.mockResolvedValue({ enabled: false }); mocks.set.mockResolvedValue({ enabled: true });
 Object.defineProperty(window, 'Telegram', { configurable: true, value: { WebApp: { requestWriteAccess: mocks.request } } });
});
afterEach(cleanup);
it('does not prompt on launch or request permission without a click', async () => {
 render(<TelegramReminders />);
 await waitFor(() => expect(mocks.get).toHaveBeenCalled());
 expect(screen.queryByText('Напоминать об игре?')).toBeNull();
 expect(mocks.request).not.toHaveBeenCalled();
});
it('offers reminders after completion and persists only an accepted permission', async () => {
 render(<TelegramReminders />);
 await act(async () => { window.dispatchEvent(new Event(ROUND_COMPLETED)); });
 mocks.request.mockImplementation((cb: (value: boolean) => void) => cb(true));
 fireEvent.click(await screen.findByRole('button', { name: 'Напоминать об игре' }));
 await waitFor(() => expect(mocks.set).toHaveBeenCalledWith(true));
});
it('denial dismisses without subscribing, and is not prompted again', async () => {
 const { unmount } = render(<TelegramReminders />);
 await act(async () => { window.dispatchEvent(new Event(ROUND_COMPLETED)); });
 mocks.request.mockImplementation((cb: (value: boolean) => void) => cb(false));
 fireEvent.click(await screen.findByRole('button', { name: 'Напоминать об игре' }));
 await waitFor(() => expect(screen.queryByText('Напоминать об игре?')).toBeNull());
 expect(mocks.set).not.toHaveBeenCalled();
 unmount(); render(<TelegramReminders />);
 await act(async () => { window.dispatchEvent(new Event(ROUND_COMPLETED)); });
 expect(screen.queryByText('Напоминать об игре?')).toBeNull();
});
it('allows revoking reminders in settings without a Telegram popup', async () => {
 mocks.get.mockResolvedValue({ enabled: true }); mocks.set.mockResolvedValue({ enabled: false });
 render(<TelegramReminders settings />);
 fireEvent.click(await screen.findByRole('button', { name: 'Отключить' }));
 await waitFor(() => expect(mocks.set).toHaveBeenCalledWith(false));
 expect(mocks.request).not.toHaveBeenCalled();
});

it('remembers a round completed while the popup is hidden on the game screen', async () => {
 const view = render(<TelegramReminders hidden />);
 await waitFor(() => expect(mocks.get).toHaveBeenCalled());
 await act(async () => { window.dispatchEvent(new Event(ROUND_COMPLETED)); });
 expect(screen.queryByText('Напоминать об игре?')).toBeNull();
 view.rerender(<TelegramReminders hidden={false} />);
 expect(await screen.findByRole('button', { name: 'Напоминать об игре' })).toBeInTheDocument();
});

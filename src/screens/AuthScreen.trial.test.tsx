import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import AuthScreen from './AuthScreen';
import { TRIAL_WORDS } from '../components/trialLesson';

const auth = vi.hoisted(() => ({
  state: { isLoading: false, error: null },
  requestEmailOtp: vi.fn(), verifyEmailOtp: vi.fn(), passwordLogin: vi.fn(), passwordRegister: vi.fn(), passwordReset: vi.fn(), clearError: vi.fn(),
}));
vi.mock('../store/authStore', () => ({ useAuth: () => auth }));
vi.mock('../hooks/useTelegram', () => ({ useTelegram: () => ({ isTelegram: false }) }));
vi.mock('./auth/SocialLoginButtons', () => ({ SocialLoginButtons: () => null }));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it('plays before login, keeps entered email and only marks the tutorial after completion', async () => {
  const complete = vi.fn();
  render(<AuthScreen onTrialComplete={complete} />);
  const email = screen.getByPlaceholderText('you@example.com');
  fireEvent.change(email, { target: { value: 'player@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Попробовать без регистрации' }));
  await screen.findByRole('group', { name: 'Буквы филлворда' });
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
  expect(screen.getByPlaceholderText('you@example.com')).toHaveValue('player@example.com');
  fireEvent.click(screen.getByRole('button', { name: 'Попробовать без регистрации' }));
  for (const word of TRIAL_WORDS) {
    const grid = within(await screen.findByRole('group', { name: 'Буквы филлворда' })).getAllByRole('button');
    word.path.forEach(index => fireEvent.click(grid[index]));
    fireEvent.click(screen.getByRole('button', { name: 'Проверить слово' }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Вода' }));
  fireEvent.click(screen.getByRole('button', { name: 'Перейти ко входу' }));
  expect(complete).toHaveBeenCalledOnce();
  expect(screen.getByPlaceholderText('you@example.com')).toHaveValue('player@example.com');
  expect(auth.passwordLogin).not.toHaveBeenCalled();
  expect(auth.passwordRegister).not.toHaveBeenCalled();
  expect(auth.requestEmailOtp).not.toHaveBeenCalled();
});

it('returns to the caller only after a successful server login', async () => {
  const success = vi.fn();
  auth.passwordLogin.mockResolvedValueOnce(undefined);
  render(<AuthScreen onSuccess={success} />);
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'player@example.com' } });
  fireEvent.change(screen.getByPlaceholderText('минимум 6 символов'), { target: { value: 'example-password' } });
  fireEvent.click(screen.getByRole('button', { name: /^Войти$/ }));
  await vi.waitFor(() => expect(success).toHaveBeenCalledOnce());
});

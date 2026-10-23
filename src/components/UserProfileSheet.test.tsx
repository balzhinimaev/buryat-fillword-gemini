import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { UserProfileSheet } from './UserProfileSheet';
import { api, type UserProfileResponse } from '../services/api';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('profile request ownership', () => {
  it('does not display the previous error while another profile is loading', async () => {
    vi.spyOn(api, 'getUserProfile')
      .mockRejectedValueOnce(new Error('Previous profile failed'))
      .mockImplementationOnce(() => new Promise(() => {}));
    const view = render(<UserProfileSheet userId="first" onClose={() => {}} />);
    await screen.findByText('Previous profile failed');
    view.rerender(<UserProfileSheet userId="second" onClose={() => {}} />);
    expect(screen.queryByText('Previous profile failed')).not.toBeInTheDocument();
    expect(screen.getByText('Загрузка профиля...')).toBeInTheDocument();
  });
  it('ignores a late response from the previous profile', async () => {
    let rejectOld!: (reason: Error) => void;
    const pending = new Promise<UserProfileResponse>((_, reject) => { rejectOld = reject; });
    vi.spyOn(api, 'getUserProfile').mockReturnValueOnce(pending).mockRejectedValueOnce(new Error('Current profile failed'));
    const view = render(<UserProfileSheet userId="first" onClose={() => {}} />);
    view.rerender(<UserProfileSheet userId="second" onClose={() => {}} />);
    await screen.findByText('Current profile failed');
    await act(async () => { rejectOld(new Error('Stale error')); await pending.catch(() => {}); });
    expect(screen.queryByText('Stale error')).not.toBeInTheDocument();
    expect(screen.getByText('Current profile failed')).toBeInTheDocument();
  });
});

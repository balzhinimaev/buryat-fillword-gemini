import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useGameStore } from './gameStore';
import * as api from '../services/api';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
it('keeps guest tutorial completion local while ordinary settings still sync', () => {
  const patch = vi.spyOn(api, 'patchSettings').mockResolvedValue({} as Awaited<ReturnType<typeof api.patchSettings>>);
  const { result } = renderHook(() => useGameStore());
  act(() => result.current.updateSettings({ hasSeenHowTo: true }, { localOnly: true }));
  expect(result.current.state.settings.hasSeenHowTo).toBe(true);
  expect(patch).not.toHaveBeenCalled();
  act(() => result.current.updateSettings({ hasSeenHowTo: true }));
  expect(patch).toHaveBeenCalledOnce();
});

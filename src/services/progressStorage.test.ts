import { beforeEach, expect, test } from 'vitest';
import { prepareOwnerChange, readProgress, writeProgress } from './progressStorage';
import { putHandoff, takeHandoff, _clearHandoff } from './handoffCache';
const login = (owner: string) => {
  prepareOwnerChange();
  localStorage.setItem('auth_tokens', JSON.stringify({ access_token: `a.${btoa(JSON.stringify({sub:owner}))}.c`, refresh_token: owner }));
};
beforeEach(() => { localStorage.clear(); _clearHandoff(); });
test('legacy progress belongs only to the account present at upgrade', () => {
  localStorage.setItem('auth_tokens', JSON.stringify({access_token: `a.${btoa('{"sub":"alice"}')}.c`}));
  localStorage.setItem('learning', 'old progress');
  login('bob');
  expect(readProgress('learning')).toBeNull();
  writeProgress('learning', 'bob progress');
  login('alice');
  expect(readProgress('learning')).toBe('old progress');
  login('bob');
  expect(readProgress('learning')).toBe('bob progress');
});
test('guest achievements are not silently assigned to the next signed-in user', () => {
  localStorage.setItem('learning', 'guest progress');
  login('alice');
  expect(readProgress('learning')).toBeNull();
  localStorage.removeItem('auth_tokens');
  expect(readProgress('learning')).toBe('guest progress');
});
test('prefetched private data cannot be consumed by a different account', async () => {
  login('alice'); putHandoff('overview', Promise.resolve('alice stats'));
  login('bob'); expect(takeHandoff('overview')).toBeNull();
  login('alice'); expect(await takeHandoff('overview')).toBe('alice stats');
});

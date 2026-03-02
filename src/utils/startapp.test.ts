import { describe, expect, it } from 'vitest';
import {
  extractStartAppPayload,
  parseStartAppIntent,
  readStartAppFromSearch,
} from './startapp';

describe('startapp parser', () => {
  it('parses supported intents', () => {
    expect(parseStartAppIntent('daily')).toEqual({ type: 'daily', raw: 'daily' });
    expect(parseStartAppIntent('resume')).toEqual({ type: 'resume', raw: 'resume' });
    expect(parseStartAppIntent('module:sagaan-hara')).toEqual({
      type: 'module',
      moduleId: 'sagaan-hara',
      raw: 'module:sagaan-hara',
    });
  });

  it('ignores unknown/invalid payload', () => {
    expect(parseStartAppIntent('')).toBeNull();
    expect(parseStartAppIntent('abc')).toBeNull();
    expect(parseStartAppIntent('module:   ')).toBeNull();
  });

  it('extracts payload from query first, then telegram start_param', () => {
    expect(readStartAppFromSearch('?a=1&startapp=daily')).toBe('daily');
    expect(readStartAppFromSearch('?start_param=resume')).toBe('resume');

    expect(
      extractStartAppPayload({
        search: '?startapp=daily',
        telegramStartParam: 'resume',
      }),
    ).toBe('daily');

    expect(
      extractStartAppPayload({
        search: '?foo=1',
        telegramStartParam: 'resume',
      }),
    ).toBe('resume');
  });
});

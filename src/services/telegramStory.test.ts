import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { canShareStory, shareInviteStory, shareWinStory } from './telegramStory';

afterEach(() => vi.unstubAllGlobals());
describe('Telegram story media', () => {
  for (const kind of ['invite', 'win'] as const) {
    it(`passes a shipped HTTPS PNG for ${kind} to the native editor`, () => {
      const shareToStory = vi.fn();
      vi.stubGlobal('Telegram', { WebApp: { shareToStory, isVersionAtLeast: () => true } });
      expect(canShareStory()).toBe(true);
      if (kind === 'win') shareWinStory({ stars: 3, wordsFound: 5, levelName: 'Семья', seconds: 94 }, 'example');
      else shareInviteStory('example');
      const [url, params] = shareToStory.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.origin).toBe('https://buryat-game.ru');
      if (kind === 'win') {
        expect(parsed.pathname).toBe('/api/share/story.png');
        expect(Object.fromEntries(parsed.searchParams)).toEqual({ title: 'Семья', words: '5', stars: '3', seconds: '94' });
      } else {
        const png = readFileSync(`public/${parsed.pathname.slice('/webapp/'.length)}`);
        expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
        expect(png.readUInt32BE(16)).toBe(1080);
        expect(png.readUInt32BE(20)).toBe(1920);
      }
      expect(params.widget_link.url).toContain('startapp=ref_example');
    });
  }
});

import { beforeEach, describe, expect, it } from 'vitest';
import { localStreak, localXpInfo } from './localStats';

const GAME_KEY = 'buryat_fillword_game';

const dayKey = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const setStats = (stats: Record<string, unknown>) => {
  localStorage.setItem(GAME_KEY, JSON.stringify({ stats }));
};

beforeEach(() => localStorage.clear());

describe('localStreak', () => {
  it('пустое хранилище → нулевая серия', () => {
    const s = localStreak();
    expect(s.current).toBe(0);
    expect(s.longest).toBe(0);
    expect(s.isActive).toBe(false);
  });

  it('играли сегодня → серия активна', () => {
    setStats({ currentStreak: 4, longestStreak: 7, lastPlayedDate: dayKey(0) });
    const s = localStreak();
    expect(s.current).toBe(4);
    expect(s.longest).toBe(7);
    expect(s.isActive).toBe(true);
  });

  it('играли вчера → серия жива, но неактивна сегодня', () => {
    setStats({ currentStreak: 4, longestStreak: 7, lastPlayedDate: dayKey(-1) });
    const s = localStreak();
    expect(s.current).toBe(4);
    expect(s.isActive).toBe(false);
  });

  it('пропущен день → серия обнуляется в отображении', () => {
    setStats({ currentStreak: 4, longestStreak: 7, lastPlayedDate: dayKey(-3) });
    const s = localStreak();
    expect(s.current).toBe(0);
    expect(s.longest).toBe(7);
  });
});

describe('localXpInfo', () => {
  it('считает уровень и прогресс от локального XP', () => {
    setStats({ xp: 250 });
    const xp = localXpInfo();
    expect(xp.total).toBe(250);
    expect(xp.level).toBe(3);
    expect(xp.xpInCurrentLevel).toBe(50);
    expect(xp.xpRemainingToNextLevel).toBe(50);
    expect(xp.progressPercent).toBe(50);
  });

  it('пустое хранилище → 1 уровень, 0 XP', () => {
    const xp = localXpInfo();
    expect(xp.total).toBe(0);
    expect(xp.level).toBe(1);
  });
});

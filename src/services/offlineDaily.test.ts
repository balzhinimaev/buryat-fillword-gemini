import { beforeEach, describe, expect, it } from 'vitest';
import {
  offlineDailyDateKey,
  offlineDailyWords,
  offlineGetDailyToday,
  offlineSubmitDaily,
  offlineDailyTotals,
} from './offlineDaily';

beforeEach(() => localStorage.clear());

describe('offlineDailyWords — детерминизм', () => {
  it('одна дата → один и тот же набор слов', () => {
    const a = offlineDailyWords('2026-07-02');
    const b = offlineDailyWords('2026-07-02');
    expect(a).toEqual(b);
    expect(a.length).toBe(6);
  });

  it('разные даты → разные наборы', () => {
    const a = offlineDailyWords('2026-07-02').map(w => w.bur);
    const b = offlineDailyWords('2026-07-03').map(w => w.bur);
    expect(a).not.toEqual(b);
  });

  it('слова влезают в сетку и без дублей', () => {
    const words = offlineDailyWords('2026-01-15');
    const burs = words.map(w => w.bur);
    expect(new Set(burs).size).toBe(burs.length);
    for (const w of words) {
      expect(w.bur.length).toBeGreaterThanOrEqual(3);
      expect(w.bur.length).toBeLessThanOrEqual(7);
      expect(w.rus.length).toBeGreaterThan(0);
    }
  });
});

describe('offlineGetDailyToday', () => {
  it('отдаёт пазл на сегодня без результата', () => {
    const d = offlineGetDailyToday();
    expect(d.date).toBe(offlineDailyDateKey());
    expect(d.words.length).toBe(6);
    expect(d.gridSize).toBe(7);
    expect(d.currentStars).toBeNull();
    expect(d.sessionId).toContain('offd_');
  });
});

describe('offlineSubmitDaily — звёзды и локальный рекорд', () => {
  it('все слова быстро → 3 звезды, результат сохраняется', () => {
    const d = offlineGetDailyToday();
    const res = offlineSubmitDaily({
      sessionId: d.sessionId,
      timeSeconds: 30,
      foundWords: d.words.map(w => w.bur),
    });
    expect(res.earnedStars).toBe(3);
    expect(res.success).toBe(true);
    expect(res.wordsFound).toBe(6);
    expect(res.missedWords).toEqual([]);

    const again = offlineGetDailyToday();
    expect(again.currentStars).toBe(3);
    expect(again.bestTimeSeconds).toBe(30);

    const totals = offlineDailyTotals();
    expect(totals.stars).toBe(3);
    expect(totals.completedDays).toBe(1);
  });

  it('частично <60% → 0 звёзд, попытка учтена', () => {
    const d = offlineGetDailyToday();
    const res = offlineSubmitDaily({
      sessionId: d.sessionId,
      timeSeconds: 100,
      foundWords: d.words.slice(0, 2).map(w => w.bur),
    });
    expect(res.earnedStars).toBe(0);
    expect(res.attemptNumber).toBe(1);
    expect(offlineGetDailyToday().currentStars).toBe(0);
  });

  it('повторная попытка не ухудшает рекорд', () => {
    const d = offlineGetDailyToday();
    offlineSubmitDaily({ sessionId: d.sessionId, timeSeconds: 30, foundWords: d.words.map(w => w.bur) });
    const worse = offlineSubmitDaily({ sessionId: d.sessionId, timeSeconds: 119, foundWords: d.words.slice(0, 4).map(w => w.bur) });
    expect(worse.earnedStars).toBe(1);
    const rec = offlineGetDailyToday();
    expect(rec.currentStars).toBe(3);
    expect(rec.bestTimeSeconds).toBe(30);
  });
});

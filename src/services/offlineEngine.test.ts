import { beforeEach, describe, expect, it } from 'vitest';
import {
  offlineLevelParams,
  offlineGetLevel,
  offlineGetProgress,
  offlineSubmit,
} from './offlineEngine';

beforeEach(() => {
  localStorage.clear();
});

describe('offlineLevelParams', () => {
  it('держит параметры в допустимых границах и не убывает по сложности', () => {
    let prevGrid = 0;
    let prevWc = 0;
    let prevDiff = 0;
    let prevTime = Infinity;
    for (let n = 1; n <= 30; n++) {
      const p = offlineLevelParams(n);
      expect(p.gridSize).toBeGreaterThanOrEqual(5);
      expect(p.gridSize).toBeLessThanOrEqual(9);
      expect(p.wordCount).toBeGreaterThanOrEqual(4);
      expect(p.wordCount).toBeLessThanOrEqual(10);
      expect(p.maxDifficulty).toBeGreaterThanOrEqual(2);
      expect(p.maxDifficulty).toBeLessThanOrEqual(9);
      expect(p.timeLimitSeconds).toBeGreaterThanOrEqual(60);
      // монотонность (не убывает grid/wc/diff, не растёт время)
      expect(p.gridSize).toBeGreaterThanOrEqual(prevGrid);
      expect(p.wordCount).toBeGreaterThanOrEqual(prevWc);
      expect(p.maxDifficulty).toBeGreaterThanOrEqual(prevDiff);
      expect(p.timeLimitSeconds).toBeLessThanOrEqual(prevTime);
      prevGrid = p.gridSize; prevWc = p.wordCount; prevDiff = p.maxDifficulty; prevTime = p.timeLimitSeconds;
    }
  });
});

describe('offlineGetLevel', () => {
  it('возвращает слова, помещающиеся в сетку, и валидный sessionId', () => {
    for (const n of [1, 5, 10, 20, 30]) {
      const lvl = offlineGetLevel(n);
      expect(lvl.levelNumber).toBe(n);
      expect(lvl.words.length).toBeGreaterThan(0);
      expect(lvl.words.length).toBeLessThanOrEqual(offlineLevelParams(n).wordCount);
      expect(lvl.sessionId).toBeTruthy();
      // буквы влезают в сетку
      const letters = lvl.words.reduce((s, w) => s + w.bur.length, 0);
      expect(letters).toBeLessThanOrEqual(lvl.gridSize * lvl.gridSize);
      // слова с переводом
      lvl.words.forEach((w) => {
        expect(w.bur.length).toBeGreaterThanOrEqual(2);
        expect(w.rus.length).toBeGreaterThan(0);
      });
    }
  });
});

describe('offlineSubmit — звёзды и отсутствие hard-lock', () => {
  function total(n: number) {
    const lvl = offlineGetLevel(n);
    return { sessionId: lvl.sessionId, count: lvl.words.length, limit: lvl.timeLimitSeconds, words: lvl.words.map((w) => w.bur) };
  }

  it('полное прохождение быстро → 3 звезды', () => {
    const { sessionId, count, limit, words } = total(1);
    const r = offlineSubmit(1, { sessionId, timeSeconds: Math.floor(limit * 0.3), foundWords: words });
    expect(r.earnedStars).toBe(3);
    expect(r.wordsFound).toBe(count);
  });

  it('полное прохождение медленно (на грани лимита) → 2 звезды', () => {
    const { sessionId, limit, words } = total(2);
    const r = offlineSubmit(2, { sessionId, timeSeconds: limit - 1, foundWords: words });
    expect(r.earnedStars).toBe(2);
  });

  it('полное прохождение сверх лимита → 1 звезда', () => {
    const { sessionId, limit, words } = total(3);
    const r = offlineSubmit(3, { sessionId, timeSeconds: limit + 50, foundWords: words });
    expect(r.earnedStars).toBe(1);
  });

  it('частичное ≥60% → 1 звезда (прогрессия не застревает)', () => {
    const { sessionId, count, limit, words } = total(4);
    const need = Math.ceil(count * 0.6);
    const r = offlineSubmit(4, { sessionId, timeSeconds: Math.floor(limit * 0.4), foundWords: words.slice(0, need) });
    expect(r.earnedStars).toBeGreaterThanOrEqual(1);
  });

  it('меньше 60% → 0 звёзд', () => {
    const { sessionId, count, limit, words } = total(5);
    const few = Math.max(0, Math.floor(count * 0.4));
    const r = offlineSubmit(5, { sessionId, timeSeconds: Math.floor(limit * 0.4), foundWords: words.slice(0, few) });
    expect(r.earnedStars).toBe(0);
  });
});

describe('offlineGetProgress — прогрессия открывается', () => {
  it('после прохождения уровня открывается следующий', () => {
    const lvl = offlineGetLevel(1);
    offlineSubmit(1, { sessionId: lvl.sessionId, timeSeconds: 5, foundWords: lvl.words.map((w) => w.bur) });
    const prog = offlineGetProgress();
    expect(prog.maxCompletedLevel).toBe(1);
    expect(prog.maxUnlockedLevel).toBe(2);
    expect(prog.totalStars).toBeGreaterThanOrEqual(1);
  });

  it('пустой прогресс → открыт только 1-й уровень', () => {
    const prog = offlineGetProgress();
    expect(prog.maxUnlockedLevel).toBe(1);
    expect(prog.maxCompletedLevel).toBe(0);
  });
});

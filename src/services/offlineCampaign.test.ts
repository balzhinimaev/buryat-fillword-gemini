import { beforeEach, describe, expect, it } from 'vitest';
import {
  offlineGetCampaignOverview,
  offlineGetCampaignLevel,
  offlineStartCampaignLevel,
  offlineSubmitCampaignLevel,
} from './offlineCampaign';

beforeEach(() => localStorage.clear());

describe('offlineGetCampaignOverview', () => {
  it('возвращает модули с уроками и пустые categories', () => {
    const ov = offlineGetCampaignOverview();
    expect(ov.categories).toEqual([]);
    expect((ov.modules ?? []).length).toBeGreaterThanOrEqual(6);
    const totalLevels = (ov.modules ?? []).reduce((s, m) => s + m.levels.length, 0);
    expect(totalLevels).toBe(31);
    // первый урок каждого модуля открыт (requiredStars 0)
    for (const m of ov.modules ?? []) {
      expect(m.isUnlocked).toBe(true);
      const first = m.levels.find(l => (l.requiredStars ?? 0) === 0);
      expect(first?.isUnlocked).toBe(true);
    }
  });
});

describe('offlineGetCampaignLevel', () => {
  it('отдаёт сетку + слова + размещения с переводом', () => {
    const ov = offlineGetCampaignOverview();
    const slug = ov.modules![0].levels[0].slug;
    const lvl = offlineGetCampaignLevel(slug);
    expect(lvl.slug).toBe(slug);
    expect(lvl.words.length).toBeGreaterThan(0);
    expect(lvl.gridSize).toBeGreaterThanOrEqual(5);
    expect(lvl.grid?.length).toBe(lvl.gridSize);
    expect(lvl.wordPlacements?.length).toBe(lvl.words.length);
    // у каждого размещения есть перевод и путь
    for (const wp of lvl.wordPlacements ?? []) {
      expect(wp.bur.length).toBeGreaterThan(0);
      expect(wp.ru.length).toBeGreaterThan(0);
      expect(wp.path.length).toBe(wp.bur.length);
    }
    // идеальная заливка
    const cap = (lvl.gridSize ?? 0) ** 2;
    const sum = lvl.words.reduce((s, w) => s + w.bur.length, 0);
    expect(sum).toBe(cap);
  });
});

describe('offlineSubmitCampaignLevel — звёзды и прогресс', () => {
  it('полное прохождение быстро → 3 звезды + открывает следующий', () => {
    const ov = offlineGetCampaignOverview();
    const mod = ov.modules![0];
    const l1 = mod.levels[0];
    const lvl = offlineGetCampaignLevel(l1.slug);
    const start = offlineStartCampaignLevel(l1.slug);
    expect(start.sessionId).toBeTruthy();
    const res = offlineSubmitCampaignLevel(l1.slug, {
      sessionId: start.sessionId,
      timeSeconds: 5,
      foundWords: lvl.words.map(w => w.bur),
    });
    expect(res.earnedStars).toBe(3);
    expect(res.success).toBe(true);
    // прогресс сохранился
    const ov2 = offlineGetCampaignOverview();
    expect(ov2.earnedStars).toBe(3);
    expect(ov2.modules![0].levels[0].earnedStars).toBe(3);
    // следующий урок (req 3) разблокировался
    const l2 = ov2.modules![0].levels.find(l => l.requiredStars === 3);
    expect(l2?.isUnlocked).toBe(true);
  });

  it('частичное <60% → 0 звёзд', () => {
    const ov = offlineGetCampaignOverview();
    const slug = ov.modules![0].levels[0].slug;
    const lvl = offlineGetCampaignLevel(slug);
    const few = lvl.words.slice(0, Math.max(0, Math.floor(lvl.words.length * 0.4))).map(w => w.bur);
    const res = offlineSubmitCampaignLevel(slug, { timeSeconds: 10, foundWords: few });
    expect(res.earnedStars).toBe(0);
  });
});

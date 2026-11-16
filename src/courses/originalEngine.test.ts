import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { chooseCourse, completeCourseLesson, completedLessons } from './progress';
import { czechCourse } from './czech';
import { englishCourse } from './english';
import { activeCourseId, courseGridRules, courseLetters } from './activeCourse';
import { generateServerLevel, findWordByPath } from '../gameEngine';
import { offlineGetCampaignLevel, offlineGetCampaignOverview, offlineStartCampaignLevel, offlineSubmitCampaignLevel } from '../services/offlineCampaign';
import { getTextbook, markTheoryRead, isTheoryRead, saveQuizResult, getUnitStatuses, buildQuiz } from '../services/textbook';
import { api, apiRequest } from '../services/api';
import { getAllWords } from '../services/offlineDict';
import { readProgress, writeProgress } from '../services/progressStorage';
import { readClassicDraft, saveClassicDraft } from './classicDraft';
import { writeDraft, draftBoard } from './draft';

beforeEach(() => { localStorage.clear(); chooseCourse('bua-ru'); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network must not be used'))); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('preserves the original Buryat curriculum, downloaded campaigns and exact storage keys', () => {
  const before = getTextbook();
  const original = offlineGetCampaignOverview();
  expect(original.modules!.flatMap(m => m.levels)).toHaveLength(31);
  writeProgress('offline_campaign_levels', JSON.stringify({ 'nature-1': { stars: 3, attempts: 4 } }));
  markTheoryRead(before.units[0].slug);
  const saved = readProgress('offline_campaign_levels');
  chooseCourse('en-ru'); markTheoryRead('home');
  expect(getAllWords()).toHaveLength(48);
  expect(offlineGetCampaignOverview().earnedStars).toBe(0);
  chooseCourse('bua-ru');
  expect(getTextbook()).toEqual(before);
  expect(isTheoryRead(before.units[0].slug)).toBe(true);
  expect(readProgress('offline_campaign_levels')).toBe(saved);
  expect(offlineGetCampaignOverview().earnedStars).toBe(3);
  localStorage.setItem('offline_campaign_content', JSON.stringify([{ id: 'server-extra', title: 'Новая глава', order: 9, requiredStars: 0,
    lessons: [{ slug: 'server-extra-1', words: [{ bur: 'ГЭР', ru: 'Дом' }], mapVariants: [], maxStars: 3 }] }]));
  expect(offlineGetCampaignOverview().modules![0].levels[0].slug).toBe('server-extra-1');
});

it.each([czechCourse, englishCourse])('uses original textbook, quiz, stars and daily/level modes for $title without Buryat API calls', async course => {
  chooseCourse(course.id as 'cs-ru' | 'en-ru');
  const textbook = getTextbook();
  expect(textbook.units).toHaveLength(8);
  const unit = textbook.units[0];
  expect(buildQuiz(unit)).toHaveLength(6);
  markTheoryRead(unit.slug); saveQuizResult(unit.slug, 6, 6);
  const level = await api.getCampaignLevel(unit.practiceSlugs[0]);
  const start = await api.startCampaignLevel(level.slug);
  const result = await api.submitCampaignLevel(level.slug, { sessionId: start.sessionId, timeSeconds: 20, foundWords: level.words.map(w => w.bur) });
  expect(result.earnedStars).toBe(3);
  expect(getUnitStatuses({ [level.slug]: 3 })[0].completed).toBe(true);
  expect(completedLessons(undefined, course)).toEqual([unit.slug]);
  expect((await api.getCampaignOverview()).earnedStars).toBe(3);
  for (const number of [1, 6, 7, 17, 40, 200]) {
    const game = await api.getLevelModeLevel(number);
    const board = generateServerLevel(game.gridSize!, game.words.map(w => ({ bur: w.bur, ru: w.rus })), courseGridRules());
    expect(board.placedWords).toHaveLength(game.words.length);
  }
  const daily = await api.getDailyWordToday();
  expect(daily.words.length).toBeGreaterThan(0);
  expect(daily.words.every(w => /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]+$/u.test(w.bur))).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
  chooseCourse(course.id === 'en-ru' ? 'cs-ru' : 'en-ru');
  expect(offlineGetCampaignOverview().earnedStars).toBe(0);
  expect(isTheoryRead(unit.slug)).toBe(false);
});

it('keeps prior course completion as completed practice without inventing stars or passing a quiz', () => {
  chooseCourse('en-ru'); completeCourseLesson('home', undefined, englishCourse);
  const status = getUnitStatuses({}).find(s => s.unit.slug === 'home')!;
  expect(status.practiceDone).toBe(true);
  expect(status.practiceStars).toBe(0); expect(status.quizPassed).toBe(false);
  expect(offlineGetCampaignOverview().earnedStars).toBe(0);
});

it('keeps Czech CH in one cell, English C/H separate, and all paths valid in the original engine', () => {
  for (const course of [czechCourse, englishCourse]) {
    chooseCourse(course.id as 'cs-ru' | 'en-ru');
    for (let run = 0; run < 8; run++) for (const lesson of course.lessons) {
      const words = lesson.words.map(w => ({ bur: w.text, ru: w.ru }));
      const size = Math.max(4, Math.ceil(Math.sqrt(words.reduce((n, w) => n + courseLetters(w.bur).length, 0))));
      const board = generateServerLevel(size, words, courseGridRules());
      const cells = new Set<string>();
      expect(board.placedWords).toHaveLength(6);
      for (const p of board.placedWords) {
        expect(p.path.map(c => board.grid[c.r][c.c]).join('')).toBe(p.word.bur);
        expect(findWordByPath(board.placedWords, p.path)?.word).toEqual(p.word);
        expect(p.path).toHaveLength(courseLetters(p.word.bur).length);
        p.path.forEach((c, i) => { const id = `${c.r}:${c.c}`; expect(cells.has(id)).toBe(false); cells.add(id);
          if (i) expect(Math.abs(p.path[i-1].r-c.r)+Math.abs(p.path[i-1].c-c.c)).toBe(1); });
      }
      expect(board.grid.flat().every(c => course.alphabet.includes(c))).toBe(true);
    }
    expect(courseLetters('CH')).toHaveLength(course.id === 'cs-ru' ? 1 : 2);
  }
});

it('restores the old saved board and words in the original screen format, without rewriting the backup', () => {
  chooseCourse('cs-ru'); const lesson = czechCourse.lessons[3];
  writeDraft(lesson, 42, [lesson.words[0].id], 'guest', czechCourse, 2);
  const old = draftBoard(lesson, 42, czechCourse, 2);
  const restored = readClassicDraft('food')!;
  expect(restored.board.grid).toEqual(old.grid);
  expect(restored.found).toEqual([lesson.words[0].text.toUpperCase()]);
  saveClassicDraft('food', restored.board, restored.found, 17);
  expect(offlineGetCampaignLevel('food').grid).toEqual(old.grid);
  expect(readClassicDraft('food')?.time).toBe(17);
  chooseCourse('en-ru'); expect(readClassicDraft('food')).toBeNull();
  chooseCourse('cs-ru');
  localStorage.setItem('auth_tokens', JSON.stringify({ access_token: `x.${btoa(JSON.stringify({ sub: 'second-user' }))}.x` }));
  chooseCourse('cs-ru'); expect(readClassicDraft('food')).toBeNull();
  expect(offlineGetCampaignOverview().earnedStars).toBe(0);
});

it('does not let another tab change the course of an active game', () => {
  chooseCourse('cs-ru'); writeProgress('learning-course:selected', 'en-ru');
  expect(activeCourseId()).toBe('cs-ru');
});

it('rejects stale sessions, duplicate words and unintended Buryat writes from another course', async () => {
  chooseCourse('en-ru'); const level = offlineGetCampaignLevel('home'); const session = offlineStartCampaignLevel('home');
  expect(() => offlineSubmitCampaignLevel('home', { sessionId: session.sessionId, timeSeconds: 1, foundWords: [level.words[0].bur, level.words[0].bur] })).toThrow();
  const body = { sessionId: session.sessionId, timeSeconds: 15, foundWords: level.words.map(w => w.bur) };
  offlineSubmitCampaignLevel('home', body);
  expect(() => offlineSubmitCampaignLevel('home', body)).toThrow();
  await expect(apiRequest('/campaign/sync-progress', { method: 'POST' })).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});

it('does not apply a pending local request after switching course', async () => {
  chooseCourse('en-ru');
  const pending = api.startCampaignLevel('home');
  chooseCourse('cs-ru');
  await expect(pending).rejects.toThrow('Аккаунт или курс изменился');
  expect(readProgress('course:cs-ru:offline_campaign_sessions')).toBeNull();
});

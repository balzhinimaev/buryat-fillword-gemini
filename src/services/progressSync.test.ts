import { beforeEach, expect, test, vi } from 'vitest';
const api = vi.hoisted(() => ({ complete: vi.fn(), state: vi.fn(), request: vi.fn() }));
vi.mock('./api', () => ({
  getStoredTokens: () => ({access_token:'token', refresh_token:'refresh'}),
  completeTextbookLesson: api.complete,
  getTextbookMyState: api.state,
  apiRequest: api.request,
}));
import { readProgress, writeProgress } from './progressStorage';
import { syncTextbookProgress, saveQuizResult, getQuizBest, isTheoryRead } from './textbook';
import { syncCampaignProgress } from './offlineSync';
const key = 'burlive_textbook_progress';
const login = (owner: string) => localStorage.setItem('auth_tokens', JSON.stringify({access_token:`a.${btoa(JSON.stringify({sub:owner}))}.c`}));
const answers = [{word:'АБА',answer:'АБА'}];
beforeEach(() => {
  localStorage.clear(); login('alice'); vi.clearAllMocks();
  api.state.mockResolvedValue({progress:{}}); api.complete.mockResolvedValue({xpGained:0});
  Object.defineProperty(navigator, 'onLine', {configurable:true, value:true});
});
test('failed quiz delivery stays queued across reload, retry acknowledges only after success', async () => {
  api.complete.mockRejectedValueOnce(new Error('response lost'));
  saveQuizResult('family', 8, 8, answers);
  await syncTextbookProgress();
  expect(JSON.parse(readProgress(key)! ).family.pendingQuiz).toBeTruthy();
  await syncTextbookProgress();
  expect(api.complete).toHaveBeenCalledTimes(2);
  expect(JSON.parse(readProgress(key)!).family.pendingQuiz).toBeUndefined();
  expect(getQuizBest('family')).toEqual({correct:8,total:8});
});
test('pre-upgrade progress is recovered once without inventing quiz answers', async () => {
  writeProgress(key, JSON.stringify({family:{theoryReadAt:'2026-10-01',quizPassedAt:'2026-10-01'}}));
  await syncTextbookProgress(); await syncTextbookProgress();
  expect(api.complete).toHaveBeenCalledTimes(2);
  expect(api.complete).toHaveBeenCalledWith('family','quiz',undefined);
});
test('new device restores remote results and keeps a newer local best', async () => {
  api.state.mockResolvedValue({progress:{family:{theoryReadAt:'2026-10-01',quizPassedAt:'2026-10-01',quizBest:{correct:6,total:8}}}});
  await syncTextbookProgress();
  expect(isTheoryRead('family')).toBe(true);
  expect(getQuizBest('family')).toEqual({correct:6,total:8});
  saveQuizResult('family',8,8,answers); await syncTextbookProgress();
  expect(getQuizBest('family')).toEqual({correct:8,total:8});
});
test('old acknowledgement cannot erase a newer queued quiz result', async () => {
  let release!: (v: object) => void;
  api.complete.mockImplementationOnce(() => new Promise(r => {release=r;}));
  saveQuizResult('family',6,8,answers);
  const sync = syncTextbookProgress();
  saveQuizResult('family',8,8,answers);
  release({xpGained:0}); await sync;
  expect(JSON.parse(readProgress(key)!).family.pendingQuiz).toBeTruthy();
  await syncTextbookProgress();
  expect(api.complete).toHaveBeenCalledTimes(2);
});
test('late restore after account change does not contaminate the new account', async () => {
  let release!: (v: object) => void;
  api.state.mockImplementationOnce(() => new Promise(r => {release=r;}));
  const sync = syncTextbookProgress(); login('bob');
  release({progress:{family:{theoryReadAt:'2026-10-01'}}}); await sync;
  expect(isTheoryRead('family')).toBe(false);
});
test('campaign sync merges a round finished while the request was in flight', async () => {
  const key = 'offline_campaign_levels';
  writeProgress(key,JSON.stringify({family:{stars:1,bestTimeSeconds:80}}));
  let release!: (v: object) => void;
  api.request.mockImplementationOnce(() => new Promise(r => {release=r;}));
  const sync = syncCampaignProgress();
  writeProgress(key,JSON.stringify({family:{stars:3,bestTimeSeconds:25},numbers:{stars:2}}));
  release([{slug:'family',stars:2,bestTimeSeconds:50}]); await sync;
  expect(JSON.parse(readProgress(key)!)).toMatchObject({family:{stars:3,bestTimeSeconds:25},numbers:{stars:2}});
});
test('campaign response cannot cross accounts', async () => {
  let release!: (v: object) => void;
  api.request.mockImplementationOnce(() => new Promise(r => {release=r;}));
  const sync = syncCampaignProgress(); login('bob');
  release([{slug:'family',stars:3}]); await sync;
  expect(readProgress('offline_campaign_levels')).toBeNull();
});

test('a worse retry does not replace a better quiz still waiting to upload', async () => {
  let release!: (v: object) => void;
  api.complete.mockImplementationOnce(() => new Promise(r => {release=r;}));
  const bestAnswers = [{word:'АБА',answer:'АБА'}, {word:'ЭЖЫ',answer:'ЭЖЫ'}];
  saveQuizResult('family',8,8,bestAnswers);
  const sync = syncTextbookProgress();
  saveQuizResult('family',6,8,answers);
  expect(JSON.parse(readProgress(key)!).family.pendingQuiz.answers).toEqual(bestAnswers);
  release({xpGained:0}); await sync;
});

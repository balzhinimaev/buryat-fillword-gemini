import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import * as api from './api';
import { chooseCourse } from '../courses/progress';
import { activeCourseId, courseWords } from '../courses/activeCourse';
import { progressOwner, writeProgress, readProgress } from './progressStorage';
import { claimContributions, recoverableQueue, loadQueue, queueStats, submitWordOfflineAware, syncQueue } from './contribSync';
import { syncLore } from './offlineLore';
vi.mock('../config/offline', () => ({ OFFLINE: true, isNetOnline: () => navigator.onLine }));
const token = (owner: string) => `test.${btoa(JSON.stringify({ sub: owner }))}.fixture`;
const login = (owner: string) => api.setStoredTokens({ access_token: token(owner), refresh_token: 'refresh-fixture' });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const data = { bur: 'ТЕСТ', ru: 'test' };
const sid = '1234567890abcdef12345678';
const item = (localId = 'q1', extra = {}) => ({ localId, owner: 'owner-a', course: 'bua-ru', data, createdAt: '2026-11-20', state: 'queued', ...extra });
const seed = (items: unknown[]) => localStorage.setItem('burlive_contrib_queue', JSON.stringify(items));
const deferred = () => { let resolve!: (r: Response) => void; const promise = new Promise<Response>(r => { resolve = r; }); return { promise, resolve }; };
beforeEach(() => {
  localStorage.clear(); login('owner-a'); chooseCourse('bua-ru');
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Test network disabled')));
});
afterEach(() => { api.clearStoredTokens(); localStorage.clear(); chooseCourse('bua-ru'); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('empty startup neither registers a device nor changes guest progress/course', async () => {
  api.clearStoredTokens(); chooseCourse('en-ru'); writeProgress('book-test', 'saved');
  await syncQueue(); expect(fetch).not.toHaveBeenCalled(); expect(progressOwner()).toBe('guest'); expect(activeCourseId()).toBe('en-ru'); expect(readProgress('book-test')).toBe('saved');
});
it('does not reuse legacy device credentials or register after logout', async () => {
  api.clearStoredTokens(); localStorage.setItem('burlive_sync_device', 'legacy-fixture'); await syncQueue(); expect(fetch).not.toHaveBeenCalled(); expect(localStorage.getItem('burlive_sync_device')).toBe('legacy-fixture');
});
it('owner A queued words are not submitted by B', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false); await submitWordOfflineAware(data);
  login('owner-b'); chooseCourse('bua-ru'); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  await syncQueue(); expect(fetch).not.toHaveBeenCalled(); expect(loadQueue()).toEqual([]); expect(loadQueue('owner-a')).toHaveLength(1);
});
it.each(['en-ru', 'cs-ru'] as const)('course %s preserves queued words without increasing failures', async course => {
  seed([item()]); chooseCourse(course); for (let i=0;i<4;i++) await syncQueue();
  expect(loadQueue()[0]).toMatchObject({ state: 'queued' }); expect(loadQueue()[0].attempts).toBeUndefined(); expect(fetch).not.toHaveBeenCalled();
});
it('stops after account change; no remaining request is made as the new owner', async () => {
  seed([item(), item('q2')]); const pending = deferred(); vi.mocked(fetch).mockImplementation(() => pending.promise);
  const work = syncQueue(); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  login('owner-b'); chooseCourse('bua-ru'); pending.resolve(json({ _id: sid, status: 'pending' }));
  expect(await work).toMatchObject({ reason: 'account-change' }); expect(fetch).toHaveBeenCalledTimes(1);
  expect(loadQueue('owner-a')[0]).toMatchObject({ state: 'queued', needsReview: true }); expect(loadQueue('owner-a')[1].attempts).toBeUndefined();
});
it('preserves a newly queued word while older request completes', async () => {
  seed([item()]); const pending = deferred(); vi.mocked(fetch).mockImplementation(() => pending.promise);
  const work = syncQueue(); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false); await submitWordOfflineAware({ ...data, bur: 'НОВОЕ' });
  pending.resolve(json({ _id: sid, status: 'pending' })); await work;
  expect(loadQueue()).toHaveLength(2); expect(loadQueue()[1]).toMatchObject({ data: { bur: 'НОВОЕ' }, state: 'queued' });
});
it('coalesces simultaneous pushes into one POST', async () => {
  seed([item()]); const pending = deferred(); vi.mocked(fetch).mockImplementation(() => pending.promise);
  const a=syncQueue(), b=syncQueue(); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1)); pending.resolve(json({ _id: sid, status: 'pending' })); await Promise.all([a,b]); expect(fetch).toHaveBeenCalledTimes(1);
});
it.each(['verified','rejected'])('reads server moderation %s, bypassing synthesized local status', async status => {
  seed([item('q1',{serverId:sid,state:'synced'})]); localStorage.setItem('burlive_dict_extra',JSON.stringify([{id:sid,bur:'ТЕСТ',ru:'test',difficulty:2}]));
  vi.mocked(fetch).mockResolvedValue(json({word:{_id:sid,status}})); await syncQueue(); expect(loadQueue()[0].state).toBe(status); expect(fetch).toHaveBeenCalledTimes(1);
});
it('server failures never turn an unsent word into rejected or synced', async () => {
  seed([item()]); vi.mocked(fetch).mockImplementation(async () => json({message:'temporary'},500));
  for(let i=0;i<4;i++) await syncQueue(); expect(loadQueue()[0]).toMatchObject({state:'queued',attempts:4}); expect(queueStats()).toMatchObject({pending:1,synced:0,errors:1});
});
it('old unowned rejected words require explicit selection and keep a migration backup', async () => {
  seed([item('old',{owner:undefined,state:'rejected',attempts:3}),item('other',{owner:'owner-b'})]);
  await syncQueue(); expect(fetch).not.toHaveBeenCalled(); expect(recoverableQueue()).toHaveLength(1);
  await claimContributions(['old','other']); expect(loadQueue()[0]).toMatchObject({owner:'owner-a',state:'queued',attempts:0}); expect(loadQueue('owner-b')).toHaveLength(1); expect(localStorage.getItem('burlive_contrib_queue:before-owner-migration')).toContain('rejected');
});
it.each(['en-ru','cs-ru'] as const)('%s unknown words give a local missing-word error, not another word', async course => {
  chooseCourse(course); await expect(api.getWordDetail('unknown')).rejects.toThrow('Слово не найдено');
  expect((await api.getWordDetail(courseWords()[0].id)).word._id).toBe(courseWords()[0].id); expect(fetch).not.toHaveBeenCalled();
});
it('lore background sync is silent in English', async () => { chooseCourse('en-ru'); await syncLore(); expect(fetch).not.toHaveBeenCalled(); });
const uploads = [
  () => api.uploadWordAudio(sid,new Blob(['fixture']),'word'),
  () => api.submitAudioSuggestion(sid,new Blob(['fixture'])),
  () => api.uploadLoreAudio(sid,new Blob(['fixture'])),
];
it.each(uploads)('upload %# obeys course restriction', async run => { chooseCourse('en-ru'); await expect(run()).rejects.toThrow('бурятском курсе'); expect(fetch).not.toHaveBeenCalled(); });
it.each(uploads)('upload %# discards results after owner switch', async run => {
  const pending = deferred(); vi.mocked(fetch).mockImplementation(() => pending.promise); const work=run(); const assertion=expect(work).rejects.toMatchObject({statusCode:409}); login('owner-b'); pending.resolve(json({audioUrl:'fixture'})); await assertion;
});
it('audio refresh retries multipart without forcing JSON content type', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(json({message:'expired'},401)).mockResolvedValueOnce(json({access_token:token('owner-a')+'new',refresh_token:'new-fixture'})).mockResolvedValueOnce(json({audioUrl:'fixture'}));
  await api.submitAudioSuggestion(sid,new Blob(['fixture'])); expect(fetch).toHaveBeenCalledTimes(3);
  expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain('/auth/refresh');
  for(const index of [0,2]) { const options=vi.mocked(fetch).mock.calls[index][1]; expect(options?.body).toBeInstanceOf(FormData); expect(new Headers(options?.headers).has('Content-Type')).toBe(false); }
});
it('rejects an in-flight Buryat response after changing course', async () => {
  const pending=deferred(); vi.mocked(fetch).mockImplementation(() => pending.promise); const work=api.apiRequest('/words'); const assertion=expect(work).rejects.toMatchObject({statusCode:409}); chooseCourse('en-ru'); pending.resolve(json({})); await assertion;
});
it('local My profile works without server requests', async () => { api.clearStoredTokens(); chooseCourse('en-ru'); await expect(api.getUserProfile('offline_user')).resolves.toBeDefined(); expect(fetch).not.toHaveBeenCalled(); });
it('APK categories are fetched and cached; offline can reuse them', async () => {
  vi.mocked(fetch).mockResolvedValue(json([{_id:'c1',name:'Тест'}])); expect(await api.getCategories()).toHaveLength(1); vi.spyOn(navigator,'onLine','get').mockReturnValue(false); expect(await api.getCategories()).toHaveLength(1); expect(fetch).toHaveBeenCalledTimes(1);
});

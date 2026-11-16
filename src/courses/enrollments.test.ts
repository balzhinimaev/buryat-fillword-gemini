import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { apiRequest } from '../services/api';
import { writeProgress, readProgress } from '../services/progressStorage';
import { acceptRemotePlan, learningProfile, saveCoursePlan, syncLearningProfile, type CoursePlan } from './enrollments';
vi.mock('../services/api', () => ({ apiRequest: vi.fn() }));
const api = vi.mocked(apiRequest);
function account(id: string) { localStorage.setItem('auth_tokens', JSON.stringify({ access_token: `x.${btoa(JSON.stringify({ sub: id }))}.x` })); }
const plan = (courseId: CoursePlan['courseId'], revision = 1): CoursePlan => ({ courseId, status: 'active', minutes: 5, goal: 'everyday', revision });
beforeEach(() => { localStorage.clear(); api.mockReset(); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true); });
afterEach(() => vi.restoreAllMocks());
it('migrates existing course selection and progress without rewriting achievements or other accounts', () => {
  account('alice'); writeProgress('learning-course:selected', 'en-ru');
  writeProgress('learning-course:cs-ru:progress:v1', '["home"]');
  writeProgress('buryat_fillword_game', '{"stars":99}');
  const courses = learningProfile().courses;
  expect(Object.keys(courses).sort()).toEqual(['bua-ru', 'cs-ru', 'en-ru']);
  expect(readProgress('buryat_fillword_game')).toBe('{"stars":99}');
  account('bob'); expect(Object.keys(learningProfile().courses)).toEqual(['bua-ru']);
});
it('pauses a local course without deleting its completion or creating network work for guests', async () => {
  writeProgress('learning-course:en-ru:progress:v1', '["home"]');
  saveCoursePlan('en-ru', { status: 'paused', goal: 'travel', minutes: 10 });
  expect(learningProfile().courses['en-ru']?.status).toBe('paused');
  expect(readProgress('learning-course:en-ru:progress:v1')).toBe('["home"]');
  expect(await syncLearningProfile()).toBe('local'); expect(api).not.toHaveBeenCalled();
});
it('adopts a remote plan rather than overwriting it with a migration default', async () => {
  account('alice');
  api.mockResolvedValue({ enrollments: [{ ...plan('bua-ru', 3), minutes: 15, goal: 'culture' }] });
  expect(await syncLearningProfile()).toBe('synced');
  expect(learningProfile().courses['bua-ru']?.minutes).toBe(15); expect(api).toHaveBeenCalledTimes(1);
});
it('stops a stale plan from overwriting a newer remote plan; user can accept the remote one', async () => {
  account('alice');
  writeProgress('learning-profile:v1', JSON.stringify({ version: 1, courses: { 'bua-ru': { ...plan('bua-ru'), dirty: false, explicit: true, version: 1 } } }));
  saveCoursePlan('bua-ru', { status: 'active', goal: 'travel', minutes: 10 });
  api.mockResolvedValue({ enrollments: [{ ...plan('bua-ru', 2), goal: 'culture', minutes: 15 }] });
  expect(await syncLearningProfile()).toBe('conflict'); expect(api).toHaveBeenCalledTimes(1);
  expect(learningProfile().courses['bua-ru']?.goal).toBe('travel');
  acceptRemotePlan('bua-ru'); expect(learningProfile().courses['bua-ru']?.goal).toBe('culture');
  expect(learningProfile().courses['bua-ru']?.dirty).toBe(false);
});
it('does not lose an edit made while the previous plan is uploading', async () => {
  account('alice'); saveCoursePlan('bua-ru', { status: 'active', goal: 'everyday', minutes: 5 });
  let release!: (value: CoursePlan) => void;
  let remote: CoursePlan | undefined;
  const payloads: CoursePlan[] = [];
  api.mockImplementation(async (_path, init) => {
    if (!init) return { enrollments: remote ? [remote] : [] };
    const body = JSON.parse(init.body as string); payloads.push(body);
    if (payloads.length === 1) return new Promise<CoursePlan>(r => { release = r; });
    remote = { ...body, courseId: 'bua-ru', revision: body.revision + 1 }; return remote;
  });
  const sync = syncLearningProfile(); await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  saveCoursePlan('bua-ru', { status: 'active', goal: 'travel', minutes: 15 });
  remote = plan('bua-ru'); release(remote);
  expect(await sync).toBe('synced'); expect(payloads).toHaveLength(2);
  expect(payloads[1]).toMatchObject({ goal: 'travel', minutes: 15, revision: 1 });
  expect(learningProfile().courses['bua-ru']?.goal).toBe('travel');
});
it('ignores a delayed response after account change', async () => {
  account('alice'); let release!: (value: unknown) => void;
  api.mockImplementation(() => new Promise(r => { release = r; }));
  const sync = syncLearningProfile(); account('bob'); release({ enrollments: [plan('cs-ru')] });
  expect(await sync).toBe('local'); expect(learningProfile().courses['cs-ru']).toBeUndefined();
});
it('validates remote course identities before saving them', async () => {
  account('alice'); api.mockResolvedValue({ enrollments: [plan('unknown' as CoursePlan['courseId'])] });
  await expect(syncLearningProfile()).rejects.toThrow('Invalid profile');
  expect(Object.keys(learningProfile().courses)).toEqual(['bua-ru']);
});

import { adminGetWords, adminGetDialects, adminGetCategories, createWord, updateWord, deleteWord, getStoredTokens, getMe, getServerWordDetail } from './api';
import { apiWordToRecord, countDirtyWords, getAllWords, getDirtyWords, getMeta, getWordRecord, putWordRecord, recordToCreateRequest, recordToUpdateRequest, setMeta,
  mutateWordRecord, mergeServerWords, removeStaleCleanWords, bindCreatedWord, importLegacyCleanWords, type EditableWord, type LocalWordRecord } from './adminDictStore';
import { progressOwner } from './progressStorage';
import { syncContext, syncErrorText, syncExclusive, syncSingleFlight } from './syncContext';

const online = () => navigator.onLine !== false;
const revision = () => crypto.randomUUID();
const time = () => new Date().toISOString();
const statusOf = (e: unknown) => (e as { statusCode?: number })?.statusCode;
function preflight(context: ReturnType<typeof syncContext>): string | undefined {
  if (!context.current()) return 'account-change';
  if (context.course !== 'bua-ru') return 'course';
  if (!online()) return 'offline';
  if (context.owner === 'guest' || !getStoredTokens()?.refresh_token) return 'auth';
}
async function hasEditingRole(): Promise<boolean> {
  try { const me = await getMe(); return me.role === 'admin' || me.role === 'moderator'; } catch { return false; }
}
export interface PullSummary { ok: boolean; total: number; pulled: number; skippedDirty: number; removedStale: number; reason?: string; }
export function pullFullDictionary(onProgress?: (loaded: number, total: number) => void): Promise<PullSummary> {
  const context = syncContext(), owner = context.owner;
  return syncSingleFlight(`admin-pull:${owner}`, () => syncExclusive(`admin-dict:${owner}`, async () => {
    const result: PullSummary = { ok: false, total: 0, pulled: 0, skippedDirty: 0, removedStale: 0 };
    const reason = preflight(context); if (reason) return { ...result, reason };
    if (!(await hasEditingRole())) return { ...result, reason: 'auth' };
    const check = () => { if (!context.current()) throw new Error('Аккаунт или курс изменился'); };
    check();
    const [dialects, categories] = await Promise.all([adminGetDialects(), adminGetCategories()]);
    check(); await setMeta({ dialects, categories }, owner);
    const seen = new Set<string>(); let offset = 0;
    for (;;) {
      check();
      const page = await adminGetWords({ limit: 500, offset }); check();
      result.total = page.total;
      if (!page.words.length) break;
      page.words.forEach(w => seen.add(w._id));
      const merged = await mergeServerWords(page.words.map(apiWordToRecord), owner);
      result.pulled += merged.written; result.skippedDirty += merged.skipped;
      offset += page.words.length; onProgress?.(Math.min(offset, page.total), page.total);
      if (offset >= page.total) break;
    }
    check(); result.removedStale = await removeStaleCleanWords(seen, owner);
    await setMeta({ lastPullAt: time(), total: result.total }, owner);
    return { ...result, ok: true };
  }));
}
export async function saveWordLocal(key: string | null, fields: EditableWord): Promise<string> {
  const owner = progressOwner();
  if (!key) {
    const id = `local-${crypto.randomUUID()}`;
    await putWordRecord({ key: id, word: fields, dirty: 'created', revision: revision(), updatedLocallyAt: time() }, owner);
    return id;
  }
  await mutateWordRecord(key, current => {
    if (!current) throw new Error('Слово не найдено в локальном словаре');
    return { ...current, word: fields, dirty: current.dirty === 'created' ? 'created' : 'updated', revision: revision(), updatedLocallyAt: time(), attempts: 0, syncError: undefined, needsReview: false };
  }, owner);
  return key;
}
export async function deleteWordLocal(key: string): Promise<void> {
  const owner = progressOwner();
  await mutateWordRecord(key, current => !current || current.dirty === 'created' ? undefined
    : { ...current, dirty: 'deleted', revision: revision(), updatedLocallyAt: time(), attempts: 0, syncError: undefined, needsReview: false }, owner);
}
export async function revertWordLocal(key: string): Promise<void> {
  const context = syncContext(); const sent = await getWordRecord(key, context.owner);
  if (!sent) return;
  if (sent.dirty === 'created') {
    await mutateWordRecord(key, current => current && current.revision === sent.revision ? undefined : current, context.owner); return;
  }
  const fresh = await getServerWordDetail(sent.serverId ?? key);
  if (!context.current()) throw new Error('Аккаунт или курс изменился');
  await mutateWordRecord(key, current => current && current.revision === sent.revision ? apiWordToRecord(fresh.word) : current, context.owner);
}
export async function retryWordSync(key: string): Promise<void> {
  await mutateWordRecord(key, current => current ? { ...current, attempts: 0, syncError: undefined, needsReview: false } : current);
}
export interface AdminSyncSummary { ok: boolean; pushed: number; failed: number; remaining: number; reason?: string; }
export function pushAdminQueue(): Promise<AdminSyncSummary> {
  const context = syncContext(), owner = context.owner;
  return syncSingleFlight(`admin-push:${owner}`, () => syncExclusive(`admin-dict:${owner}`, async () => {
    const result: AdminSyncSummary = { ok: true, pushed: 0, failed: 0, remaining: 0 };
    const stop = (reason: string) => ({ ...result, ok: false, reason });
    const reason = preflight(context); if (reason) return stop(reason);
    const dirty = await getDirtyWords(owner); result.remaining = dirty.length;
    if (!dirty.length) return result;
    if (!(await hasEditingRole())) return stop('auth');
    for (let sent of dirty) {
      if (!context.current()) return stop('account-change');
      if (sent.needsReview) continue;
      const updateIfUnchanged = (patch: Partial<LocalWordRecord>) => mutateWordRecord(sent.key,
        current => current && current.revision === sent.revision ? { ...current, ...patch } : current, owner);
      try {
        if (sent.dirty === 'created') {
          const created = await createWord(recordToCreateRequest(sent));
          // Persist the server id BEFORE the second request: a failed PATCH must never repeat POST.
          await bindCreatedWord(sent, created._id, owner);
          sent = { ...sent, key: created._id, serverId: created._id, dirty: 'updated' };
          if (!context.current()) return stop('account-change');
          if (sent.word.status !== 'verified') await updateWord(created._id, { status: sent.word.status });
          await updateIfUnchanged({ dirty: 'none', attempts: 0, syncError: undefined, needsReview: false, serverUpdatedAt: time() });
        } else if (sent.dirty === 'updated' && sent.serverId) {
          await updateWord(sent.serverId, recordToUpdateRequest(sent));
          await updateIfUnchanged({ dirty: 'none', attempts: 0, syncError: undefined, needsReview: false, serverUpdatedAt: time() });
        } else if (sent.dirty === 'deleted' && sent.serverId) {
          try { await deleteWord(sent.serverId); } catch (error) { if (statusOf(error) !== 404) throw error; }
          await mutateWordRecord(sent.key, current => current && current.revision === sent.revision ? undefined : current, owner);
        } else throw new Error('Запись сохранена, но её серверный идентификатор отсутствует. Проверьте правку.');
        result.pushed++;
      } catch (error) {
        result.failed++;
        await updateIfUnchanged({ attempts: (sent.attempts ?? 0) + 1, syncError: !context.current() ? 'Аккаунт или курс изменился во время отправки. Проверьте правку перед повтором.' : syncErrorText(error), needsReview: !context.current() });
        if (!context.current()) return stop('account-change');
        if (statusOf(error) === 401 || statusOf(error) === 403) return stop('auth');
      }
    }
    result.remaining = (await countDirtyWords(owner)).pending;
    return result;
  }));
}
export interface AdminSyncStats { pending: number; errors: number; lastPullAt?: string; total: number; }
export async function adminSyncStats(): Promise<AdminSyncStats> {
  const owner = progressOwner();
  await importLegacyCleanWords(owner);
  const [counts, meta, all] = await Promise.all([countDirtyWords(owner), getMeta(owner), getAllWords(owner)]);
  return { ...counts, lastPullAt: meta.lastPullAt, total: all.length };
}
export async function hasPendingAdminEdits(): Promise<boolean> {
  if (progressOwner() === 'guest') return false;
  try { return (await countDirtyWords()).pending > 0; } catch { return false; }
}

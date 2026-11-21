import { useCallback, useEffect, useState } from 'react';
import { claimContributions, loadQueue, recoverableQueue, retryContribution, syncQueue } from '../../services/contribSync';
import { claimLegacyAdminDrafts, unclaimedAdminDrafts } from '../../services/adminDictStore';
import { progressOwner } from '../../services/progressStorage';
import { syncErrorText } from '../../services/syncContext';

interface Item { id: string; bur: string; ru: string; }
export function QueueRecovery({ kind, onUpdated }: { kind: 'contributions' | 'dictionary'; onUpdated: () => void }) {
  const [items, setItems] = useState<Item[]>([]), [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const load = useCallback(async () => setItems(kind === 'contributions'
    ? recoverableQueue().map(i => ({ id: i.localId, bur: i.data.bur, ru: i.data.ru }))
    : (await unclaimedAdminDrafts()).map(i => ({ id: i.key, bur: i.word.bur, ru: i.word.ru }))), [kind]);
  useEffect(() => { void load().catch(e => setError(syncErrorText(e))); }, [load]); // owner change remounts App
  const claim = async () => {
    setBusy(true); setError('');
    try {
      if (kind === 'contributions') await claimContributions(selected); else await claimLegacyAdminDrafts(selected);
      setSelected([]); await load(); onUpdated();
    } catch (e) { setError(syncErrorText(e)); } finally { setBusy(false); }
  };
  if (!items.length && !error) return null;
  return <details className="rounded-xl border border-amber-500/40 p-3 space-y-3">
    <summary className="font-semibold cursor-pointer">Сохранённые записи без аккаунта: {items.length}</summary>
    <p className="text-sm">Выберите только свои записи. Они будут привязаны к текущему аккаунту; исходная копия сохранится.</p>
    <div className="max-h-64 overflow-y-auto space-y-2">{items.map(i => <label key={i.id} className="flex items-start gap-3 text-sm">
      <input type="checkbox" disabled={busy} checked={selected.includes(i.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, i.id] : ids.filter(id => id !== i.id))}/>
      <span>{i.bur} — {i.ru}</span>
    </label>)}</div>
    {progressOwner() === 'guest' ? <p className="text-sm">Войдите в свой аккаунт для привязки и отправки.</p>
      : <button type="button" disabled={busy || !selected.length} onClick={() => void claim()} className="ui-primary rounded-xl px-3 py-2 disabled:opacity-50">Привязать выбранные к моему аккаунту</button>}
    {error && <p role="alert" className="text-sm">{error}</p>}
  </details>;
}
export function ContributionQueueDetails({ onUpdated }: { onUpdated: () => void }) {
  const [items, setItems] = useState(loadQueue), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { const update = () => setItems(loadQueue()); window.addEventListener('contrib:queue', update); return () => window.removeEventListener('contrib:queue', update); }, []);
  const retry = async (id: string) => {
    setBusy(true); setError('');
    try { await retryContribution(id); await syncQueue(); setItems(loadQueue()); onUpdated(); }
    catch (e) { setError(syncErrorText(e)); } finally { setBusy(false); }
  };
  if (!items.length) return null;
  return <details className="rounded-xl border border-amber-500/30 p-3 space-y-2">
    <summary className="cursor-pointer">Мои отложенные слова ({items.length})</summary>
    <ul className="max-h-64 overflow-y-auto space-y-3">{items.map(i => <li key={i.localId} className="text-sm">
      <div>{i.data.bur} — {i.data.ru}</div>
      <div className="opacity-70">{!i.serverId ? 'На устройстве, ещё не отправлено' : i.state === 'rejected' ? 'Отклонено модерацией' : i.state === 'verified' ? 'Проверено' : 'Отправлено, ожидает проверки'}</div>
      {i.syncError && <><p>{i.syncError}</p><button type="button" disabled={busy} className="underline" onClick={() => void retry(i.localId)}>Проверил запись — повторить</button></>}
    </li>)}</ul>
    {error && <p role="alert">{error}</p>}
  </details>;
}

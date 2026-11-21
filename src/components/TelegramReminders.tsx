import { useEffect, useState } from 'react';
import { useAuth } from '../store/authStore';
import { getReminderConsent, setReminderConsent } from '../services/api';
import { ROUND_COMPLETED } from '../services/postGame';

export default function TelegramReminders({ settings = false, hidden = false }: { settings?: boolean; hidden?: boolean }) {
  const { state } = useAuth();
  const id = state.user?._id;
  const [played, setPlayed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = `fillword:reminder-prompt:${id}`;
  useEffect(() => {
    setPlayed(false); setEnabled(null);
    try { setDismissed(localStorage.getItem(key) === 'dismissed'); } catch { setDismissed(false); }
    if (!id || !state.user?.telegramId) return;
    let live = true;
    void getReminderConsent().then(r => { if (live) setEnabled(r.enabled); }).catch(() => {});
    const onCompleted = () => setPlayed(true);
    window.addEventListener(ROUND_COMPLETED, onCompleted);
    return () => { live = false; window.removeEventListener(ROUND_COMPLETED, onCompleted); };
  }, [id, key, state.user?.telegramId]);
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(key, 'dismissed'); } catch { /* storage optional */ }
  };
  const toggle = async () => {
    setError(''); setBusy(true);
    try {
      if (enabled) { await setReminderConsent(false); setEnabled(false); return; }
      const tg = window.Telegram?.WebApp;
      if (!tg?.requestWriteAccess) { setError('Откройте игру в актуальной версии Telegram.'); return; }
      const granted = await new Promise<boolean>((resolve) => tg.requestWriteAccess(resolve));
      if (!granted) { dismiss(); return; }
      const saved = await setReminderConsent(true);
      setEnabled(saved.enabled);
      dismiss();
    } catch { setError('Не удалось сохранить настройку. Попробуйте ещё раз.'); }
    finally { setBusy(false); }
  };
  if (!id || !state.user?.telegramId || hidden || enabled === null) return null;
  if (!settings && (!played || dismissed || enabled)) return null;
  return <section aria-label="Напоминания в Telegram" className={settings ? 'p-4 space-y-3' : 'fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] max-h-[50dvh] overflow-y-auto inset-x-4 z-[80] mx-auto max-w-md rounded-2xl bg-stone-900 text-white p-5 shadow-xl space-y-3'}>
    <h2 className="font-semibold">{enabled ? 'Напоминания включены' : 'Напоминать об игре?'}</h2>
    <p className="text-sm opacity-80">Одно напоминание в день, если вы ещё не играли. Можно отключить в настройках.</p>
    {error && <p role="alert" className="text-sm">{error}</p>}
    <button type="button" disabled={busy} onClick={() => void toggle()} className="rounded-xl bg-amber-500 text-stone-950 min-h-11 px-4 py-2 font-medium disabled:opacity-60">{busy ? 'Сохраняем…' : enabled ? 'Отключить' : 'Напоминать об игре'}</button>
    {!settings && <button type="button" disabled={busy} onClick={dismiss} className="ml-3 min-h-11 px-3 py-2">Не сейчас</button>}
  </section>;
}

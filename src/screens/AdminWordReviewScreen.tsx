// Панель проверки носителем (админ/модератор): verified-слова без отметки
// «проверено носителем» идут конвейером — Верно / Исправить / Отклонить / Пропустить.
// Основной кейс: вычитка ИИ-сгенерированного словаря живым носителем.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  Check,
  Loader2,
  PartyPopper,
  Pencil,
  RefreshCw,
  SkipForward,
  Undo2,
  X,
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { WaveAudioButton } from '../components/WaveAudioButton';
import { EditWordModal } from '../components/contribution/EditWordModal';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';
import type { GameStore } from '../store/gameStore';
import { api, type ApiWord, type GetWordsParams } from '../services/api';

interface Props {
  store: GameStore;
}

const PAGE = 100;

const AdminWordReviewScreen: React.FC<Props> = ({ store }) => {
  const { goBack } = store;
  const { theme, isDark } = useTheme();
  const { state: authState } = useAuth();
  useBackButton(() => goBack());

  const role = authState.user?.role ?? 'user';
  const canEdit = role === 'admin' || role === 'moderator';

  const [queue, setQueue] = useState<ApiWord[]>([]);
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [sessionOk, setSessionOk] = useState(0);
  const [sessionFixed, setSessionFixed] = useState(0);
  const [sessionRejected, setSessionRejected] = useState(0);
  const [checkedTotal, setCheckedTotal] = useState<number | null>(null);
  const [uncheckedTotal, setUncheckedTotal] = useState<number | null>(null);
  const [lastAction, setLastAction] = useState<{ bur: string; verdict: string; index: number } | null>(null);

  const processedRef = useRef(0); // проверенные/отклонённые выпадают из фильтра → offset
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const queueLenRef = useRef(0);
  queueLenRef.current = queue.length;
  const indexRef = useRef(index);
  indexRef.current = index;

  const filters = useMemo<GetWordsParams>(
    () => ({ status: 'verified', hasNativeCheck: false, limit: PAGE }),
    [],
  );

  const loadMore = useCallback(async (reset: boolean) => {
    if (loadingRef.current) return;
    if (!reset && !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError('');
    try {
      const offset = reset ? 0 : Math.max(0, queueLenRef.current - processedRef.current);
      const res = await api.adminGetWords({ ...filters, offset });
      hasMoreRef.current = res.words.length >= PAGE;
      setTotal(res.total);
      setQueue((q) => {
        const base = reset ? [] : q;
        const seen = new Set(base.map((w) => w._id));
        return [...base, ...res.words.filter((w) => !seen.has(w._id))];
      });
      if (reset) setIndex(0);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Не удалось загрузить слова');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    processedRef.current = 0;
    hasMoreRef.current = true;
    void loadMore(true);
    void Promise.all([
      api.adminGetWords({ status: 'verified', hasNativeCheck: true, limit: 1 }),
      api.adminGetWords({ status: 'verified', hasNativeCheck: false, limit: 1 }),
    ]).then(([c, u]) => {
      setCheckedTotal(c.total);
      setUncheckedTotal(u.total);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (queue.length > 0 && index >= queue.length - 5) void loadMore(false);
  }, [index, queue.length, loadMore]);

  const word = queue[index];
  const wordRef = useRef(word);
  wordRef.current = word;

  const advance = useCallback((verdict: string, forWord: ApiWord) => {
    processedRef.current += 1;
    setCheckedTotal((v) => (v == null ? v : v + 1));
    setUncheckedTotal((v) => (v == null ? v : Math.max(0, v - 1)));
    setLastAction({ bur: forWord.bur, verdict, index: indexRef.current });
    setIndex((i) => i + 1);
  }, []);

  const markOk = useCallback(async (forWord?: ApiWord) => {
    const w = forWord ?? wordRef.current;
    if (!w || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.setWordNativeCheck(w._id);
      setSessionOk((c) => c + 1);
      advance('верно', w);
    } catch (e) {
      setError((e as { message?: string })?.message || 'Не удалось сохранить отметку');
    } finally {
      setBusy(false);
    }
  }, [busy, advance]);

  const reject = useCallback(async () => {
    const w = wordRef.current;
    if (!w || busy) return;
    if (!window.confirm(`Отклонить слово «${w.bur}»? Оно уйдёт из словаря и игры.`)) return;
    setBusy(true);
    setError('');
    try {
      await api.updateWord(w._id, { status: 'rejected', isActiveInGame: false });
      setSessionRejected((c) => c + 1);
      advance('отклонено', w);
    } catch (e) {
      setError((e as { message?: string })?.message || 'Не удалось отклонить');
    } finally {
      setBusy(false);
    }
  }, [busy, advance]);

  // после правки в модалке слово считается проверенным (носитель его вычитал)
  const onEditSaved = useCallback(() => {
    setEditing(false);
    const w = wordRef.current;
    if (!w) return;
    setSessionFixed((c) => c + 1);
    void (async () => {
      setBusy(true);
      try {
        await api.setWordNativeCheck(w._id);
        advance('исправлено', w);
      } catch {
        setError('Правка сохранена, но отметка не проставилась — нажмите «Верно»');
      } finally {
        setBusy(false);
      }
    })();
  }, [advance]);

  // Горячие клавиши: 1/Enter — верно, 2 — исправить, 3 — отклонить, → — пропустить
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.tagName === 'TEXTAREA') return;
      if (t instanceof HTMLInputElement && !['checkbox', 'radio', 'button'].includes(t.type)) return;
      if (!wordRef.current || editing) return;
      if (e.key === '1' || e.key === 'Enter') { e.preventDefault(); void markOk(); }
      else if (e.key === '2') setEditing(true);
      else if (e.key === '3') void reject();
      else if (e.key === 'ArrowRight') setIndex((i) => i + 1);
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [markOk, reject, editing]);

  const progressTotal = (checkedTotal ?? 0) + (uncheckedTotal ?? 0);
  const progressPct = progressTotal > 0 ? Math.round(((checkedTotal ?? 0) / progressTotal) * 100) : 0;
  const queueDone = !loading && !word;
  const dialectName = word?.dialectId && typeof word.dialectId === 'object' ? word.dialectId.name : '';

  const btnCls = (extra: string) => cn(
    'flex-1 px-3 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40',
    extra,
  );

  if (!canEdit) {
    return (
      <div className={cn('min-h-screen flex flex-col', theme.backgrounds.primary)}>
        <StickyHeader title="Проверка носителем" onBack={goBack} />
        <div className={cn('flex-1 flex items-center justify-center p-8 text-center text-sm', theme.text.dimmed)}>
          Раздел доступен только модераторам и администраторам.
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen flex flex-col', theme.backgrounds.primary)}>
      <StickyHeader title="Проверка носителем" onBack={goBack} />

      <div className="flex-1 w-full max-w-md mx-auto px-4 pb-8 pt-4 flex flex-col gap-4">
        {/* Прогресс вычитки словаря */}
        {checkedTotal != null && uncheckedTotal != null && (
          <div className="flex flex-col gap-1">
            <div className={cn('flex items-center justify-between text-[11px]', theme.text.dimmed)}>
              <span>Проверено {checkedTotal} из {progressTotal} ({progressPct}%)</span>
              <span>сессия: ✓{sessionOk} ✏️{sessionFixed} ✕{sessionRejected}</span>
            </div>
            <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/10' : 'bg-stone-200')}>
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        <div className={cn('flex items-center justify-between text-xs', theme.text.dimmed)}>
          <span>{total > 0 ? `${Math.min(index + 1, total)} из ${total} в очереди` : loading ? 'Загрузка…' : 'Пусто'}</span>
          <span className="hidden sm:block">1 — верно · 2 — исправить · 3 — отклонить</span>
        </div>

        {loadError && (
          <div className="flex items-center justify-between gap-2 text-xs text-red-500">
            <span>{loadError}</span>
            <button className="underline" onClick={() => void loadMore(queue.length === 0)}>Повторить</button>
          </div>
        )}

        {/* Карточка слова */}
        <div className="flex-1 flex flex-col justify-center min-h-[260px]">
          <AnimatePresence mode="wait">
            {word && (
              <motion.div
                key={word._id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  'rounded-2xl border p-5 flex flex-col items-center gap-2.5 text-center',
                  isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-sm',
                )}
              >
                <div className={cn('text-4xl font-bold leading-tight break-words max-w-full', theme.text.primary)}>
                  {word.bur}
                </div>
                <div className={cn('text-base', theme.text.dimmed)}>
                  {word.ru}
                  {word.translations?.en ? ` · ${word.translations.en}` : ''}
                </div>
                {word.exampleBur && (
                  <div className={cn(
                    'text-sm rounded-xl px-3 py-2 max-w-full',
                    isDark ? 'bg-white/5' : 'bg-stone-50',
                  )}>
                    <div className={theme.text.primary}>{word.exampleBur}</div>
                    {word.exampleRu && <div className={cn('text-xs mt-0.5', theme.text.dimmed)}>{word.exampleRu}</div>}
                  </div>
                )}
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {dialectName && (
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                      isDark ? 'bg-white/10 text-white/70' : 'bg-stone-100 text-stone-600',
                    )}>{dialectName}</span>
                  )}
                  {word.tags.filter((t) => t !== 'ai-generated').slice(0, 3).map((t) => (
                    <span key={t} className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                      isDark ? 'bg-white/10 text-white/70' : 'bg-stone-100 text-stone-600',
                    )}>{t}</span>
                  ))}
                  {word.tags.includes('ai-generated') && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-500">
                      ИИ-слово
                    </span>
                  )}
                </div>
                {word.audioUrl && <WaveAudioButton src={word.audioUrl} />}
              </motion.div>
            )}

            {queueDone && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn('flex flex-col items-center gap-3 text-center p-6', theme.text.dimmed)}
              >
                <PartyPopper size={40} className="text-emerald-500" />
                <div className={cn('text-lg font-bold', theme.text.primary)}>Все слова проверены!</div>
                <div className="text-sm">
                  За сессию: подтверждено {sessionOk}, исправлено {sessionFixed}, отклонено {sessionRejected}
                </div>
                <button
                  className={cn('mt-1 px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2',
                    isDark ? 'border-white/15 text-white' : 'border-stone-300 text-stone-700')}
                  onClick={() => void loadMore(true)}
                >
                  <RefreshCw size={15} /> Обновить очередь
                </button>
              </motion.div>
            )}

            {!word && loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                <Loader2 size={28} className={cn('animate-spin', theme.text.dimmed)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && <div className="text-xs text-red-500 text-center">{error}</div>}

        {/* Последнее действие */}
        {lastAction && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs',
            isDark ? 'border-white/10 bg-white/5' : 'border-stone-200 bg-stone-50',
          )}>
            <BadgeCheck size={14} className="text-emerald-500 shrink-0" />
            <span className={cn('truncate', theme.text.dimmed)}>
              <b className={theme.text.primary}>{lastAction.bur}</b> — {lastAction.verdict}
            </span>
            <button
              className={cn('ml-auto flex items-center gap-1 font-semibold shrink-0', theme.text.dimmed)}
              disabled={busy}
              onClick={() => setIndex(lastAction.index)}
            >
              <Undo2 size={13} /> Вернуться
            </button>
          </div>
        )}

        {/* Действия */}
        {word && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 w-full">
              <button
                className={btnCls('bg-emerald-500 text-white active:bg-emerald-600')}
                disabled={busy}
                onClick={() => void markOk()}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Верно
              </button>
              <button
                className={btnCls(cn('border', isDark ? 'border-white/15 text-white' : 'border-stone-300 text-stone-700'))}
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                <Pencil size={15} /> Исправить
              </button>
              <button
                className={btnCls('border border-red-500/40 text-red-500')}
                disabled={busy}
                onClick={() => void reject()}
              >
                <X size={16} /> Отклонить
              </button>
            </div>
            <button
              className={cn('w-full px-3 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40',
                isDark ? 'border-white/15 text-white/70' : 'border-stone-300 text-stone-500')}
              disabled={busy}
              onClick={() => setIndex((i) => i + 1)}
            >
              Пропустить (не уверен) <SkipForward size={15} />
            </button>
          </div>
        )}
      </div>

      {editing && word && (
        <EditWordModal
          word={word}
          willResetToPending={false}
          onSaved={onEditSaved}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
};

export default AdminWordReviewScreen;

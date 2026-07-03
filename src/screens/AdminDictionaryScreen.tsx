// src/screens/AdminDictionaryScreen.tsx
// Офлайн-редактор словаря (админ): полная локальная копия слов в IndexedDB,
// правки любых полей (включая диалект) без сети, push на сервер при подключении.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudDownload,
  CloudUpload,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  RotateCcw,
  WifiOff,
} from 'lucide-react';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';
import { isNetOnline } from '../config/offline';
import type { ApiDialect, ApiCategory, WordStatus } from '../services/api';
import {
  getAllWords,
  getMeta,
  type LocalWordRecord,
  type EditableWord,
} from '../services/adminDictStore';
import {
  pullFullDictionary,
  pushAdminQueue,
  saveWordLocal,
  deleteWordLocal,
  retryWordSync,
} from '../services/adminDictSync';

interface AdminDictionaryScreenProps {
  store: GameStore;
}

const PAGE = 100;

const STATUS_LABELS: Record<WordStatus, string> = {
  pending: 'Ожидает',
  verified: 'Провер.',
  rejected: 'Отклон.',
  archived: 'Архив',
};

const STATUS_OPTIONS: WordStatus[] = ['verified', 'pending', 'rejected', 'archived'];

const DIRTY_LABELS: Record<string, string> = {
  created: 'новое',
  updated: 'правка',
  deleted: 'удаление',
};

function statusBadgeClass(status: WordStatus, isDark: boolean): string {
  switch (status) {
    case 'verified':
      return isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
    case 'pending':
      return isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700';
    case 'rejected':
      return isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700';
    default:
      return isDark ? 'bg-white/10 text-white/50' : 'bg-stone-200 text-stone-600';
  }
}

// ─── Форма редактирования слова ──────────────────────────────────────
interface WordFormProps {
  record: LocalWordRecord | null; // null — новое слово
  dialects: ApiDialect[];
  categories: ApiCategory[];
  isDark: boolean;
  onSave: (fields: EditableWord) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

const emptyWord: EditableWord = {
  bur: '',
  ru: '',
  synonyms: [],
  antonyms: [],
  sources: [],
  tags: [],
  status: 'verified',
  isActiveInGame: false,
  difficulty: 5,
};

const WordForm: React.FC<WordFormProps> = ({ record, dialects, categories, isDark, onSave, onDelete, onClose }) => {
  const [fields, setFields] = useState<EditableWord>(record?.word ?? emptyWord);
  const [tagsText, setTagsText] = useState((record?.word.tags ?? []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof EditableWord>(key: K, value: EditableWord[K]) =>
    setFields((f) => ({ ...f, [key]: value }));

  const inputCls = cn(
    'w-full px-3 py-2 rounded-xl border text-sm',
    isDark ? 'bg-white/10 border-white/10 text-white placeholder-white/30' : 'bg-stone-50 border-stone-200 text-stone-900',
  );
  const labelCls = cn('block text-xs font-medium mb-1', isDark ? 'text-white/60' : 'text-stone-500');

  const handleSave = async () => {
    if (!fields.bur.trim() || !fields.ru.trim()) {
      setError('Заполните бурятское слово и перевод');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...fields,
        bur: fields.bur.trim().toUpperCase(),
        ru: fields.ru.trim(),
        tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 space-y-3',
          isDark ? 'bg-stone-900 border border-white/10' : 'bg-white border border-stone-200',
        )}
      >
        <div className={cn('text-base font-bold', isDark ? 'text-white' : 'text-stone-900')}>
          {record ? 'Редактирование слова' : 'Новое слово'}
        </div>

        {error && (
          <div className={cn(
            'p-2.5 rounded-xl text-sm flex items-center gap-2',
            isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-600',
          )}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={labelCls}>Бурятское слово *</span>
            <input className={inputCls} value={fields.bur} onChange={(e) => set('bur', e.target.value)} />
          </label>
          <label>
            <span className={labelCls}>Перевод (рус.) *</span>
            <input className={inputCls} value={fields.ru} onChange={(e) => set('ru', e.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={labelCls}>Диалект</span>
            <select
              className={inputCls}
              value={fields.dialectId ?? ''}
              onChange={(e) => set('dialectId', e.target.value || undefined)}
            >
              <option value="">— не указан —</option>
              {dialects.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>Категория</span>
            <select
              className={inputCls}
              value={fields.categoryId ?? ''}
              onChange={(e) => set('categoryId', e.target.value || undefined)}
            >
              <option value="">— не указана —</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span className={labelCls}>Пример (бур.)</span>
          <input className={inputCls} value={fields.exampleBur ?? ''} onChange={(e) => set('exampleBur', e.target.value || undefined)} />
        </label>
        <label>
          <span className={labelCls}>Пример (рус.)</span>
          <input className={inputCls} value={fields.exampleRu ?? ''} onChange={(e) => set('exampleRu', e.target.value || undefined)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={labelCls}>Произношение</span>
            <input className={inputCls} value={fields.pronunciation ?? ''} onChange={(e) => set('pronunciation', e.target.value || undefined)} />
          </label>
          <label>
            <span className={labelCls}>Теги (через запятую)</span>
            <input className={inputCls} value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label>
            <span className={labelCls}>Статус</span>
            <select
              className={inputCls}
              value={fields.status}
              onChange={(e) => set('status', e.target.value as WordStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelCls}>Сложность</span>
            <select className={inputCls} value={fields.difficulty} onChange={(e) => set('difficulty', Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className={labelCls}>В игре</span>
            <button
              type="button"
              onClick={() => set('isActiveInGame', !fields.isActiveInGame)}
              className={cn(
                'flex-1 rounded-xl border text-sm font-medium transition-colors',
                fields.isActiveInGame
                  ? isDark ? 'bg-emerald-500/25 border-emerald-500/30 text-emerald-300' : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                  : isDark ? 'bg-white/5 border-white/10 text-white/40' : 'bg-stone-100 border-stone-200 text-stone-500',
              )}
            >
              {fields.isActiveInGame ? 'Да' : 'Нет'}
            </button>
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          {record && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Удалить слово «${record.word.bur}»?`)) {
                  void onDelete().then(onClose);
                }
              }}
              className={cn(
                'px-3 py-2.5 rounded-xl text-sm font-semibold',
                isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600',
              )}
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold',
              isDark ? 'bg-white/10 text-white/60' : 'bg-stone-100 text-stone-600',
            )}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold',
              isDark
                ? 'bg-violet-500/30 hover:bg-violet-500/40 text-violet-200 disabled:opacity-50'
                : 'bg-violet-100 hover:bg-violet-200 text-violet-700 disabled:opacity-60',
            )}
          >
            {saving ? 'Сохраняем…' : 'Сохранить (офлайн)'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════

export const AdminDictionaryScreen: React.FC<AdminDictionaryScreenProps> = ({ store }) => {
  const { goBack } = store;
  const { isDark } = useTheme();
  useBackButton(() => goBack());

  const [records, setRecords] = useState<LocalWordRecord[]>([]);
  const [dialects, setDialects] = useState<ApiDialect[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [lastPullAt, setLastPullAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [dialectFilter, setDialectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | WordStatus>('');
  const [dirtyOnly, setDirtyOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  const [editing, setEditing] = useState<LocalWordRecord | 'new' | null>(null);
  const [pulling, setPulling] = useState<{ loaded: number; total: number } | null>(null);
  const [pushing, setPushing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const online = isNetOnline();

  const reload = useCallback(async () => {
    try {
      const [all, meta] = await Promise.all([getAllWords(), getMeta()]);
      all.sort((a, b) => a.word.bur.localeCompare(b.word.bur, 'ru'));
      setRecords(all);
      setDialects(meta.dialects ?? []);
      setCategories(meta.categories ?? []);
      setLastPullAt(meta.lastPullAt);
    } catch (e) {
      console.error('adminDict reload failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const pendingCount = useMemo(() => records.filter((r) => r.dirty !== 'none').length, [records]);
  const errorCount = useMemo(() => records.filter((r) => r.dirty !== 'none' && r.syncError).length, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (r.dirty === 'deleted' && !dirtyOnly) return false; // tombstone показываем только в «изменённых»
      if (dirtyOnly && r.dirty === 'none') return false;
      if (statusFilter && r.word.status !== statusFilter) return false;
      if (dialectFilter === 'none' && r.word.dialectId) return false;
      if (dialectFilter && dialectFilter !== 'none' && r.word.dialectId !== dialectFilter) return false;
      if (q && !r.word.bur.toLowerCase().includes(q) && !r.word.ru.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [records, search, dialectFilter, statusFilter, dirtyOnly]);

  useEffect(() => setVisible(PAGE), [search, dialectFilter, statusFilter, dirtyOnly]);

  const handlePull = async () => {
    setPulling({ loaded: 0, total: 0 });
    setSyncMessage('');
    try {
      const res = await pullFullDictionary((loaded, total) => setPulling({ loaded, total }));
      setSyncMessage(
        res.ok
          ? `Скачано ${res.pulled} слов${res.skippedDirty ? `, ${res.skippedDirty} локальных правок сохранено` : ''}`
          : res.reason === 'auth' ? 'Нужен вход с правами админа' : 'Нет сети',
      );
    } catch (e) {
      console.error('pull failed', e);
      setSyncMessage('Ошибка при скачивании словаря');
    } finally {
      setPulling(null);
      void reload();
    }
  };

  const handlePush = async () => {
    setPushing(true);
    setSyncMessage('');
    try {
      const res = await pushAdminQueue();
      setSyncMessage(
        res.ok
          ? `Отправлено: ${res.pushed}${res.failed ? `, ошибок: ${res.failed}` : ''}${res.remaining ? `, осталось: ${res.remaining}` : ''}`
          : res.reason === 'auth' ? 'Нужен вход с правами админа' : 'Нет сети',
      );
    } catch (e) {
      console.error('push failed', e);
      setSyncMessage('Ошибка при отправке изменений');
    } finally {
      setPushing(false);
      void reload();
    }
  };

  const dialectName = (r: LocalWordRecord): string | null => {
    if (!r.word.dialectId) return null;
    return dialects.find((d) => d._id === r.word.dialectId)?.name ?? r.dialectMeta?.name ?? 'диалект';
  };

  return (
    <div className={cn('min-h-[100dvh]', isDark ? 'bg-stone-950' : 'bg-stone-50')}>
      <StickyHeader title="Словарь (офлайн)" onBack={goBack} />

      <main className="px-4 pb-24 pt-2 space-y-4 max-w-2xl mx-auto">
        {/* ═══ Синхронизация ═══ */}
        <section className={cn(
          'p-4 rounded-2xl border space-y-3',
          isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200',
        )}>
          <div className="flex items-center justify-between">
            <div>
              <div className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-stone-900')}>
                {records.filter((r) => r.dirty !== 'deleted').length} слов локально
              </div>
              <div className={cn('text-xs', isDark ? 'text-white/50' : 'text-stone-500')}>
                {lastPullAt
                  ? `Скачано: ${new Date(lastPullAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                  : 'Словарь ещё не скачан — нажми «Скачать»'}
              </div>
            </div>
            {!online && (
              <div className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700',
              )}>
                <WifiOff size={12} /> офлайн
              </div>
            )}
          </div>

          {pendingCount > 0 && (
            <div className={cn(
              'text-xs px-3 py-2 rounded-xl',
              isDark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700',
            )}>
              Ждут отправки: {pendingCount}
              {errorCount > 0 && <span className={isDark ? 'text-red-300' : 'text-red-600'}> · с ошибками: {errorCount}</span>}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => void handlePull()}
              disabled={!online || !!pulling || pushing}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50',
                isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-stone-100 hover:bg-stone-200 text-stone-700',
              )}
            >
              {pulling ? <Loader2 size={16} className="animate-spin" /> : <CloudDownload size={16} />}
              {pulling ? `${pulling.loaded}${pulling.total ? `/${pulling.total}` : ''}…` : 'Скачать словарь'}
            </button>
            <button
              onClick={() => void handlePush()}
              disabled={!online || pushing || !!pulling || pendingCount === 0}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50',
                isDark
                  ? 'bg-violet-500/30 hover:bg-violet-500/40 text-violet-200'
                  : 'bg-violet-100 hover:bg-violet-200 text-violet-700',
              )}
            >
              {pushing ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
              Отправить{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          </div>

          {syncMessage && (
            <div className={cn('text-xs', isDark ? 'text-white/60' : 'text-stone-500')}>{syncMessage}</div>
          )}
        </section>

        {/* ═══ Поиск и фильтры ═══ */}
        <section className="space-y-2">
          <div className="relative">
            <Search size={16} className={cn('absolute left-3 top-1/2 -translate-y-1/2', isDark ? 'text-white/30' : 'text-stone-400')} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск: бурятское слово или перевод…"
              className={cn(
                'w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm',
                isDark ? 'bg-white/10 border-white/10 text-white placeholder-white/30' : 'bg-white border-stone-200 text-stone-900',
              )}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <select
              value={dialectFilter}
              onChange={(e) => setDialectFilter(e.target.value)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs border shrink-0',
                isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-700',
              )}
            >
              <option value="">Все диалекты</option>
              <option value="none">Без диалекта</option>
              {dialects.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as '' | WordStatus)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs border shrink-0',
                isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-700',
              )}
            >
              <option value="">Все статусы</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              onClick={() => setDirtyOnly((v) => !v)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 border',
                dirtyOnly
                  ? isDark ? 'bg-violet-500/30 border-violet-500/30 text-violet-200' : 'bg-violet-100 border-violet-200 text-violet-700'
                  : isDark ? 'bg-white/10 border-white/10 text-white/50' : 'bg-white border-stone-200 text-stone-500',
              )}
            >
              Изменённые{pendingCount ? ` (${pendingCount})` : ''}
            </button>
          </div>
        </section>

        {/* ═══ Список слов ═══ */}
        <section className="space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className={cn('animate-spin', isDark ? 'text-white/30' : 'text-stone-400')} />
            </div>
          ) : filtered.length === 0 ? (
            <div className={cn('text-center text-sm py-10', isDark ? 'text-white/40' : 'text-stone-400')}>
              {records.length === 0 ? 'Локальный словарь пуст. Скачай словарь при сети.' : 'Ничего не найдено'}
            </div>
          ) : (
            <>
              <div className={cn('text-xs px-1', isDark ? 'text-white/40' : 'text-stone-400')}>
                Найдено: {filtered.length}
              </div>
              {filtered.slice(0, visible).map((r) => (
                <div
                  key={r.key}
                  className={cn(
                    'p-3 rounded-xl border flex items-center gap-3',
                    r.syncError
                      ? isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
                      : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'font-bold text-sm',
                        r.dirty === 'deleted' && 'line-through opacity-50',
                        isDark ? 'text-white' : 'text-stone-900',
                      )}>
                        {r.word.bur}
                      </span>
                      <span className={cn('text-sm truncate', isDark ? 'text-white/60' : 'text-stone-500')}>
                        {r.word.ru}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', statusBadgeClass(r.word.status, isDark))}>
                        {STATUS_LABELS[r.word.status]}
                      </span>
                      {dialectName(r) && (
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700',
                        )}>
                          {dialectName(r)}
                        </span>
                      )}
                      {r.dirty !== 'none' && (
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-bold',
                          isDark ? 'bg-violet-500/25 text-violet-300' : 'bg-violet-100 text-violet-700',
                        )}>
                          ● {DIRTY_LABELS[r.dirty]}
                        </span>
                      )}
                    </div>
                    {r.syncError && (
                      <div className={cn('text-[11px] mt-1 flex items-center gap-1.5', isDark ? 'text-red-300' : 'text-red-600')}>
                        <AlertTriangle size={11} className="shrink-0" />
                        <span className="truncate">{r.syncError}</span>
                        <button
                          onClick={() => void retryWordSync(r.key).then(reload)}
                          className="underline shrink-0 flex items-center gap-0.5"
                        >
                          <RotateCcw size={10} /> повторить
                        </button>
                      </div>
                    )}
                  </div>
                  {r.dirty !== 'deleted' && (
                    <button
                      onClick={() => setEditing(r)}
                      className={cn(
                        'p-2 rounded-lg shrink-0',
                        isDark ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-stone-100 text-stone-500 hover:bg-stone-200',
                      )}
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
              ))}
              {filtered.length > visible && (
                <button
                  onClick={() => setVisible((v) => v + PAGE)}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-medium',
                    isDark ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-stone-100 text-stone-500 hover:bg-stone-200',
                  )}
                >
                  Показать ещё ({filtered.length - visible})
                </button>
              )}
            </>
          )}
        </section>

        {/* ═══ Кнопка добавления ═══ */}
        <button
          onClick={() => setEditing('new')}
          className={cn(
            'fixed bottom-6 right-6 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center',
            isDark ? 'bg-violet-500 text-white' : 'bg-violet-600 text-white',
          )}
        >
          <Plus size={24} />
        </button>
      </main>

      {/* ═══ Модалка формы ═══ */}
      <AnimatePresence>
        {editing && (
          <WordForm
            record={editing === 'new' ? null : editing}
            dialects={dialects}
            categories={categories}
            isDark={isDark}
            onSave={async (fields) => {
              await saveWordLocal(editing === 'new' ? null : editing.key, fields);
              await reload();
            }}
            onDelete={
              editing === 'new'
                ? undefined
                : async () => {
                    await deleteWordLocal(editing.key);
                    await reload();
                  }
            }
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDictionaryScreen;

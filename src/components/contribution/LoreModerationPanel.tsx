// Очередь «народного учебника» (модератор/админ): одобрить или отклонить
// факты/истории/пословицы пользователей. Одобрение даёт автору XP и доверие.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Pencil, ShieldCheck, Trash2, User, X } from 'lucide-react';
import { cn } from '../ui';
import { useTheme } from '../../theme/ThemeContext';
import {
  deleteLoreItem,
  getPendingLore,
  moderateLoreItem,
  nativeCheckLoreItem,
  updateLoreItem,
  type LoreItem,
} from '../../services/api';
import { LORE_TYPE_META } from '../lore/loreMeta';

export const LoreModerationPanel: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [items, setItems] = useState<LoreItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPendingLore()
      .then((list) => { if (!cancelled) setItems(list); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  const drop = (id: string) => setItems((prev) => (prev ?? []).filter((r) => r._id !== id));
  const patch = (id: string, upd: Partial<LoreItem>) =>
    setItems((prev) => (prev ?? []).map((r) => (r._id === id ? { ...r, ...upd } : r)));

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    if (busyId) return;
    let reason: string | undefined;
    if (status === 'rejected') {
      const input = window.prompt('Причина отклонения (увидит автор):', '');
      if (input === null) return; // передумал
      reason = input.trim() || undefined;
    }
    setBusyId(id);
    try {
      await moderateLoreItem(id, status, reason);
      drop(id);
    } catch {
      /* оставляем в списке */
    } finally {
      setBusyId(null);
    }
  };

  // Правка перед одобрением: быстрое исправление опечаток через prompt
  const editItem = async (r: LoreItem) => {
    if (busyId) return;
    const title = window.prompt('Заголовок:', r.title);
    if (title === null) return;
    const bodyRu = window.prompt('Текст по-русски:', r.bodyRu);
    if (bodyRu === null) return;
    const bodyBur = window.prompt('Текст по-бурятски (пусто — оставить):', r.bodyBur ?? '');
    if (bodyBur === null) return;
    setBusyId(r._id);
    try {
      const upd = await updateLoreItem(r._id, {
        title: title.trim() || r.title,
        bodyRu: bodyRu.trim() || r.bodyRu,
        ...(bodyBur.trim() ? { bodyBur: bodyBur.trim() } : {}),
      });
      patch(r._id, { title: upd.title, bodyRu: upd.bodyRu, bodyBur: upd.bodyBur });
    } catch {
      /* no-op */
    } finally {
      setBusyId(null);
    }
  };

  // «Верно, носитель»: отметка носителя + одобрение одним действием
  const nativeApprove = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await nativeCheckLoreItem(id);
      await moderateLoreItem(id, 'approved');
      drop(id);
    } catch {
      /* no-op */
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (id: string) => {
    if (busyId) return;
    if (!window.confirm('Удалить запись безвозвратно?')) return;
    setBusyId(id);
    try {
      await deleteLoreItem(id);
      drop(id);
    } catch {
      /* no-op */
    } finally {
      setBusyId(null);
    }
  };

  if (items === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-amber-500" size={28} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn(
        'rounded-2xl p-6 border text-center text-sm',
        isDark ? 'bg-stone-800/60 border-stone-700/50' : 'bg-white border-stone-200 shadow-sm',
        theme.text.muted,
      )}>
        Очередь историй пуста 🎉
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {items.map((r) => {
          const meta = LORE_TYPE_META[r.type] ?? LORE_TYPE_META.story;
          const TypeIcon = meta.icon;
          return (
          <motion.div
            key={r._id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className={cn(
              'rounded-2xl p-4 border',
              isDark ? 'bg-stone-800/60 border-stone-700/50' : 'bg-white border-stone-200 shadow-sm',
            )}
          >
            <div className="flex items-start gap-3">
              <span className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                isDark ? meta.chip : meta.chipLight,
              )}>
                <TypeIcon size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('font-bold text-sm', theme.text.primary)}>{r.title}</span>
                  <span className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded',
                    isDark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-500',
                  )}>
                    {meta.label}
                  </span>
                  {r.lessonSlug && (
                    <span className={cn(
                      'text-[11px] px-1.5 py-0.5 rounded',
                      isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700',
                    )}>
                      урок: {r.lessonSlug}
                    </span>
                  )}
                </div>
                {r.bodyBur && (
                  <p className={cn('text-[13px] font-bold mt-1.5', isDark ? 'text-amber-300' : 'text-amber-700')}>
                    {r.bodyBur}
                  </p>
                )}
                <p className={cn('text-xs mt-1.5 whitespace-pre-line', theme.text.secondary)}>{r.bodyRu}</p>
                <p className={cn('text-[11px] mt-1.5 flex items-center gap-1', theme.text.dimmed)}>
                  <User size={10} /> {r.contributorName ?? 'аноним'}
                  {r.attribution ? ` · ${r.attribution}` : ''}
                  {r.lessonSlug && r.relatedBur && r.relatedBur.length > 0 ? ` · ${r.relatedBur.join(', ')}` : ''}
                </p>

                {/* Вторичные действия: правка / носитель+одобрить / удалить */}
                <div className="flex items-center gap-3 mt-2.5">
                  <button
                    type="button"
                    disabled={busyId === r._id}
                    onClick={() => void editItem(r)}
                    className={cn('flex items-center gap-1 text-[11px] font-semibold disabled:opacity-50', theme.text.muted)}
                  >
                    <Pencil size={12} /> Правка
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r._id}
                    onClick={() => void nativeApprove(r._id)}
                    title="Отметить носителем и одобрить"
                    className={cn('flex items-center gap-1 text-[11px] font-semibold disabled:opacity-50', isDark ? 'text-emerald-400' : 'text-emerald-600')}
                  >
                    <ShieldCheck size={12} /> Носитель
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r._id}
                    onClick={() => void removeItem(r._id)}
                    className={cn('flex items-center gap-1 text-[11px] font-semibold disabled:opacity-50 ml-auto', isDark ? 'text-red-400/80' : 'text-red-500/80')}
                  >
                    <Trash2 size={12} /> Удалить
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  disabled={busyId === r._id}
                  onClick={() => void decide(r._id, 'approved')}
                  aria-label="Одобрить"
                  title="Одобрить (автор получит +25 XP)"
                  className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center active:scale-95 transition disabled:opacity-50"
                >
                  {busyId === r._id ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
                </button>
                <button
                  type="button"
                  disabled={busyId === r._id}
                  onClick={() => void decide(r._id, 'rejected')}
                  aria-label="Отклонить"
                  title="Отклонить с причиной"
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition disabled:opacity-50',
                    isDark ? 'bg-stone-700 text-red-400' : 'bg-stone-100 text-red-500',
                  )}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

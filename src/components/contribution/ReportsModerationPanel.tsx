// Очередь жалоб на контент (модератор/админ): решить или отклонить.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Flag, Loader2, User, X } from 'lucide-react';
import { cn } from '../ui';
import { useTheme } from '../../theme/ThemeContext';
import {
  getOpenContentReports,
  resolveContentReport,
  type ContentReport,
} from '../../services/api';

const REASON_LABELS: Record<string, string> = {
  incorrect: 'Недостоверный перевод / ошибка',
  duplicate: 'Дубликат',
  offensive: 'Оскорбительное',
  spam: 'Спам',
  other: 'Другое',
};

export const ReportsModerationPanel: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [items, setItems] = useState<ContentReport[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOpenContentReports()
      .then((list) => { if (!cancelled) setItems(list); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  const decide = async (id: string, status: 'resolved' | 'dismissed') => {
    if (busyId) return;
    setBusyId(id);
    try {
      await resolveContentReport(id, status);
      setItems((prev) => (prev ?? []).filter((r) => r._id !== id));
    } catch {
      /* оставляем в списке */
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
        Открытых жалоб нет 🎉
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {items.map((r) => (
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
                'bg-red-500/15 text-red-400',
              )}>
                <Flag size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('font-bold text-sm', isDark ? 'text-amber-400' : 'text-amber-600')}>
                    {r.wordBur ? `${r.wordBur} — ${r.wordRu}` : `уровень ${r.levelSlug}`}
                  </span>
                  <span className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded',
                    isDark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-500',
                  )}>
                    {REASON_LABELS[r.type] ?? r.type}
                  </span>
                </div>
                {r.message && (
                  <p className={cn('text-xs mt-1.5', theme.text.secondary)}>{r.message}</p>
                )}
                <p className={cn('text-[11px] mt-1.5 flex items-center gap-1', theme.text.dimmed)}>
                  <User size={10} /> {r.reporterName ?? 'аноним'}
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  disabled={busyId === r._id}
                  onClick={() => void decide(r._id, 'resolved')}
                  aria-label="Решено"
                  title="Решено (проблема исправлена)"
                  className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center active:scale-95 transition disabled:opacity-50"
                >
                  {busyId === r._id ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
                </button>
                <button
                  type="button"
                  disabled={busyId === r._id}
                  onClick={() => void decide(r._id, 'dismissed')}
                  aria-label="Отклонить"
                  title="Отклонить жалобу"
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
        ))}
      </AnimatePresence>
    </div>
  );
};

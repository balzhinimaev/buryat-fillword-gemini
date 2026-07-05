// Очередь модерации пользовательских озвучек (модератор/админ):
// слушаем запись → одобряем (становится озвучкой слова) или отклоняем.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, User, X } from 'lucide-react';
import { cn } from '../ui';
import { useTheme } from '../../theme/ThemeContext';
import { WaveAudioButton } from '../WaveAudioButton';
import {
  getPendingAudioSuggestions,
  moderateAudioSuggestion,
  type AudioSuggestion,
} from '../../services/api';

export const AudioModerationPanel: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [items, setItems] = useState<AudioSuggestion[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPendingAudioSuggestions()
      .then((list) => { if (!cancelled) setItems(list); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    if (busyId) return;
    setBusyId(id);
    setError('');
    try {
      const reason = status === 'rejected'
        ? (window.prompt('Причина отклонения (необязательно):') ?? undefined)
        : undefined;
      await moderateAudioSuggestion(id, status, reason || undefined);
      setItems((prev) => (prev ?? []).filter((s) => s._id !== id));
    } catch (e) {
      setError((e as { message?: string })?.message || 'Не удалось сохранить решение');
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
        Очередь пуста — все озвучки проверены 🎉
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-400 px-1">{error}</p>}
      <AnimatePresence>
        {items.map((s) => (
          <motion.div
            key={s._id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className={cn(
              'rounded-2xl p-4 border flex items-center gap-3',
              isDark ? 'bg-stone-800/60 border-stone-700/50' : 'bg-white border-stone-200 shadow-sm',
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('font-bold', isDark ? 'text-amber-400' : 'text-amber-600')}>
                  {s.wordBur ?? '—'}
                </span>
                <span className={cn('text-sm truncate', theme.text.secondary)}>{s.wordRu}</span>
                {s.target === 'example' && (
                  <span className={cn('text-[11px]', theme.text.dimmed)}>пример</span>
                )}
                {typeof s.dialectId === 'object' && s.dialectId?.name && (
                  <span className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded',
                    isDark ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-500',
                  )}>
                    {s.dialectId.name}
                  </span>
                )}
              </div>
              <p className={cn('text-[11px] mt-1 flex items-center gap-1', theme.text.dimmed)}>
                <User size={10} /> {s.contributor?.name ?? 'аноним'}
              </p>
            </div>

            {s.fileUrl && <WaveAudioButton src={s.fileUrl} size="sm" />}

            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={busyId === s._id}
                onClick={() => void decide(s._id, 'approved')}
                aria-label="Одобрить"
                className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center active:scale-95 transition disabled:opacity-50"
              >
                {busyId === s._id ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
              </button>
              <button
                type="button"
                disabled={busyId === s._id}
                onClick={() => void decide(s._id, 'rejected')}
                aria-label="Отклонить"
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition disabled:opacity-50',
                  isDark ? 'bg-stone-700 text-red-400' : 'bg-stone-100 text-red-500',
                )}
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

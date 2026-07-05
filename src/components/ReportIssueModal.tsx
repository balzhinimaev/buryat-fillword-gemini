// Жалоба на контент: уровень целиком или конкретное слово.
// Причина + необязательный комментарий → POST /reports (модерация в мастерской).
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Flag, Loader2, X } from 'lucide-react';
import { cn } from './ui';
import { useTheme } from '../theme/ThemeContext';
import { createContentReport, type ContentReportType } from '../services/api';

const REASONS: Array<{ id: ContentReportType; label: string }> = [
  { id: 'incorrect', label: 'Недостоверный перевод / ошибка' },
  { id: 'duplicate', label: 'Дубликат' },
  { id: 'offensive', label: 'Оскорбительное содержание' },
  { id: 'other', label: 'Другое' },
];

interface Props {
  /** жалоба на слово */
  wordId?: string;
  /** жалоба на уровень */
  levelSlug?: string;
  /** подпись цели, например «уровень nature-3» или слово */
  targetLabel: string;
  onClose(): void;
}

export const ReportIssueModal: React.FC<Props> = ({ wordId, levelSlug, targetLabel, onClose }) => {
  const { theme, isDark } = useTheme();
  const [reason, setReason] = useState<ContentReportType>('incorrect');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await createContentReport({
        ...(wordId ? { wordId } : {}),
        ...(levelSlug ? { levelSlug } : {}),
        type: reason,
        message: message.trim() || undefined,
      });
      setDone(true);
      setTimeout(onClose, 1600);
    } catch (e) {
      const msg = (e as { message?: string })?.message || '';
      setError(
        msg.includes('already')
          ? 'Вы уже отправляли жалобу — спасибо, она на рассмотрении'
          : msg || 'Не удалось отправить',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5',
            isDark ? 'bg-stone-900 border border-stone-700/60' : 'bg-white',
          )}
        >
          {done ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
              <p className={cn('font-semibold', theme.text.primary)}>Жалоба отправлена</p>
              <p className={cn('text-sm mt-1', theme.text.muted)}>Спасибо, мы проверим!</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <h3 className={cn('text-lg font-bold flex items-center gap-2', theme.text.primary)}>
                  <Flag size={17} className="text-red-400" /> Сообщить о проблеме
                </h3>
                <button type="button" onClick={onClose} aria-label="Закрыть" className={cn('p-2 rounded-xl', isDark ? 'hover:bg-white/10' : 'hover:bg-stone-100')}>
                  <X size={18} className={theme.text.muted} />
                </button>
              </div>
              <p className={cn('text-xs mb-4 truncate', theme.text.muted)}>{targetLabel}</p>

              <div className="space-y-2 mb-4">
                {REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setReason(r.id)}
                    className={cn(
                      'w-full text-left px-3.5 py-3 rounded-xl border-2 text-sm font-medium transition',
                      reason === r.id
                        ? 'border-amber-500 ring-2 ring-amber-500/25'
                        : isDark ? 'border-stone-700/60' : 'border-stone-200',
                      theme.text.primary,
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Комментарий (необязательно): что именно не так?"
                className={cn(
                  'w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none transition mb-4',
                  isDark
                    ? 'bg-stone-800/80 border-stone-700 text-white focus:border-amber-500 placeholder:text-stone-500'
                    : 'bg-white border-stone-200 text-stone-800 focus:border-amber-400 placeholder:text-stone-400',
                )}
              />

              {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

              <button
                type="button"
                disabled={busy}
                onClick={() => void send()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Flag size={15} />}
                Отправить жалобу
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

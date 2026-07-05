// Редактирование существующего слова: автор правит свои слова (слово снова уходит
// на проверку), модератор/админ — любые. PATCH /words/:id (права проверяет бэкенд).
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Save, X } from 'lucide-react';
import { cn } from '../ui';
import { useTheme } from '../../theme/ThemeContext';
import {
  api,
  getDialects,
  updateWord,
  type ApiCategory,
  type ApiDialect,
  type UpdateWordRequest,
} from '../../services/api';

// структурный тип: подходит и ApiWord, и ApiWordDetail (populated-поля)
export interface EditableWordShape {
  _id: string;
  bur: string;
  ru: string;
  translations?: Record<string, string>;
  exampleBur?: string;
  exampleRu?: string;
  dialectId?: { _id: string } | string | null;
  categoryId?: { _id: string } | string | null;
}

interface Props {
  word: EditableWordShape;
  /** автор без прав модератора: после правки слово снова уйдёт на проверку */
  willResetToPending: boolean;
  onSaved(): void;
  onClose(): void;
}

export const EditWordModal: React.FC<Props> = ({ word, willResetToPending, onSaved, onClose }) => {
  const { theme, isDark } = useTheme();
  const [bur, setBur] = useState(word.bur);
  const [ru, setRu] = useState(word.ru);
  const [en, setEn] = useState(word.translations?.en ?? '');
  const [exampleBur, setExampleBur] = useState(word.exampleBur ?? '');
  const [exampleRu, setExampleRu] = useState(word.exampleRu ?? '');
  const [dialectId, setDialectId] = useState(
    typeof word.dialectId === 'object' ? word.dialectId?._id ?? '' : (word.dialectId ?? ''),
  );
  const [categoryId, setCategoryId] = useState(
    typeof word.categoryId === 'object' ? word.categoryId?._id ?? '' : (word.categoryId ?? ''),
  );
  const [dialects, setDialects] = useState<ApiDialect[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getDialects()
      .then((d) => { if (!cancelled) setDialects(d.sort((a, b) => a.sortOrder - b.sortOrder)); })
      .catch(() => {});
    api.getCategories()
      .then((c) => { if (!cancelled) setCategories(c.sort((a, b) => a.order - b.order)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    if (busy) return;
    if (!bur.trim() || !ru.trim()) {
      setError('Слово и перевод обязательны');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload: UpdateWordRequest = {
        bur: bur.trim().toUpperCase(),
        ru: ru.trim(),
        exampleBur: exampleBur.trim(),
        exampleRu: exampleRu.trim(),
        ...(en.trim() ? { translations: { ...(word.translations ?? {}), en: en.trim() } } : {}),
        ...(dialectId ? { dialectId } : {}),
        ...(categoryId ? { categoryId } : {}),
      };
      await updateWord(word._id, payload);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = cn(
    'w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition',
    isDark
      ? 'bg-stone-800/80 border-stone-700 text-white focus:border-amber-500'
      : 'bg-white border-stone-200 text-stone-800 focus:border-amber-400',
  );
  const labelCls = cn('block text-xs font-semibold mb-1.5', theme.text.muted);

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
            'w-full sm:max-w-md max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5',
            isDark ? 'bg-stone-900 border border-stone-700/60' : 'bg-white',
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn('text-lg font-bold', theme.text.primary)}>Редактировать слово</h3>
            <button type="button" onClick={onClose} aria-label="Закрыть" className={cn('p-2 rounded-xl', isDark ? 'hover:bg-white/10' : 'hover:bg-stone-100')}>
              <X size={18} className={theme.text.muted} />
            </button>
          </div>

          {willResetToPending && (
            <p className={cn(
              'text-xs mb-4 p-3 rounded-xl',
              isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700',
            )}>
              После правки слово снова уйдёт на проверку сообществу
            </p>
          )}

          <div className="space-y-3.5">
            <div>
              <label className={labelCls}>Бурятское слово</label>
              <input className={inputCls} value={bur} onChange={(e) => setBur(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Перевод (рус.)</label>
              <input className={inputCls} value={ru} onChange={(e) => setRu(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Перевод (англ.)</label>
              <input className={inputCls} value={en} onChange={(e) => setEn(e.target.value)} placeholder="необязательно" />
            </div>
            <div>
              <label className={labelCls}>Пример (бур.)</label>
              <textarea className={cn(inputCls, 'resize-none')} rows={2} value={exampleBur} onChange={(e) => setExampleBur(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Пример (рус.)</label>
              <textarea className={cn(inputCls, 'resize-none')} rows={2} value={exampleRu} onChange={(e) => setExampleRu(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Диалект</label>
                <select className={inputCls} value={dialectId} onChange={(e) => setDialectId(e.target.value)}>
                  <option value="">—</option>
                  {dialects.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Категория</label>
                <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

          <div className="flex gap-2 mt-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Сохранить
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className={cn(
                'px-5 py-3 rounded-xl font-semibold',
                isDark ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-600',
              )}
            >
              Отмена
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

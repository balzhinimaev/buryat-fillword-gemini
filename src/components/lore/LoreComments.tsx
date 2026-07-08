// Обсуждение статьи народного учебника: лента комментариев + поле ввода.
// Свой комментарий можно править/удалять; модератор удаляет любой.
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MessageCircle, Pencil, Send, Trash2 } from 'lucide-react';
import { cn } from '../ui';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../store/authStore';
import {
  addLoreComment,
  deleteLoreComment,
  editLoreComment,
  type LoreComment,
  type LoreItem,
} from '../../services/api';
import { OFFLINE } from '../../config/offline';

const dateLabel = (iso?: string): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

interface Props {
  article: LoreItem;
  onChanged(updated: LoreItem): void;
}

export const LoreComments: React.FC<Props> = ({ article, onChanged }) => {
  const { theme, isDark } = useTheme();
  const { state: authState } = useAuth();
  const myId = authState.user?._id;
  const role = authState.user?.role ?? 'user';
  const canModerate = role === 'moderator' || role === 'admin';
  const isAuthed = !!myId;

  const comments = article.comments ?? [];
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState('');

  const inputCls = cn(
    'w-full px-3.5 py-3 rounded-xl border-2 text-sm outline-none transition resize-none',
    isDark ? 'bg-stone-800/80 border-stone-700/70 text-white focus:border-amber-500 placeholder:text-stone-500'
           : 'bg-stone-50 border-stone-200 text-stone-800 focus:border-amber-400 focus:bg-white placeholder:text-stone-400',
  );

  const submit = async () => {
    if (busy || text.trim().length < 1) return;
    setBusy(true); setError('');
    try {
      const updated = await addLoreComment(article._id, text.trim());
      onChanged(updated);
      setText('');
    } catch (e) {
      const msg = (e as { message?: string })?.message || '';
      setError(msg.includes('лексик') ? 'В комментарии есть недопустимые слова' : (msg || 'Не удалось отправить'));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (c: LoreComment) => {
    if (busy || editText.trim().length < 1) return;
    setBusy(true); setEditError('');
    try {
      const updated = await editLoreComment(article._id, c._id, editText.trim());
      onChanged(updated);
      setEditingId(null);
    } catch (e) {
      const msg = (e as { message?: string })?.message || '';
      setEditError(msg.includes('лексик') ? 'В комментарии есть недопустимые слова' : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: LoreComment) => {
    if (busy || !window.confirm('Удалить комментарий?')) return;
    setBusy(true);
    try {
      const updated = await deleteLoreComment(article._id, c._id);
      onChanged(updated);
    } catch {
      /* no-op */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle size={16} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
        <span className={cn('text-[11px] font-bold uppercase tracking-[0.14em]', theme.text.dimmed)}>
          Обсуждение{comments.length ? ` · ${comments.length}` : ''}
        </span>
      </div>

      {/* Поле ввода */}
      {isAuthed && !OFFLINE ? (
        <div className="mb-4">
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder="Оставить комментарий…"
            className={inputCls}
          />
          {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
          <div className="flex justify-end mt-2">
            <button
              type="button"
              disabled={busy || !text.trim()}
              onClick={() => void submit()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98] transition"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
              Отправить
            </button>
          </div>
        </div>
      ) : (
        <p className={cn('text-xs mb-4 rounded-xl px-3 py-2.5', isDark ? 'bg-white/5 text-stone-400' : 'bg-stone-100 text-stone-500')}>
          {OFFLINE ? 'Комментарии доступны при подключении к интернету' : 'Войдите в аккаунт, чтобы комментировать'}
        </p>
      )}

      {/* Лента */}
      {comments.length === 0 ? (
        <p className={cn('text-sm text-center py-4', theme.text.dimmed)}>Пока нет комментариев. Будьте первым!</p>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence>
            {comments.map((c) => {
              const mine = !!myId && String(c.userId) === String(myId);
              const canEdit = mine;
              const canDelete = mine || canModerate;
              return (
                <motion.div
                  key={c._id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  className={cn('rounded-xl px-3.5 py-3 border', isDark ? 'bg-stone-800/50 border-stone-700/50' : 'bg-white border-stone-100 shadow-sm')}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 overflow-hidden', isDark ? 'bg-amber-500/25 text-amber-300' : 'bg-amber-200 text-amber-800')}>
                      {c.userPhotoUrl
                        ? <img src={c.userPhotoUrl} alt="" className="w-full h-full object-cover" />
                        : (c.userName || 'У').slice(0, 1).toUpperCase()}
                    </span>
                    <span className={cn('text-xs font-bold truncate', theme.text.primary)}>{c.userName || 'участник'}</span>
                    <span className={cn('text-[10px] ml-auto', theme.text.dimmed)}>{dateLabel(c.createdAt)}</span>
                  </div>

                  {editingId === c._id ? (
                    <div className="mt-2">
                      <textarea rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={1000} className={inputCls} />
                      {editError && <p className="text-xs text-red-400 mt-1">{editError}</p>}
                      <div className="flex justify-end gap-2 mt-1.5">
                        <button type="button" onClick={() => { setEditingId(null); setEditError(''); }} className={cn('text-xs px-2 py-1', theme.text.muted)}>Отмена</button>
                        <button type="button" disabled={busy} onClick={() => void saveEdit(c)} className="text-xs font-bold px-3 py-1 rounded-lg bg-amber-500 text-white disabled:opacity-50">Сохранить</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={cn('text-[13px] mt-1.5 leading-relaxed whitespace-pre-line', theme.text.secondary)}>{c.text}</p>
                      {(canEdit || canDelete) && (
                        <div className="flex items-center gap-3 mt-2">
                          {canEdit && (
                            <button type="button" onClick={() => { setEditingId(c._id); setEditText(c.text); setEditError(''); }} className={cn('flex items-center gap-1 text-[11px] font-semibold', theme.text.dimmed)}>
                              <Pencil size={11} /> Править
                            </button>
                          )}
                          {canDelete && (
                            <button type="button" disabled={busy} onClick={() => void remove(c)} className={cn('flex items-center gap-1 text-[11px] font-semibold disabled:opacity-50', isDark ? 'text-red-400/80' : 'text-red-500/80')}>
                              <Trash2 size={11} /> Удалить
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

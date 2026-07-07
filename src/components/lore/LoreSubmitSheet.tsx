// Форма «народного учебника»: пользователь присылает факт/историю/пословицу/пример
// к уроку → POST /lore (+ опц. голосовая запись, диалект, привязка к словам) →
// модерация в мастерской → секция «Из сообщества».
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookHeart,
  CheckCircle2,
  Lightbulb,
  Loader2,
  MapPin,
  MessageCircle,
  Quote,
  ScrollText,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '../ui';
import { useTheme } from '../../theme/ThemeContext';
import {
  createLoreItem,
  getDialects,
  uploadLoreAudio,
  type ApiDialect,
  type LoreType,
} from '../../services/api';
import {
  AudioRecorderField,
  releaseAudioDraft,
  type AudioDraft,
} from '../contribution/AudioRecorderField';

const TYPES: Array<{
  id: LoreType;
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}> = [
  { id: 'story', label: 'История', hint: 'воспоминание, случай, байка', icon: BookHeart },
  { id: 'fact', label: 'Факт', hint: 'о языке, культуре, традициях', icon: Lightbulb },
  { id: 'proverb', label: 'Пословица', hint: 'оньһон үгэ с переводом', icon: Quote },
  { id: 'example', label: 'Пример', hint: 'фраза, как говорят у вас', icon: MessageCircle },
];

const needsBur = (t: LoreType) => t === 'proverb' || t === 'example';

const RU_PLACEHOLDER: Record<LoreType, string> = {
  story: 'Расскажите историю: кто, где, что говорил или делал…',
  fact: 'Изложите факт: что интересного вы знаете по теме урока?',
  proverb: 'Перевод пословицы и когда её говорят',
  example: 'Перевод фразы и в какой ситуации так говорят',
  correction: 'Что стоит поправить или дополнить в уроке?',
};

interface Props {
  lessonSlug: string;
  lessonTitle: string;
  /** «Вопрос недели» — показывается как подсказка-приглашение */
  prompt?: string | null;
  onClose(): void;
  onSubmitted?(): void;
}

export const LoreSubmitSheet: React.FC<Props> = ({ lessonSlug, lessonTitle, prompt, onClose, onSubmitted }) => {
  const { theme, isDark } = useTheme();
  const [type, setType] = useState<LoreType>('story');
  const [title, setTitle] = useState('');
  const [bodyBur, setBodyBur] = useState('');
  const [bodyRu, setBodyRu] = useState('');
  const [attribution, setAttribution] = useState('');
  const [relatedInput, setRelatedInput] = useState('');
  const [dialects, setDialects] = useState<ApiDialect[]>([]);
  const [dialectId, setDialectId] = useState<string>('');
  const [audio, setAudio] = useState<AudioDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getDialects().then((d) => { if (!cancelled) setDialects(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // освобождаем blob-URL записи при размонтировании
  useEffect(() => () => releaseAudioDraft(audio), [audio]);

  const labelCls = cn('block text-[11px] font-bold uppercase tracking-wider mb-1.5 px-0.5', theme.text.dimmed);
  const inputCls = cn(
    'w-full px-3.5 py-3 rounded-xl border-2 text-sm outline-none transition',
    isDark
      ? 'bg-stone-800/80 border-stone-700/70 text-white focus:border-amber-500 placeholder:text-stone-500'
      : 'bg-stone-50 border-stone-200 text-stone-800 focus:border-amber-400 focus:bg-white placeholder:text-stone-400',
  );

  const send = async () => {
    if (busy) return;
    setError('');
    if (title.trim().length < 3) { setError('Добавьте короткий заголовок (от 3 символов)'); return; }
    if (bodyRu.trim().length < 10) { setError('Расскажите чуть подробнее (от 10 символов)'); return; }
    if (needsBur(type) && !bodyBur.trim()) { setError('Для пословицы или примера нужен текст на бурятском'); return; }
    setBusy(true);
    try {
      const relatedBur = relatedInput
        .split(/[,\n;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);
      const created = await createLoreItem({
        type,
        lessonSlug,
        title: title.trim(),
        bodyBur: bodyBur.trim() || undefined,
        bodyRu: bodyRu.trim(),
        attribution: attribution.trim() || undefined,
        dialectId: dialectId || undefined,
        relatedBur: relatedBur.length ? relatedBur : undefined,
      });
      // голосовая запись — best-effort, не валит подачу
      if (audio && created?._id) {
        try { await uploadLoreAudio(created._id, audio.blob, audio.fileName); } catch { /* аудио опционально */ }
      }
      setDone(true);
      onSubmitted?.();
      setTimeout(onClose, 2400);
    } catch (e) {
      const msg = (e as { message?: string })?.message || '';
      setError(
        msg.includes('Unauthorized') || msg.includes('401')
          ? 'Войдите в аккаунт, чтобы поделиться историей'
          : msg || 'Не удалось отправить — попробуйте позже',
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
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92dvh] overflow-y-auto overflow-x-hidden',
            isDark ? 'bg-stone-900 border border-stone-700/60' : 'bg-white',
          )}
        >
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="sticky top-0 pt-2.5 pb-1 flex justify-center sm:hidden">
            <span className={cn('w-10 h-1 rounded-full', isDark ? 'bg-stone-700' : 'bg-stone-200')} />
          </div>

          <div className="p-5 pt-2 sm:pt-5">
            {done ? (
              <div className="py-10 text-center">
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 260 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-lg"
                >
                  <CheckCircle2 size={30} />
                </motion.div>
                <p className={cn('font-extrabold text-lg', theme.text.primary)}>Спасибо!</p>
                <p className={cn('text-sm mt-1.5 leading-relaxed', theme.text.muted)}>
                  Запись ушла на проверку носителям
                  <br />и появится в уроке после одобрения.
                </p>
                <span className={cn(
                  'inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-xs font-bold',
                  'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md',
                )}>
                  <Sparkles size={12} /> +25 XP за одобренную запись
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
                      <ScrollText size={18} />
                    </span>
                    <div>
                      <h3 className={cn('text-lg font-extrabold leading-tight', theme.text.primary)}>
                        Дополнить учебник
                      </h3>
                      <p className={cn('text-[11px] mt-0.5 truncate', theme.text.muted)}>
                        к уроку «{lessonTitle}»
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Закрыть"
                    className={cn('p-2 -mr-1 rounded-xl transition', isDark ? 'hover:bg-white/10' : 'hover:bg-stone-100')}
                  >
                    <X size={18} className={theme.text.muted} />
                  </button>
                </div>

                {prompt && (
                  <div className={cn(
                    'flex items-start gap-2 mb-4 rounded-xl px-3 py-2.5 border',
                    isDark ? 'bg-amber-500/[0.08] border-amber-500/25' : 'bg-amber-50 border-amber-200',
                  )}>
                    <Sparkles size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className={cn('text-xs leading-relaxed', theme.text.secondary)}>{prompt}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-5">
                  {TYPES.map((t) => {
                    const active = type === t.id;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setType(t.id)}
                        className={cn(
                          'relative text-left px-3 py-2.5 rounded-xl border-2 transition active:scale-[0.98]',
                          active
                            ? 'border-amber-500 ring-2 ring-amber-500/25 ' + (isDark ? 'bg-amber-500/10' : 'bg-amber-50/70')
                            : isDark ? 'border-stone-700/60' : 'border-stone-200',
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <Icon size={14} className={active ? 'text-amber-500' : cn(theme.text.dimmed)} />
                          <span className={cn('text-sm font-bold', active ? (isDark ? 'text-amber-300' : 'text-amber-700') : theme.text.primary)}>
                            {t.label}
                          </span>
                        </span>
                        <span className={cn('block text-[10px] mt-1 leading-tight', theme.text.dimmed)}>{t.hint}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3.5 mb-4">
                  <div>
                    <label className={labelCls}>Заголовок</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="О чём это? Коротко" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>
                      По-бурятски {needsBur(type)
                        ? <span className="text-amber-500 normal-case">— обязательно</span>
                        : <span className="normal-case font-medium">(если есть)</span>}
                    </label>
                    <textarea rows={2} value={bodyBur} onChange={(e) => setBodyBur(e.target.value)} maxLength={2000} placeholder={type === 'proverb' ? 'Оньһон үгэ…' : 'Текст на бурятском…'} className={cn(inputCls, 'resize-none')} />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <label className={labelCls}>По-русски</label>
                      {bodyRu.length > 0 && <span className={cn('text-[10px] tabular-nums', theme.text.dimmed)}>{bodyRu.length}/4000</span>}
                    </div>
                    <textarea rows={4} value={bodyRu} onChange={(e) => setBodyRu(e.target.value)} maxLength={4000} placeholder={RU_PLACEHOLDER[type]} className={cn(inputCls, 'resize-none')} />
                  </div>

                  {/* Диалект / регион — превращает истории в лингвистические данные */}
                  {dialects.length > 0 && (
                    <div>
                      <label className={labelCls}>Диалект <span className="normal-case font-medium">(если знаете)</span></label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDialectId('')}
                          className={cn(
                            'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition',
                            !dialectId
                              ? 'border-amber-500 ' + (isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700')
                              : isDark ? 'border-stone-700/60 text-stone-400' : 'border-stone-200 text-stone-500',
                          )}
                        >
                          Не знаю
                        </button>
                        {dialects.map((d) => (
                          <button
                            key={d._id}
                            type="button"
                            onClick={() => setDialectId(d._id)}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition',
                              dialectId === d._id
                                ? 'border-amber-500 ' + (isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700')
                                : isDark ? 'border-stone-700/60 text-stone-400' : 'border-stone-200 text-stone-500',
                            )}
                          >
                            {d.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Слова словаря <span className="normal-case font-medium">(через запятую, необязательно)</span></label>
                    <input value={relatedInput} onChange={(e) => setRelatedInput(e.target.value)} placeholder="ГАЛ, УҺАН — история попадёт на карточки этих слов" className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Источник <span className="normal-case font-medium">(необязательно)</span></label>
                    <div className="relative">
                      <MapPin size={14} className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none', theme.text.dimmed)} />
                      <input value={attribution} onChange={(e) => setAttribution(e.target.value)} maxLength={200} placeholder="От кого узнали, район или село" className={cn(inputCls, 'pl-9')} />
                    </div>
                  </div>

                  {/* Голосовая история — устная традиция */}
                  <div>
                    <label className={labelCls}>Голосом <span className="normal-case font-medium">(необязательно)</span></label>
                    <AudioRecorderField value={audio} onChange={setAudio} disabled={busy} />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn('text-xs mb-3 rounded-xl px-3 py-2.5 font-medium', isDark ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-600')}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition shadow-lg shadow-amber-500/20"
                >
                  {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={15} />}
                  Отправить на проверку
                </button>
                <p className={cn('text-[10px] mt-3 text-center leading-relaxed', theme.text.dimmed)}>
                  Записи проверяются модераторами и носителями языка.
                  <br />Лучшие закрепляются в уроке как «выбор редакции».
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Секция «Из сообщества» в уроке учебника: одобренные факты/истории/пословицы
// пользователей (featured первыми) + «Вопрос недели» + приглашение дополнить.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  PenLine,
  Pin,
  ScrollText,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
} from 'lucide-react';
import { cn } from '../ui';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../store/authStore';
import { getLessonLore, voteLoreItem, type LoreItem } from '../../services/api';
import { WaveAudioButton } from '../WaveAudioButton';
import { LoreSubmitSheet } from './LoreSubmitSheet';
import { LORE_TYPE_META } from './loreMeta';

const dateLabel = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

interface Props {
  lessonSlug: string;
  lessonTitle: string;
  /** «Вопрос недели» по теме урока (из textbook.json) */
  prompt?: string | null;
}

export const CommunityLoreSection: React.FC<Props> = ({ lessonSlug, lessonTitle, prompt }) => {
  const { theme, isDark } = useTheme();
  const { state: authState } = useAuth();
  const myId = authState.user?._id;

  const [loaded, setLoaded] = useState<{ slug: string; items: LoreItem[] } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submittedFor, setSubmittedFor] = useState<string | null>(null);
  const [showAllFor, setShowAllFor] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLessonLore(lessonSlug)
      .then((list) => { if (!cancelled) setLoaded({ slug: lessonSlug, items: list }); })
      .catch(() => { if (!cancelled) setLoaded({ slug: lessonSlug, items: [] }); });
    return () => { cancelled = true; };
  }, [lessonSlug]);

  const list = loaded?.slug === lessonSlug ? loaded.items : [];
  const showAll = showAllFor === lessonSlug;
  const submitted = submittedFor === lessonSlug;
  const visible = showAll ? list : list.slice(0, 3);

  const toggleVote = async (item: LoreItem) => {
    if (votingId || !myId) return;
    setVotingId(item._id);
    try {
      const updated = await voteLoreItem(item._id);
      setLoaded((prev) =>
        prev ? { ...prev, items: prev.items.map((i) => (i._id === item._id ? { ...i, upvotes: updated.upvotes } : i)) } : prev,
      );
    } catch {
      // офлайн/не авторизован — молча
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-4 border',
        isDark ? 'bg-stone-800/60 border-stone-700/50' : 'bg-white border-stone-100 shadow-sm',
      )}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600')}>
          <ScrollText size={14} />
        </span>
        <span className={cn('text-[11px] font-bold uppercase tracking-[0.14em]', theme.text.dimmed)}>Из сообщества</span>
        {list.length > 0 && (
          <span className={cn('ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full', isDark ? 'bg-white/10 text-stone-300' : 'bg-stone-100 text-stone-500')}>
            {list.length}
          </span>
        )}
      </div>

      {/* Вопрос недели */}
      {prompt && (
        <div className={cn('flex items-start gap-2 mb-3 rounded-xl px-3 py-2.5 border', isDark ? 'bg-amber-500/[0.08] border-amber-500/25' : 'bg-amber-50 border-amber-200')}>
          <Sparkles size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className={cn('text-[10px] font-bold uppercase tracking-wider', isDark ? 'text-amber-400' : 'text-amber-600')}>Вопрос недели</div>
            <p className={cn('text-xs mt-0.5 leading-relaxed', theme.text.secondary)}>{prompt}</p>
          </div>
        </div>
      )}

      {list.length > 0 && (
        <div className="space-y-2.5">
          {visible.map((item, i) => {
            const meta = LORE_TYPE_META[item.type] ?? LORE_TYPE_META.story;
            const TypeIcon = meta.icon;
            const votes = item.upvotes?.length ?? 0;
            const voted = !!myId && !!item.upvotes?.includes(myId);
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.25), duration: 0.3 }}
                className={cn(
                  'relative overflow-hidden rounded-xl px-3.5 py-3 border',
                  item.featured
                    ? isDark ? 'bg-gradient-to-br from-amber-500/[0.12] to-transparent border-amber-500/30' : 'bg-gradient-to-br from-amber-50 to-white border-amber-200'
                    : isDark ? 'bg-white/[0.03] border-white/5' : 'bg-stone-50 border-stone-100',
                )}
              >
                {item.featured && <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />}

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-[3px] rounded-md', isDark ? meta.chip : meta.chipLight)}>
                    <TypeIcon size={10} />
                    {meta.label}
                  </span>
                  {item.featured && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-[3px] rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
                      <Pin size={9} /> выбор редакции
                    </span>
                  )}
                  {item.nativeCheckedAt && (
                    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-[3px] rounded-md', isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700')}>
                      <ShieldCheck size={9} /> носитель
                    </span>
                  )}
                  <span className={cn('ml-auto text-[10px]', theme.text.dimmed)}>{dateLabel(item.createdAt)}</span>
                </div>

                <div className={cn('font-bold text-[13.5px] mt-2 leading-snug', theme.text.primary)}>{item.title}</div>

                {item.bodyBur && (
                  <div className={cn('mt-1.5 rounded-lg px-2.5 py-2 border-l-[3px] text-[14px] font-bold leading-snug', isDark ? 'bg-white/[0.04] border-l-amber-400/70 text-amber-300' : 'bg-amber-50/70 border-l-amber-400 text-amber-800')}>
                    {item.type === 'proverb' ? `«${item.bodyBur}»` : item.bodyBur}
                  </div>
                )}

                <p className={cn('text-xs mt-1.5 leading-relaxed whitespace-pre-line', theme.text.secondary)}>{item.bodyRu}</p>

                {/* Голосовая история */}
                {item.audioUrl && (
                  <div className="mt-2">
                    <WaveAudioButton src={item.audioUrl} size="sm" />
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2.5">
                  <span className={cn('w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-extrabold flex-shrink-0', isDark ? 'bg-amber-500/25 text-amber-300' : 'bg-amber-200 text-amber-800')}>
                    {(item.contributorName ?? 'У').slice(0, 1).toUpperCase()}
                  </span>
                  <span className={cn('text-[10px] truncate flex-1', theme.text.dimmed)}>
                    {item.contributorName ?? 'участник'}
                    {item.attribution ? ` · ${item.attribution}` : ''}
                  </span>
                  {/* 👍 голос сообщества */}
                  <button
                    type="button"
                    disabled={!myId || votingId === item._id}
                    onClick={() => void toggleVote(item)}
                    aria-label="Нравится"
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 disabled:opacity-60',
                      voted
                        ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'
                        : isDark ? 'bg-white/5 text-stone-400' : 'bg-stone-100 text-stone-500',
                    )}
                  >
                    <ThumbsUp size={11} className={voted ? 'fill-current' : ''} />
                    {votes > 0 ? votes : ''}
                  </button>
                </div>
              </motion.div>
            );
          })}

          {!showAll && list.length > visible.length && (
            <button
              type="button"
              onClick={() => setShowAllFor(lessonSlug)}
              className={cn('w-full flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-xl transition active:scale-[0.99]', isDark ? 'text-amber-400 bg-white/[0.03]' : 'text-amber-600 bg-amber-50/60')}
            >
              Ещё {list.length - visible.length} <ChevronDown size={13} />
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <p className={cn('text-xs mt-3 rounded-xl px-3 py-2.5 font-medium flex items-center gap-2', isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700')}>
              <Sparkles size={13} className="flex-shrink-0" />
              Спасибо! Запись появится здесь после проверки — за одобренную +25 XP.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className={cn(
          'w-full mt-3 rounded-xl p-3 flex items-center gap-3 text-left border transition active:scale-[0.99]',
          isDark ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/25' : 'bg-gradient-to-r from-amber-50 to-white border-amber-200',
        )}
      >
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
          <PenLine size={16} />
        </span>
        <span className="flex-1 min-w-0">
          <span className={cn('block text-sm font-bold', theme.text.primary)}>
            {list.length === 0 ? 'Станьте первым автором' : 'Дополнить учебник'}
          </span>
          <span className={cn('block text-[11px] mt-0.5 leading-tight', theme.text.muted)}>
            Поделитесь фактом, историей или пословицей · +25 XP
          </span>
        </span>
        <Sparkles size={15} className="text-amber-400 flex-shrink-0" />
      </button>

      {formOpen && (
        <LoreSubmitSheet
          lessonSlug={lessonSlug}
          lessonTitle={lessonTitle}
          prompt={prompt}
          onClose={() => setFormOpen(false)}
          onSubmitted={() => setSubmittedFor(lessonSlug)}
        />
      )}
    </div>
  );
};

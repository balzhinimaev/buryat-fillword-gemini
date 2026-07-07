// «Из сообщества» — общая лента народного учебника: все одобренные истории,
// факты, пословицы и примеры от носителей. Вопрос недели, фильтр по типу,
// голосование, аудио, переход в связанный урок, кнопка поделиться.
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Pin,
  ScrollText,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
} from 'lucide-react';
import { cn } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../store/authStore';
import type { GameStore } from '../store/gameStore';
import { getCommunityLore, voteLoreItem, type LoreItem, type LoreType } from '../services/api';
import { getTextbook, globalWeeklyPrompt } from '../services/textbook';
import { LORE_TYPE_META } from '../components/lore/loreMeta';
import { LoreSubmitSheet } from '../components/lore/LoreSubmitSheet';
import { WaveAudioButton } from '../components/WaveAudioButton';

interface Props {
  store: GameStore;
}

const FILTERS: Array<{ id: 'all' | LoreType; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'story', label: 'Истории' },
  { id: 'fact', label: 'Факты' },
  { id: 'proverb', label: 'Пословицы' },
  { id: 'example', label: 'Примеры' },
];

const dateLabel = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

export const CommunityLoreScreen: React.FC<Props> = ({ store }) => {
  const { theme, isDark } = useTheme();
  const { state: authState } = useAuth();
  const myId = authState.user?._id;

  const [items, setItems] = useState<LoreItem[] | null>(null);
  const [filter, setFilter] = useState<'all' | LoreType>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // slug урока → короткое название (для тега «к уроку …» и перехода)
  const lessonTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of getTextbook().units) map[u.slug] = u.title.replace(/^Урок \d+\. /, '');
    return map;
  }, []);

  const weekly = useMemo(() => globalWeeklyPrompt(), []);

  useEffect(() => {
    let cancelled = false;
    getCommunityLore()
      .then((list) => { if (!cancelled) setItems(list); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  const list = useMemo(() => items ?? [], [items]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    for (const i of list) c[i.type] = (c[i.type] ?? 0) + 1;
    return c;
  }, [list]);
  const visible = filter === 'all' ? list : list.filter((i) => i.type === filter);

  const toggleVote = async (item: LoreItem) => {
    if (votingId || !myId) return;
    setVotingId(item._id);
    try {
      const updated = await voteLoreItem(item._id);
      setItems((prev) => prev?.map((i) => (i._id === item._id ? { ...i, upvotes: updated.upvotes } : i)) ?? prev);
    } catch {
      /* офлайн/не авторизован */
    } finally {
      setVotingId(null);
    }
  };

  const openContribute = () => setFormOpen(true);

  return (
    <div className={cn('min-h-screen flex flex-col', theme.backgrounds.primaryGradient)}>
      {/* Шапка */}
      <header className={cn('relative overflow-hidden p-4 pb-5', isDark ? '' : 'rounded-b-3xl shadow-lg', theme.header.bg, theme.header.text)}>
        <div className="absolute -top-12 -right-8 w-40 h-40 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2">
          <button onClick={store.goBack} aria-label="Назад" className="p-2 -ml-2 rounded-xl active:bg-white/10">
            <ArrowLeft size={22} />
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">народный учебник</span>
        </div>
        <h1 className="text-xl font-extrabold leading-tight mt-1 px-1">Из сообщества</h1>
        <p className="text-xs opacity-70 mt-1.5 px-1 leading-relaxed">
          Истории, факты и пословицы, которыми делятся носители языка.
          {list.length > 0 ? ` Уже ${list.length}.` : ''}
        </p>
      </header>

      <main className="flex-1 p-4 space-y-3.5 pb-10">
        {/* Вопрос недели */}
        {weekly && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={openContribute}
            className={cn(
              'w-full text-left rounded-2xl p-4 border relative overflow-hidden active:scale-[0.99] transition',
              isDark ? 'bg-gradient-to-br from-amber-500/[0.12] to-transparent border-amber-500/30' : 'bg-gradient-to-br from-amber-50 to-white border-amber-200',
            )}
          >
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" />
              <span className={cn('text-[10px] font-bold uppercase tracking-wider', isDark ? 'text-amber-400' : 'text-amber-600')}>Вопрос недели</span>
            </div>
            <p className={cn('text-sm mt-1.5 leading-relaxed font-medium', theme.text.primary)}>{weekly.prompt}</p>
            <span className={cn('inline-flex items-center gap-1 text-xs font-bold mt-2', isDark ? 'text-amber-400' : 'text-amber-600')}>
              Ответить <ArrowRight size={13} />
            </span>
          </motion.button>
        )}

        {/* Фильтр по типу */}
        {list.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
            {FILTERS.filter((f) => f.id === 'all' || counts[f.id]).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition',
                  filter === f.id
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow'
                    : isDark ? 'bg-white/5 text-stone-400' : 'bg-stone-100 text-stone-500',
                )}
              >
                {f.label}{f.id !== 'all' && counts[f.id] ? ` ${counts[f.id]}` : ''}
              </button>
            ))}
          </div>
        )}

        {items === null ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-amber-500" size={28} />
          </div>
        ) : visible.length === 0 ? (
          <div className={cn('rounded-2xl p-8 text-center', isDark ? 'bg-stone-800/50' : 'bg-white shadow-sm')}>
            <ScrollText size={28} className={cn('mx-auto mb-3', theme.text.dimmed)} />
            <p className={cn('text-sm', theme.text.muted)}>Здесь пока пусто. Станьте первым, кто поделится историей.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((item, i) => {
              const meta = LORE_TYPE_META[item.type] ?? LORE_TYPE_META.story;
              const TypeIcon = meta.icon;
              const votes = item.upvotes?.length ?? 0;
              const voted = !!myId && !!item.upvotes?.includes(myId);
              const isLong = item.bodyRu.length > 300;
              const isOpen = expanded.has(item._id);
              const lessonTitle = item.lessonSlug ? lessonTitles[item.lessonSlug] : undefined;
              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.25) }}
                  className={cn(
                    'relative overflow-hidden rounded-2xl px-4 py-3.5 border',
                    item.featured
                      ? isDark ? 'bg-gradient-to-br from-amber-500/[0.1] to-transparent border-amber-500/30' : 'bg-gradient-to-br from-amber-50 to-white border-amber-200'
                      : isDark ? 'bg-stone-800/60 border-stone-700/50' : 'bg-white border-stone-100 shadow-sm',
                  )}
                >
                  {item.featured && <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-[3px] rounded-md', isDark ? meta.chip : meta.chipLight)}>
                      <TypeIcon size={10} /> {meta.label}
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

                  <div className={cn('font-bold text-[14px] mt-2 leading-snug', theme.text.primary)}>{item.title}</div>

                  {item.bodyBur && (
                    <div className={cn('mt-1.5 rounded-lg px-2.5 py-2 border-l-[3px] text-[14px] font-bold leading-snug', isDark ? 'bg-white/[0.04] border-l-amber-400/70 text-amber-300' : 'bg-amber-50/70 border-l-amber-400 text-amber-800')}>
                      {item.type === 'proverb' ? `«${item.bodyBur}»` : item.bodyBur}
                    </div>
                  )}

                  <p className={cn('text-[13px] mt-1.5 leading-relaxed whitespace-pre-line', theme.text.secondary, isLong && !isOpen ? 'line-clamp-4' : '')}>
                    {item.bodyRu}
                  </p>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => { const n = new Set(prev); if (n.has(item._id)) n.delete(item._id); else n.add(item._id); return n; })}
                      className={cn('text-[11px] font-bold mt-1', isDark ? 'text-amber-400' : 'text-amber-600')}
                    >
                      {isOpen ? 'Свернуть' : 'Читать далее'}
                    </button>
                  )}

                  {item.audioUrl && (
                    <div className="mt-2"><WaveAudioButton src={item.audioUrl} size="sm" /></div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <span className={cn('w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-extrabold flex-shrink-0', isDark ? 'bg-amber-500/25 text-amber-300' : 'bg-amber-200 text-amber-800')}>
                      {(item.contributorName ?? 'У').slice(0, 1).toUpperCase()}
                    </span>
                    <span className={cn('text-[10px] truncate', theme.text.dimmed)}>
                      {item.contributorName ?? 'участник'}{item.attribution ? ` · ${item.attribution}` : ''}
                    </span>
                    {lessonTitle && (
                      <button
                        type="button"
                        onClick={() => store.navigateToTextbookUnit(item.lessonSlug)}
                        className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md ml-1', isDark ? 'bg-white/5 text-stone-400' : 'bg-stone-100 text-stone-500')}
                      >
                        {lessonTitle}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!myId || votingId === item._id}
                      onClick={() => void toggleVote(item)}
                      aria-label="Нравится"
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 disabled:opacity-60 ml-auto',
                        voted ? (isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700') : (isDark ? 'bg-white/5 text-stone-400' : 'bg-stone-100 text-stone-500'),
                      )}
                    >
                      <ThumbsUp size={11} className={voted ? 'fill-current' : ''} />
                      {votes > 0 ? votes : ''}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Плавающая кнопка «Поделиться» */}
      <div className="sticky bottom-0 p-4 pt-2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none">
        <button
          type="button"
          onClick={openContribute}
          className="pointer-events-auto w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition shadow-lg shadow-amber-500/25"
        >
          <ScrollText size={16} /> Поделиться своей историей
        </button>
      </div>

      {formOpen && (
        <LoreSubmitSheet
          lessonSlug={weekly?.slug ?? ''}
          lessonTitle={weekly?.title ?? 'учебник'}
          prompt={weekly?.prompt ?? null}
          onClose={() => setFormOpen(false)}
          onSubmitted={() => { /* появится после модерации */ }}
        />
      )}
    </div>
  );
};

export default CommunityLoreScreen;

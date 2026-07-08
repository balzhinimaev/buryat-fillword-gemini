// Страница-статья народного учебника: полноценная читалка с типографикой,
// подзаголовками (маркер ▍), временем чтения, лайком, шерингом и обсуждением.
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Loader2,
  Pin,
  Share2,
  ShieldCheck,
  ThumbsUp,
  User,
} from 'lucide-react';
import { cn } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../store/authStore';
import type { GameStore } from '../store/gameStore';
import { getLoreItem, voteLoreItem, type LoreItem } from '../services/api';
import { LORE_TYPE_META } from '../components/lore/loreMeta';
import { LoreComments } from '../components/lore/LoreComments';
import { WaveAudioButton } from '../components/WaveAudioButton';

interface Props {
  store: GameStore;
}

const readingMinutes = (text: string): number => Math.max(1, Math.round(text.length / 1000));

const dateLabel = (iso?: string): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

/** Разбор тела статьи: ▍ → подзаголовок, «— — —» → разделитель источников */
type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'divider' }
  | { kind: 'para'; text: string };

function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[—-]\s*[—-]\s*[—-]/.test(line)) { blocks.push({ kind: 'divider' }); continue; }
    if (line.startsWith('▍')) { blocks.push({ kind: 'heading', text: line.replace(/^▍\s*/, '') }); continue; }
    blocks.push({ kind: 'para', text: line });
  }
  return blocks;
}

export const LoreArticleScreen: React.FC<Props> = ({ store }) => {
  const { theme, isDark } = useTheme();
  const { state: authState } = useAuth();
  const myId = authState.user?._id;
  const id = store.state.selectedLoreId;

  const [article, setArticle] = useState<LoreItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); return; }
    let cancelled = false;
    setArticle(null); setNotFound(false);
    getLoreItem(id)
      .then((a) => { if (!cancelled) setArticle(a); })
      .catch(() => { if (!cancelled) setNotFound(true); });
    return () => { cancelled = true; };
  }, [id]);

  const blocks = useMemo(() => (article ? parseBody(article.bodyRu) : []), [article]);

  const toggleVote = async () => {
    if (!article || voting || !myId) return;
    setVoting(true);
    try {
      const updated = await voteLoreItem(article._id);
      setArticle((prev) => (prev ? { ...prev, upvotes: updated.upvotes } : prev));
    } catch { /* офлайн/не авторизован */ } finally { setVoting(false); }
  };

  const share = async () => {
    const shareData = { title: article?.title ?? 'Народный учебник', text: article?.title ?? '', url: 'https://buryat-game.ru/webapp/' };
    try {
      if (navigator.share) { await navigator.share(shareData); return; }
      await navigator.clipboard?.writeText(`${shareData.title} — ${shareData.url}`);
    } catch { /* отмена/нет доступа */ }
  };

  if (notFound) {
    return (
      <div className={cn('min-h-screen p-6', theme.backgrounds.primaryGradient, theme.text.primary)}>
        <button onClick={store.goBack} className="p-2 -ml-2 rounded-xl active:bg-white/10"><ArrowLeft size={22} /></button>
        <p className="mt-8 text-center text-sm opacity-70">Статья не найдена или недоступна офлайн.</p>
        <button className="block mx-auto mt-4 underline text-sm" onClick={store.goBack}>Назад</button>
      </div>
    );
  }

  if (!article) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', theme.backgrounds.primaryGradient)}>
        <Loader2 className="animate-spin text-amber-500" size={30} />
      </div>
    );
  }

  const meta = LORE_TYPE_META[article.type] ?? LORE_TYPE_META.story;
  const TypeIcon = meta.icon;
  const votes = article.upvotes?.length ?? 0;
  const voted = !!myId && !!article.upvotes?.includes(myId);

  return (
    <div className={cn('min-h-screen flex flex-col', theme.backgrounds.primaryGradient)}>
      {/* Шапка-обложка */}
      <header className={cn('relative overflow-hidden p-4 pb-6', isDark ? '' : 'rounded-b-3xl shadow-lg', theme.header.bg, theme.header.text)}>
        <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <button onClick={store.goBack} aria-label="Назад" className="p-2 -ml-2 rounded-xl active:bg-white/10"><ArrowLeft size={22} /></button>
          <button onClick={() => void share()} aria-label="Поделиться" className="p-2 -mr-2 rounded-xl active:bg-white/10"><Share2 size={19} /></button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-2 px-1">
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-[3px] rounded-md', isDark ? meta.chip : meta.chipLight)}>
            <TypeIcon size={10} /> {meta.label}
          </span>
          {article.featured && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-[3px] rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
              <Pin size={9} /> выбор редакции
            </span>
          )}
          {article.nativeCheckedAt && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-[3px] rounded-md bg-emerald-500/20 text-emerald-300">
              <ShieldCheck size={9} /> носитель
            </span>
          )}
        </div>

        <h1 className="text-[22px] font-extrabold leading-tight mt-2 px-1">{article.title}</h1>

        <div className="flex items-center gap-3 mt-3 px-1 text-xs opacity-75">
          <span className="flex items-center gap-1"><User size={12} /> {article.contributorName ?? 'участник'}</span>
          <span>·</span>
          <span>{dateLabel(article.createdAt)}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock size={12} /> {readingMinutes(article.bodyRu)} мин</span>
        </div>
      </header>

      <main className="flex-1 p-4 pb-12 max-w-2xl w-full mx-auto">
        {/* Бурятская фраза-подзаголовок */}
        {article.bodyBur && (
          <div className={cn('rounded-xl px-4 py-3 mb-4 border-l-[3px] flex items-center justify-between gap-3', isDark ? 'bg-white/[0.04] border-l-amber-400/70' : 'bg-amber-50/70 border-l-amber-400')}>
            <span className={cn('text-lg font-extrabold', isDark ? 'text-amber-300' : 'text-amber-700')}>{article.bodyBur}</span>
            {article.audioUrl && <WaveAudioButton src={article.audioUrl} size="sm" />}
          </div>
        )}

        {/* Тело статьи */}
        <article className="space-y-3">
          {blocks.map((b, i) => {
            if (b.kind === 'divider') {
              return <div key={i} className={cn('my-4 h-px', isDark ? 'bg-white/10' : 'bg-stone-200')} />;
            }
            if (b.kind === 'heading') {
              return (
                <motion.h2
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  className={cn('text-[17px] font-extrabold pt-3 leading-snug', theme.text.primary)}
                >
                  {b.text}
                </motion.h2>
              );
            }
            return (
              <p key={i} className={cn('text-[15px] leading-[1.75] whitespace-pre-line', theme.text.secondary)}>
                {b.text}
              </p>
            );
          })}
        </article>

        {/* Панель действий */}
        <div className={cn('flex items-center gap-3 mt-6 pt-4 border-t', isDark ? 'border-white/10' : 'border-stone-200')}>
          <button
            type="button"
            disabled={!myId || voting}
            onClick={() => void toggleVote()}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-60',
              voted ? (isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700') : (isDark ? 'bg-white/5 text-stone-300' : 'bg-stone-100 text-stone-600'),
            )}
          >
            <ThumbsUp size={15} className={voted ? 'fill-current' : ''} /> {votes > 0 ? votes : 'Нравится'}
          </button>
          <button
            type="button"
            onClick={() => void share()}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95', isDark ? 'bg-white/5 text-stone-300' : 'bg-stone-100 text-stone-600')}
          >
            <Share2 size={15} /> Поделиться
          </button>
        </div>

        {article.attribution && (
          <p className={cn('text-[11px] mt-3', theme.text.dimmed)}>Источник: {article.attribution}</p>
        )}

        {/* Обсуждение */}
        <div className="mt-8">
          <LoreComments article={article} onChanged={setArticle} />
        </div>
      </main>
    </div>
  );
};

export default LoreArticleScreen;

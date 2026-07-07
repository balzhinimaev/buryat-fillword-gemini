// «Моё» в мастерской: мои слова, озвучки и истории для учебника со статусами модерации.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, Loader2, Mic, ScrollText, XCircle } from 'lucide-react';
import { cn } from '../ui';
import { useTheme } from '../../theme/ThemeContext';
import { WaveAudioButton } from '../WaveAudioButton';
import {
  getMyAudioSuggestions,
  getMyLore,
  getMyWords,
  type ApiWord,
  type AudioSuggestion,
  type LoreItem,
} from '../../services/api';

const statusMeta = {
  pending: { label: 'На проверке', icon: Clock3, cls: 'text-amber-500 bg-amber-500/15' },
  verified: { label: 'Принято', icon: CheckCircle2, cls: 'text-emerald-500 bg-emerald-500/15' },
  approved: { label: 'Принята', icon: CheckCircle2, cls: 'text-emerald-500 bg-emerald-500/15' },
  rejected: { label: 'Отклонено', icon: XCircle, cls: 'text-red-500 bg-red-500/15' },
  archived: { label: 'В архиве', icon: Clock3, cls: 'text-stone-400 bg-stone-500/15' },
} as const;

const StatusChip: React.FC<{ status: keyof typeof statusMeta }> = ({ status }) => {
  const meta = statusMeta[status] ?? statusMeta.pending;
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold', meta.cls)}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
};

export const MyWordsView: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [words, setWords] = useState<ApiWord[] | null>(null);
  const [audios, setAudios] = useState<AudioSuggestion[] | null>(null);
  const [lore, setLore] = useState<LoreItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyWords()
      .then((w) => { if (!cancelled) setWords(w); })
      .catch(() => { if (!cancelled) setWords([]); });
    getMyAudioSuggestions()
      .then((a) => { if (!cancelled) setAudios(a); })
      .catch(() => { if (!cancelled) setAudios([]); });
    getMyLore()
      .then((l) => { if (!cancelled) setLore(l); })
      .catch(() => { if (!cancelled) setLore([]); });
    return () => { cancelled = true; };
  }, []);

  const card = cn(
    'rounded-2xl p-4 border',
    isDark ? 'bg-stone-800/60 border-stone-700/50' : 'bg-white border-stone-200 shadow-sm',
  );

  if (words === null || audios === null || lore === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-amber-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Мои слова */}
      <section>
        <h3 className={cn('text-[11px] font-bold uppercase tracking-[0.14em] mb-2 px-1', theme.text.muted)}>
          Мои слова · {words.length}
        </h3>
        {words.length === 0 ? (
          <div className={cn(card, 'text-sm text-center', theme.text.muted)}>
            Вы ещё не добавили ни одного слова — начните на вкладке «Добавить»
          </div>
        ) : (
          <div className="space-y-2">
            {words.map((w, i) => (
              <motion.div
                key={w._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className={cn(card, 'flex items-center gap-3')}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('font-bold', isDark ? 'text-amber-400' : 'text-amber-600')}>{w.bur}</span>
                    <span className={cn('text-sm truncate', theme.text.secondary)}>{w.ru}</span>
                  </div>
                  {w.status === 'rejected' && w.rejectionReason && (
                    <p className="text-xs text-red-400 mt-1">Причина: {w.rejectionReason}</p>
                  )}
                </div>
                {w.audioUrl && <WaveAudioButton src={w.audioUrl} size="sm" />}
                <StatusChip status={w.status} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Мои озвучки */}
      <section>
        <h3 className={cn('text-[11px] font-bold uppercase tracking-[0.14em] mb-2 px-1', theme.text.muted)}>
          Мои озвучки · {audios.length}
        </h3>
        {audios.length === 0 ? (
          <div className={cn(card, 'text-sm text-center', theme.text.muted)}>
            <Mic size={16} className="inline mr-1 -mt-0.5" />
            Запишите произношение при добавлении слова или на странице слова в словаре
          </div>
        ) : (
          <div className="space-y-2">
            {audios.map((a, i) => (
              <motion.div
                key={a._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className={cn(card, 'flex items-center gap-3')}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('font-bold', isDark ? 'text-amber-400' : 'text-amber-600')}>
                      {a.wordBur ?? 'слово'}
                    </span>
                    {a.target === 'example' && (
                      <span className={cn('text-[11px]', theme.text.dimmed)}>пример</span>
                    )}
                  </div>
                  {a.status === 'rejected' && a.rejectionReason && (
                    <p className="text-xs text-red-400 mt-1">Причина: {a.rejectionReason}</p>
                  )}
                </div>
                {a.fileUrl && <WaveAudioButton src={a.fileUrl} size="sm" />}
                <StatusChip status={a.status} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Мои истории для учебника */}
      <section>
        <h3 className={cn('text-[11px] font-bold uppercase tracking-[0.14em] mb-2 px-1', theme.text.muted)}>
          Мои истории · {lore.length}
        </h3>
        {lore.length === 0 ? (
          <div className={cn(card, 'text-sm text-center', theme.text.muted)}>
            <ScrollText size={16} className="inline mr-1 -mt-0.5" />
            Поделитесь фактом, историей или пословицей в любом уроке учебника
          </div>
        ) : (
          <div className="space-y-2">
            {lore.map((l, i) => (
              <motion.div
                key={l._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className={cn(card, 'flex items-center gap-3')}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('font-bold text-sm truncate', theme.text.primary)}>{l.title}</span>
                    {l.lessonSlug && (
                      <span className={cn('text-[11px]', theme.text.dimmed)}>урок: {l.lessonSlug}</span>
                    )}
                  </div>
                  {l.status === 'rejected' && l.rejectionReason && (
                    <p className="text-xs text-red-400 mt-1">Причина: {l.rejectionReason}</p>
                  )}
                </div>
                <StatusChip status={l.status} />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

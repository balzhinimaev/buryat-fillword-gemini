// Мини-рейтинг после прохождения уровня: ваше место за неделю + ближайшие соседи.
// Мягко не рендерится в офлайне/при ошибке. Тянет полный лидерборд — из него же
// берём соседей вокруг текущей позиции.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from './ui';
import { useTheme } from '../theme/ThemeContext';
import { api, type LeaderboardEntry, type LeaderboardResponse } from '../services/api';

interface Props {
  onOpenLeaderboard?: () => void;
}

export const PostGameRating: React.FC<Props> = ({ onOpenLeaderboard }) => {
  const { theme, isDark } = useTheme();
  const [data, setData] = useState<LeaderboardResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getLeaderboard({ type: 'xp', period: 'week', limit: 50 })
      .then((r) => { if (!cancelled) setData(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const me = data?.currentUser ?? null;
  if (!data || !me) return null;

  const entries = data.entries ?? [];
  // соседи: строка над и под моей позицией (или топ-3, если я в самом верху)
  const around: LeaderboardEntry[] = (() => {
    const mine = entries.find((e) => e.userId === me.userId);
    if (mine) {
      const idx = entries.indexOf(mine);
      return entries.slice(Math.max(0, idx - 1), idx + 2);
    }
    return [...entries.slice(0, 2), me];
  })();

  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="relative z-10 px-5 pb-3"
    >
      <button
        type="button"
        onClick={onOpenLeaderboard}
        className={cn(
          'w-full rounded-xl px-3 py-2.5 border text-left',
          isDark ? 'bg-white/[0.05] border-white/[0.08]' : 'bg-white/80 border-stone-200/70',
        )}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn('text-[10px] uppercase tracking-wider flex items-center gap-1', theme.text.dimmed)}>
            <Trophy size={10} className="text-amber-500" /> Рейтинг недели
          </span>
          <span className={cn('text-[11px] font-semibold', 'text-amber-500')}>
            вы #{me.rank}
          </span>
        </div>
        <div className="space-y-1">
          {around.map((e) => {
            const isMe = e.userId === me.userId;
            return (
              <div
                key={`${e.rank}-${e.userId}`}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1',
                  isMe && (isDark ? 'bg-amber-500/15' : 'bg-amber-50'),
                )}
              >
                <span className={cn('w-6 text-center text-xs font-bold tabular-nums flex-shrink-0', isMe ? 'text-amber-500' : theme.text.dimmed)}>
                  {medal(e.rank) ?? e.rank}
                </span>
                <span className={cn('flex-1 text-xs font-medium truncate', isMe ? 'text-amber-500' : theme.text.secondary)}>
                  {isMe ? 'Вы' : e.name}
                </span>
                <span className={cn('text-xs font-bold tabular-nums', isMe ? 'text-amber-500' : theme.text.muted)}>
                  {e.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </button>
    </motion.div>
  );
};

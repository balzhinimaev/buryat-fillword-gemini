// «Истории с этим словом» на карточке слова: одобренные записи народного
// учебника, привязанные к слову по relatedBur. Тихо скрывается, если пусто.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollText } from 'lucide-react';
import { cn } from '../ui';
import { useTheme } from '../../theme/ThemeContext';
import { getWordLore, type LoreItem } from '../../services/api';
import { LORE_TYPE_META } from './loreMeta';

interface Props {
  bur: string;
  onOpen?: (id: string) => void;
}

export const WordLoreCard: React.FC<Props> = ({ bur, onOpen }) => {
  const { theme, isDark } = useTheme();
  const [items, setItems] = useState<LoreItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWordLore(bur)
      .then((list) => { if (!cancelled) setItems(list); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [bur]);

  if (!items || items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-stone-800/60 border-stone-700/50' : 'bg-white border-stone-100 shadow-sm')}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ScrollText size={14} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          <span className={cn('text-[11px] font-semibold uppercase tracking-wider', theme.text.dimmed)}>
            Истории с этим словом
          </span>
        </div>
        <div className="space-y-2.5">
          {items.map((item) => {
            const meta = LORE_TYPE_META[item.type] ?? LORE_TYPE_META.story;
            const Icon = meta.icon;
            return (
              <div
                key={item._id}
                role={onOpen ? 'button' : undefined}
                tabIndex={onOpen ? 0 : undefined}
                onClick={onOpen ? () => onOpen(item._id) : undefined}
                className={cn('rounded-xl px-3 py-2.5 border-l-[3px]', onOpen && 'cursor-pointer active:scale-[0.99] transition-transform', isDark ? 'bg-white/[0.03] border-l-amber-400/60' : 'bg-amber-50/60 border-l-amber-400')}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-[3px] rounded-md', isDark ? meta.chip : meta.chipLight)}>
                    <Icon size={10} /> {meta.label}
                  </span>
                  <span className={cn('text-[12px] font-bold truncate', theme.text.primary)}>{item.title}</span>
                </div>
                {item.bodyBur && (
                  <div className={cn('text-[13px] font-bold mt-1', isDark ? 'text-amber-300' : 'text-amber-700')}>
                    {item.type === 'proverb' ? `«${item.bodyBur}»` : item.bodyBur}
                  </div>
                )}
                <p className={cn('text-xs mt-1 leading-relaxed line-clamp-2', theme.text.secondary)}>{item.bodyRu}</p>
                {(item.contributorName || item.attribution) && (
                  <p className={cn('text-[10px] mt-1.5', theme.text.dimmed)}>
                    {item.contributorName ?? 'участник'}{item.attribution ? ` · ${item.attribution}` : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

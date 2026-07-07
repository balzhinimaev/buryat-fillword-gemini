// Оформление типов записей «народного учебника»: подпись, иконка, тональность.
import type React from 'react';
import { BookHeart, Lightbulb, MessageCircle, PenLine, Quote } from 'lucide-react';
import type { LoreType } from '../../services/api';

export const LORE_TYPE_META: Record<LoreType, {
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  chip: string;      // тёмная тема
  chipLight: string; // светлая тема
}> = {
  story: { label: 'История', icon: BookHeart, chip: 'bg-amber-500/15 text-amber-300', chipLight: 'bg-amber-100 text-amber-700' },
  fact: { label: 'Факт', icon: Lightbulb, chip: 'bg-sky-500/15 text-sky-300', chipLight: 'bg-sky-100 text-sky-700' },
  proverb: { label: 'Пословица', icon: Quote, chip: 'bg-violet-500/15 text-violet-300', chipLight: 'bg-violet-100 text-violet-700' },
  example: { label: 'Пример', icon: MessageCircle, chip: 'bg-emerald-500/15 text-emerald-300', chipLight: 'bg-emerald-100 text-emerald-700' },
  correction: { label: 'Дополнение', icon: PenLine, chip: 'bg-stone-500/15 text-stone-300', chipLight: 'bg-stone-100 text-stone-600' },
};

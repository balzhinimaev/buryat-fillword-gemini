// src/components/contribution/constants.ts
import { Star, Flame, Shield, Crown } from 'lucide-react';

// Бурятские специальные буквы (только уникальные, которых нет в русской раскладке)
export const BURYAT_SPECIAL_CHARS_LOWER = ['ү', 'һ', 'ө'];
export const BURYAT_SPECIAL_CHARS_UPPER = ['Ү', 'Һ', 'Ө'];

// Достижения которые можно получить
export const ACHIEVEMENTS = [
  { icon: Star, name: 'Первое слово', description: 'Добавьте первое слово', color: 'from-yellow-400 to-amber-500' },
  { icon: Flame, name: 'На волне', description: '10 слов подряд', color: 'from-orange-400 to-red-500' },
  { icon: Shield, name: 'Страж языка', description: 'Проверьте 20 слов', color: 'from-blue-400 to-indigo-500' },
  { icon: Crown, name: 'Мастер слов', description: '50 принятых слов', color: 'from-purple-400 to-pink-500' },
];

// Табы экрана
export type Tab = 'add' | 'verify' | 'stats';


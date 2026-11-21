// src/theme/index.ts
// Система темизации для бурятского филлворда

import type { ThemeId } from '../types';

/**
 * Цветовые палитры
 */
export const colors = {
  steppe: {
    50: '#fefdf8',
    100: '#fdf9e7',
    200: '#faf0c4',
    300: '#f5e298',
    400: '#efd06a',
    500: '#e6b93d',
    600: '#d69d2b',
    700: '#b27b24',
    800: '#8f6125',
    900: '#755023',
    950: '#432a10',
  },
  terra: {
    50: '#fdf6f3',
    100: '#fceae3',
    200: '#fad8cb',
    300: '#f5bca6',
    400: '#ee9476',
    500: '#e4704e',
    600: '#d05534',
    700: '#ae4429',
    800: '#903b27',
    900: '#783526',
    950: '#411810',
  },
  meadow: {
    50: '#f4f9f4',
    100: '#e5f2e6',
    200: '#cce5cf',
    300: '#a3d0a9',
    400: '#72b47c',
    500: '#4f9759',
    600: '#3d7a46',
    700: '#33613a',
    800: '#2c4f32',
    900: '#26412b',
    950: '#112316',
  },
  sun: '#FACC15',
} as const;

// =============================================================================
// ОПРЕДЕЛЕНИЕ ТЕМ
// =============================================================================

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  preview: string; // Gradient для превью
  
  // Основные фоны
  backgrounds: {
    primary: string;
    secondary: string;
    primaryGradient: string;
    card: string;
    cardSolid: string;
    cardHover: string;
    elevated: string; // Приподнятый элемент (для иконок, бейджей)
    muted: string; // Приглушённый фон
  };
  
  // Текст
  text: {
    primary: string;
    secondary: string;
    muted: string;
    dimmed: string;
    accent: string;
    inverse: string;
  };
  
  // Границы
  borders: {
    subtle: string;
    default: string;
    accent: string;
    hover: string; // Граница при наведении
  };
  
  // Прогресс-бары
  progress: {
    track: string;
    fill: {
      primary: string;
      success: string;
      warning: string;
      amber: string;
    };
  };
  
  // Кнопки
  buttons: {
    primary: string;
    secondary: string;
    outline: string;
    ghost: string;
  };
  
  // Хедер
  header: {
    bg: string;
    text: string;
  };
  
  // Состояния
  states: {
    success: { bg: string; text: string; border: string };
    warning: { bg: string; text: string; border: string };
    error: { bg: string; text: string; border: string };
    locked: { bg: string; text: string; border: string }; // Заблокированный элемент
  };

  // Карточка категории
  categoryCard: {
    bg: string;
    bgLocked: string;
    border: string;
    borderLocked: string;
    borderHover: string;
    iconBg: string;
    iconBgLocked: string;
  };

  // Бейджи сложности
  difficultyBadge: {
    easy: { bg: string; text: string };
    medium: { bg: string; text: string };
    hard: { bg: string; text: string };
  };

  // Звёзды
  stars: {
    filled: string;
    empty: string;
  };
}

// =============================================================================
// ТЕМА "СТЕПЬ" (ТЁМНАЯ) - По умолчанию
// =============================================================================

const steppeTheme: ThemeConfig = {
  id: 'steppe',
  name: 'Степь',
  preview: 'from-[#191c1a] to-[#285747]',
  
  backgrounds: {
    primary: 'ui-page',
    secondary: 'ui-page',
    primaryGradient: 'ui-page',
    card: 'ui-card',
    cardSolid: 'ui-card',
    cardHover: 'ui-card-hover',
    elevated: 'ui-soft',
    muted: 'ui-muted',
  },
  
  text: {
    primary: 'text-white',
    secondary: 'text-stone-300',
    muted: 'text-stone-400',
    dimmed: 'ui-dimmed',
    accent: 'ui-accent-text',
    inverse: 'text-stone-900',
  },
  
  borders: {
    subtle: 'border-stone-700/50',
    default: 'border-stone-700',
    accent: 'border-amber-500',
    hover: 'hover:border-amber-400/60',
  },
  
  progress: {
    track: 'bg-stone-700/50',
    fill: {
      primary: 'ui-progress',
      success: 'bg-gradient-to-r from-meadow-500 to-meadow-400',
      warning: 'bg-gradient-to-r from-terra-500 to-terra-400',
      amber: 'bg-gradient-to-r from-amber-500 to-amber-400',
    },
  },
  
  buttons: {
    primary: 'ui-primary',
    secondary: 'ui-secondary border',
    outline: 'ui-outline border',
    ghost: 'ui-ghost',
  },
  
  header: {
    bg: 'ui-header',
    text: 'ui-text',
  },
  
  states: {
    success: { bg: 'bg-meadow-500/20', text: 'text-meadow-400', border: 'border-meadow-500/30' },
    warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    locked: { bg: 'bg-stone-700/30', text: 'text-stone-500', border: 'border-stone-700/30' },
  },

  categoryCard: {
    bg: 'bg-stone-800/80',
    bgLocked: 'bg-stone-800/40',
    border: 'border-stone-700/50',
    borderLocked: 'border-stone-700/30',
    borderHover: 'hover:border-amber-500/50',
    iconBg: 'bg-stone-700/60',
    iconBgLocked: 'bg-stone-700/30',
  },

  difficultyBadge: {
    easy: { bg: 'bg-meadow-500/20', text: 'text-meadow-400' },
    medium: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    hard: { bg: 'bg-terra-500/20', text: 'text-terra-400' },
  },

  stars: {
    filled: 'fill-amber-400 text-amber-500',
    empty: 'fill-transparent text-stone-600',
  },
};

// =============================================================================
// ТЕМА "СВЕТЛАЯ"
// =============================================================================

const lightTheme: ThemeConfig = {
  id: 'light',
  name: 'Светлая',
  preview: 'from-[#f6f7f4] to-[#cbded0]',
  
  backgrounds: {
    primary: 'ui-page',
    secondary: 'ui-page',
    primaryGradient: 'ui-page',
    card: 'ui-card',
    cardSolid: 'ui-card',
    cardHover: 'ui-card-hover',
    elevated: 'ui-soft',
    muted: 'ui-muted',
  },
  
  text: {
    primary: 'text-stone-800',
    secondary: 'text-stone-600',
    muted: 'text-stone-500',
    dimmed: 'ui-dimmed',
    accent: 'ui-accent-text',
    inverse: 'text-white',
  },
  
  borders: {
    subtle: 'border-stone-200',
    default: 'border-stone-300',
    accent: 'border-amber-500',
    hover: 'hover:border-amber-300',
  },
  
  progress: {
    track: 'bg-stone-200',
    fill: {
      primary: 'ui-progress',
      success: 'bg-gradient-to-r from-meadow-500 to-meadow-400',
      warning: 'bg-gradient-to-r from-terra-500 to-terra-400',
      amber: 'bg-gradient-to-r from-amber-500 to-amber-400',
    },
  },
  
  buttons: {
    primary: 'ui-primary',
    secondary: 'ui-secondary border',
    outline: 'ui-outline border',
    ghost: 'ui-ghost',
  },
  
  header: {
    bg: 'ui-header',
    text: 'ui-text',
  },
  
  states: {
    success: { bg: 'bg-meadow-50', text: 'text-meadow-600', border: 'border-meadow-200' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    error: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    locked: { bg: 'bg-stone-100', text: 'text-stone-400', border: 'border-stone-200' },
  },

  categoryCard: {
    bg: 'bg-white',
    bgLocked: 'bg-stone-100',
    border: 'border-stone-100',
    borderLocked: 'border-stone-200',
    borderHover: 'hover:border-amber-300',
    iconBg: 'bg-stone-100',
    iconBgLocked: 'bg-stone-200',
  },

  difficultyBadge: {
    easy: { bg: 'bg-meadow-50', text: 'text-meadow-600' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-600' },
    hard: { bg: 'bg-terra-50', text: 'text-terra-600' },
  },

  stars: {
    filled: 'fill-amber-400 text-amber-500',
    empty: 'fill-transparent text-stone-300',
  },
};

// =============================================================================
// ТЕМА "ТЁМНАЯ" (Минималистичная)
// =============================================================================

const darkTheme: ThemeConfig = {
  id: 'dark',
  name: 'Тёмная',
  preview: 'from-[#141b26] to-[#285371]',
  
  backgrounds: {
    primary: 'ui-page',
    secondary: 'ui-page',
    primaryGradient: 'ui-page',
    card: 'ui-card',
    cardSolid: 'ui-card',
    cardHover: 'ui-card-hover',
    elevated: 'ui-soft',
    muted: 'ui-muted',
  },
  
  text: {
    primary: 'text-white',
    secondary: 'text-slate-300',
    muted: 'text-slate-400',
    dimmed: 'ui-dimmed',
    accent: 'ui-accent-text',
    inverse: 'text-slate-900',
  },
  
  borders: {
    subtle: 'border-slate-700/50',
    default: 'border-slate-700',
    accent: 'border-cyan-500',
    hover: 'hover:border-cyan-400/60',
  },
  
  progress: {
    track: 'bg-slate-700/50',
    fill: {
      primary: 'ui-progress',
      success: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
      warning: 'bg-gradient-to-r from-amber-500 to-amber-400',
      amber: 'bg-gradient-to-r from-amber-500 to-amber-400',
    },
  },
  
  buttons: {
    primary: 'ui-primary',
    secondary: 'ui-secondary border',
    outline: 'ui-outline border',
    ghost: 'ui-ghost',
  },
  
  header: {
    bg: 'ui-header',
    text: 'ui-text',
  },
  
  states: {
    success: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    locked: { bg: 'bg-slate-700/30', text: 'text-slate-500', border: 'border-slate-700/30' },
  },

  categoryCard: {
    bg: 'bg-slate-800/80',
    bgLocked: 'bg-slate-800/40',
    border: 'border-slate-700/50',
    borderLocked: 'border-slate-700/30',
    borderHover: 'hover:border-cyan-500/50',
    iconBg: 'bg-slate-700/60',
    iconBgLocked: 'bg-slate-700/30',
  },

  difficultyBadge: {
    easy: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    medium: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    hard: { bg: 'bg-red-500/20', text: 'text-red-400' },
  },

  stars: {
    filled: 'fill-amber-400 text-amber-500',
    empty: 'fill-transparent text-slate-600',
  },
};

// =============================================================================
// ЭКСПОРТ ТЕМ
// =============================================================================

export const themes: Record<ThemeId, ThemeConfig> = {
  steppe: steppeTheme,
  light: lightTheme,
  dark: darkTheme,
};

export const themeList: ThemeConfig[] = [steppeTheme, lightTheme, darkTheme];

/**
 * Получить тему по ID
 */
export const getTheme = (id: ThemeId): ThemeConfig => {
  return themes[id] || themes.steppe;
};

// =============================================================================
// ТЕКУЩАЯ ТЕМА (для обратной совместимости)
// Будет заменена на контекст
// =============================================================================

export const theme = steppeTheme;

// =============================================================================
// ХЕЛПЕРЫ
// =============================================================================

/**
 * Определяет, является ли тема тёмной
 */
export const isDarkTheme = (id: ThemeId): boolean => {
  return id === 'steppe' || id === 'dark';
};

/**
 * Получить фон для App контейнера
 */
export const getAppBackground = (id: ThemeId): string => {
  return themes[id]?.backgrounds.primary || 'bg-stone-900';
};

// Реэкспорт стилей меню
export { getMenuStyles, menuThemes } from './menuStyles';
export type { MenuThemeStyles } from './menuStyles';

// Реэкспорт стилей игры
export { getGameStyles, gameThemes } from './gameStyles';
export type { GameThemeStyles } from './gameStyles';

export default themes;
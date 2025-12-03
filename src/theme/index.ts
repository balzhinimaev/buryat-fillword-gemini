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
  preview: 'from-stone-800 via-stone-900 to-amber-900/30',
  
  backgrounds: {
    primary: 'bg-stone-900',
    secondary: 'bg-stone-950',
    primaryGradient: 'bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950',
    card: 'bg-stone-800/60 backdrop-blur-sm',
    cardSolid: 'bg-stone-800',
    cardHover: 'hover:bg-stone-700/60',
    elevated: 'bg-stone-700/50',
    muted: 'bg-stone-800/30',
  },
  
  text: {
    primary: 'text-white',
    secondary: 'text-stone-300',
    muted: 'text-stone-400',
    dimmed: 'text-stone-500',
    accent: 'text-amber-400',
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
      primary: 'bg-gradient-to-r from-steppe-500 via-amber-500 to-steppe-400',
      success: 'bg-gradient-to-r from-meadow-500 to-meadow-400',
      warning: 'bg-gradient-to-r from-terra-500 to-terra-400',
      amber: 'bg-gradient-to-r from-amber-500 to-amber-400',
    },
  },
  
  buttons: {
    primary: 'bg-gradient-to-r from-amber-500 via-orange-500 to-terra-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30',
    secondary: 'bg-stone-800/80 border border-stone-700/50 text-white hover:bg-stone-700/80',
    outline: 'border-2 border-stone-700/50 text-stone-300 hover:border-stone-600 hover:text-white',
    ghost: 'text-stone-400 hover:text-white hover:bg-stone-800/50',
  },
  
  header: {
    bg: 'bg-gradient-to-r from-stone-800 via-stone-900 to-stone-800',
    text: 'text-white',
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
  preview: 'from-stone-100 via-white to-amber-50',
  
  backgrounds: {
    primary: 'bg-stone-50',
    secondary: 'bg-white',
    primaryGradient: 'bg-gradient-to-b from-stone-50 via-white to-stone-100',
    card: 'bg-white shadow-sm',
    cardSolid: 'bg-white',
    cardHover: 'hover:bg-stone-50',
    elevated: 'bg-stone-100',
    muted: 'bg-stone-50',
  },
  
  text: {
    primary: 'text-stone-800',
    secondary: 'text-stone-600',
    muted: 'text-stone-500',
    dimmed: 'text-stone-400',
    accent: 'text-amber-600',
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
      primary: 'bg-gradient-to-r from-amber-500 to-orange-500',
      success: 'bg-gradient-to-r from-meadow-500 to-meadow-400',
      warning: 'bg-gradient-to-r from-terra-500 to-terra-400',
      amber: 'bg-gradient-to-r from-amber-500 to-amber-400',
    },
  },
  
  buttons: {
    primary: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl',
    secondary: 'bg-stone-100 border border-stone-200 text-stone-700 hover:bg-stone-200',
    outline: 'border-2 border-stone-300 text-stone-600 hover:border-stone-400 hover:text-stone-800',
    ghost: 'text-stone-500 hover:text-stone-800 hover:bg-stone-100',
  },
  
  header: {
    bg: 'bg-gradient-to-r from-amber-500 via-orange-500 to-terra-500',
    text: 'text-white',
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
  preview: 'from-slate-800 via-slate-900 to-slate-950',
  
  backgrounds: {
    primary: 'bg-slate-900',
    secondary: 'bg-slate-950',
    primaryGradient: 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950',
    card: 'bg-slate-800/60 backdrop-blur-sm',
    cardSolid: 'bg-slate-800',
    cardHover: 'hover:bg-slate-700/60',
    elevated: 'bg-slate-700/50',
    muted: 'bg-slate-800/30',
  },
  
  text: {
    primary: 'text-white',
    secondary: 'text-slate-300',
    muted: 'text-slate-400',
    dimmed: 'text-slate-500',
    accent: 'text-cyan-400',
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
      primary: 'bg-gradient-to-r from-cyan-500 to-blue-500',
      success: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
      warning: 'bg-gradient-to-r from-amber-500 to-amber-400',
      amber: 'bg-gradient-to-r from-amber-500 to-amber-400',
    },
  },
  
  buttons: {
    primary: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30',
    secondary: 'bg-slate-800/80 border border-slate-700/50 text-white hover:bg-slate-700/80',
    outline: 'border-2 border-slate-700/50 text-slate-300 hover:border-slate-600 hover:text-white',
    ghost: 'text-slate-400 hover:text-white hover:bg-slate-800/50',
  },
  
  header: {
    bg: 'bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800',
    text: 'text-white',
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

export default themes;

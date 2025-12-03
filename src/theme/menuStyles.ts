// src/theme/menuStyles.ts
// Расширенные стили для MainMenu под разные темы

import type { ThemeId } from '../types';

/**
 * Конфигурация стилей для главного меню
 */
export interface MenuThemeStyles {
  // Фон страницы
  pageBackground: string;
  pageGradient: string;
  
  // Декоративные элементы
  decorativeOrbs: {
    primary: string;
    secondary: string;
  };
  gridPattern: string;
  
  // Сетка филлворда в хедере
  fillwordGrid: {
    highlight1: string;  // Зелёный тип
    highlight2: string;  // Голубой тип  
    default: string;     // Обычные ячейки
    vignette: string;    // Виньетка
    bottomFade: string;  // Градиент снизу
  };
  
  // Заголовок
  title: {
    primary: string;
    secondary: string;
    ornament: string;
  };
  
  // Карточка статистики
  statsCard: {
    background: string;
    border: string;
    accent: string;
    streakIcon: string;
    levelBadge: string;
    progressTrack: string;
    progressFill: string;
    text: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  
  // Кнопки меню
  buttons: {
    // Главная кнопка "Играть"
    play: {
      gradient: string;
      gradientHover: string;
      iconBg: string;
    };
    // Обычные кнопки
    card: {
      background: string;
      border: string;
      borderHover: string;
    };
    // Иконки в кнопках
    iconColors: {
      stats: { bg: string; icon: string };
      leaderboard: { bg: string; icon: string };
      dictionary: { bg: string; icon: string };
      settings: { bg: string; icon: string };
      help: { bg: string; icon: string };
    };
    // Кнопка настроек (outline)
    outline: {
      border: string;
      borderHover: string;
    };
    // Текст в кнопках
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
  };
  
  // Footer
  footer: {
    text: string;
  };
}

/**
 * Тема "Степь" (тёмная, по умолчанию)
 */
const steppeMenuStyles: MenuThemeStyles = {
  pageBackground: 'bg-stone-900',
  pageGradient: 'bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950',
  
  decorativeOrbs: {
    primary: 'bg-emerald-500/5',
    secondary: 'bg-sky-500/5',
  },
  gridPattern: 'rgba(87, 83, 78, 1)', // stone-600
  
  fillwordGrid: {
    highlight1: 'bg-emerald-500/50 text-emerald-200/90',
    highlight2: 'bg-sky-500/50 text-sky-200/90',
    default: 'bg-stone-800/50 text-stone-600/60',
    vignette: '#1c1917', // stone-900
    bottomFade: '#1c1917',
  },
  
  title: {
    primary: 'text-white',
    secondary: 'bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent',
    ornament: 'text-amber-500/60',
  },
  
  statsCard: {
    background: 'bg-gradient-to-br from-stone-800/80 to-stone-900/80 backdrop-blur-sm',
    border: 'border-stone-700/50',
    accent: 'bg-gradient-to-bl from-amber-500/10 to-transparent',
    streakIcon: 'bg-gradient-to-br from-orange-500 to-terra-500 shadow-lg shadow-orange-500/20',
    levelBadge: 'bg-gradient-to-br from-steppe-500 to-steppe-700 shadow-lg shadow-steppe-500/20',
    progressTrack: 'bg-stone-700/50',
    progressFill: 'bg-gradient-to-r from-steppe-500 via-amber-500 to-steppe-400',
    text: {
      primary: 'text-white',
      secondary: 'text-stone-400',
      accent: 'text-amber-400',
    },
  },
  
  buttons: {
    play: {
      gradient: 'bg-gradient-to-r from-amber-500 via-orange-500 to-terra-500',
      gradientHover: 'bg-gradient-to-r from-amber-400 via-orange-400 to-terra-400',
      iconBg: 'bg-white/20',
    },
    card: {
      background: 'bg-stone-800/60 backdrop-blur-sm',
      border: 'border-stone-700/50',
      borderHover: 'hover:border-stone-600/50',
    },
    iconColors: {
      stats: { bg: 'bg-meadow-500/10', icon: 'text-meadow-600' },
      leaderboard: { bg: 'bg-amber-500/10', icon: 'text-amber-600' },
      dictionary: { bg: 'bg-terra-500/10', icon: 'text-terra-600' },
      settings: { bg: 'bg-stone-500/10', icon: 'text-stone-500' },
      help: { bg: 'bg-violet-500/20', icon: 'text-violet-400' },
    },
    outline: {
      border: 'border-2 border-stone-700/50',
      borderHover: 'hover:border-stone-600',
    },
    text: {
      primary: 'text-white',
      secondary: 'text-stone-300',
      muted: 'text-stone-400',
    },
  },
  
  footer: {
    text: 'text-stone-500',
  },
};

/**
 * Тема "Светлая"
 */
const lightMenuStyles: MenuThemeStyles = {
  pageBackground: 'bg-stone-50',
  pageGradient: 'bg-gradient-to-b from-amber-50 via-white to-orange-50/30',
  
  decorativeOrbs: {
    primary: 'bg-amber-200/40',
    secondary: 'bg-orange-200/30',
  },
  gridPattern: 'rgba(214, 211, 209, 1)', // stone-300
  
  fillwordGrid: {
    highlight1: 'bg-emerald-500 text-white',
    highlight2: 'bg-sky-500 text-white',
    default: 'bg-stone-200 text-stone-400',
    vignette: '#fafaf9', // stone-50
    bottomFade: '#fffbeb', // amber-50
  },
  
  title: {
    primary: 'text-stone-800',
    secondary: 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-clip-text text-transparent',
    ornament: 'text-amber-500',
  },
  
  statsCard: {
    background: 'bg-white shadow-lg shadow-amber-100/50',
    border: 'border-amber-100',
    accent: 'bg-gradient-to-bl from-amber-100/80 to-transparent',
    streakIcon: 'bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/30',
    levelBadge: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30',
    progressTrack: 'bg-stone-200',
    progressFill: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400',
    text: {
      primary: 'text-stone-800',
      secondary: 'text-stone-500',
      accent: 'text-amber-600',
    },
  },
  
  buttons: {
    play: {
      gradient: 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500',
      gradientHover: 'bg-gradient-to-r from-amber-400 via-orange-400 to-red-400',
      iconBg: 'bg-white/30',
    },
    card: {
      background: 'bg-white shadow-md shadow-stone-200/50',
      border: 'border-stone-100',
      borderHover: 'hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/50',
    },
    iconColors: {
      stats: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
      leaderboard: { bg: 'bg-amber-100', icon: 'text-amber-600' },
      dictionary: { bg: 'bg-orange-100', icon: 'text-orange-600' },
      settings: { bg: 'bg-stone-100', icon: 'text-stone-600' },
      help: { bg: 'bg-violet-100', icon: 'text-violet-600' },
    },
    outline: {
      border: 'border-2 border-stone-200',
      borderHover: 'hover:border-amber-300 hover:bg-amber-50/50',
    },
    text: {
      primary: 'text-stone-800',
      secondary: 'text-stone-600',
      muted: 'text-stone-500',
    },
  },
  
  footer: {
    text: 'text-stone-500',
  },
};

/**
 * Тема "Тёмная" (минималистичная)
 */
const darkMenuStyles: MenuThemeStyles = {
  pageBackground: 'bg-slate-900',
  pageGradient: 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950',
  
  decorativeOrbs: {
    primary: 'bg-cyan-500/5',
    secondary: 'bg-blue-500/5',
  },
  gridPattern: 'rgba(71, 85, 105, 1)', // slate-600
  
  fillwordGrid: {
    highlight1: 'bg-cyan-500/50 text-cyan-200/90',
    highlight2: 'bg-blue-500/50 text-blue-200/90',
    default: 'bg-slate-800/50 text-slate-600/60',
    vignette: '#0f172a', // slate-900
    bottomFade: '#0f172a',
  },
  
  title: {
    primary: 'text-white',
    secondary: 'bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent',
    ornament: 'text-cyan-500/60',
  },
  
  statsCard: {
    background: 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm',
    border: 'border-slate-700/50',
    accent: 'bg-gradient-to-bl from-cyan-500/10 to-transparent',
    streakIcon: 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20',
    levelBadge: 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20',
    progressTrack: 'bg-slate-700/50',
    progressFill: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400',
    text: {
      primary: 'text-white',
      secondary: 'text-slate-400',
      accent: 'text-cyan-400',
    },
  },
  
  buttons: {
    play: {
      gradient: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500',
      gradientHover: 'bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400',
      iconBg: 'bg-white/20',
    },
    card: {
      background: 'bg-slate-800/60 backdrop-blur-sm',
      border: 'border-slate-700/50',
      borderHover: 'hover:border-slate-600/50',
    },
    iconColors: {
      stats: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400' },
      leaderboard: { bg: 'bg-amber-500/10', icon: 'text-amber-400' },
      dictionary: { bg: 'bg-cyan-500/10', icon: 'text-cyan-400' },
      settings: { bg: 'bg-slate-500/10', icon: 'text-slate-400' },
      help: { bg: 'bg-violet-500/20', icon: 'text-violet-400' },
    },
    outline: {
      border: 'border-2 border-slate-700/50',
      borderHover: 'hover:border-slate-600',
    },
    text: {
      primary: 'text-white',
      secondary: 'text-slate-300',
      muted: 'text-slate-400',
    },
  },
  
  footer: {
    text: 'text-slate-500',
  },
};

/**
 * Все темы меню
 */
export const menuThemes: Record<ThemeId, MenuThemeStyles> = {
  steppe: steppeMenuStyles,
  light: lightMenuStyles,
  dark: darkMenuStyles,
};

/**
 * Получить стили меню по ID темы
 */
export const getMenuStyles = (themeId: ThemeId): MenuThemeStyles => {
  return menuThemes[themeId] || menuThemes.steppe;
};

export default menuThemes;


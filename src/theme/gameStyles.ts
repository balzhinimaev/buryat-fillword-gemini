// src/theme/gameStyles.ts
// Стили для страницы игры (филлворд) под разные темы

import type { ThemeId } from '../types';

/**
 * Конфигурация стилей для игровой страницы
 */
export interface GameThemeStyles {
  // Фон страницы
  page: {
    background: string;
    gradient: string;
  };
  
  // Хедер
  header: {
    background: string;
    border: string;
  };
  
  // Кнопки хедера (назад, перезапуск)
  headerButton: {
    background: string;
    backgroundHover: string;
    text: string;
  };
  
  // Заголовок категории
  categoryTitle: {
    text: string;
  };
  
  // Статистика (время, очки)
  statsBadge: {
    background: string;
    text: string;
    iconColor: string;
    valueColor: string;
  };
  
  // Комбо бейдж
  comboBadge: {
    background: string;
    text: string;
    icon: string;
  };
  
  // Трофей/очки
  trophyBadge: {
    background: string;
    iconColor: string;
    text: string;
  };
  
  // Прогресс-бар
  progress: {
    track: string;
    fill: string;
    text: string;
  };
  
  // Сетка (грид)
  grid: {
    background: string;
    gap: string;
  };
  
  // Ячейки
  cell: {
    // Обычная ячейка
    idle: {
      background: string;
      text: string;
      backgroundHover: string;
      shadow: string;
    };
    // Выделенная ячейка
    selected: {
      background: string;
      text: string;
      ring: string;
      shadow: string;
      borderColor: string;
    };
    // Подсказка
    hint: {
      ring: string;
      ringOffset: string;
      dot: string;
    };
    // Найденная ячейка (граница)
    found: {
      borderColor: string;
    };
  };
  
  // Футер (список слов)
  footer: {
    background: string;
    border: string;
    title: string;
  };
  
  // Слово в списке
  wordChip: {
    idle: {
      background: string;
      text: string;
    };
  };
  
  // Toast-уведомление (для подсказок)
  toast: {
    background: string;
    border: string;
    text: string;
    icon: string;
  };
  
  // Модалка победы
  winModal: {
    overlay: string;
    cardGradient: string;
    cardBorder: string;
    // Декоративные элементы
    decorOrb1: string;
    decorOrb2: string;
    // Иконка трофея
    trophyGradient: string;
    trophyShadow: string;
    trophyIcon: string;
    // Заголовок
    titleGradient: string;
    titleIcon: string;
    subtitle: string;
    // Статистика
    statCard: {
      background: string;
      border: string;
      label: string;
      valueDefault: string;
      valueScore: string;
      valueWords: string;
      valueCombo: string;
    };
    // Кнопки
    nextLevelButton: {
      enabled: string;
      enabledShadow: string;
      disabled: string;
    };
    secondaryButton: {
      background: string;
      backgroundHover: string;
      text: string;
    };
    backLink: {
      text: string;
      textHover: string;
    };
  };
}

/**
 * Тема "Степь" (тёмная, по умолчанию) - тёплые степные оттенки
 */
const steppeGameStyles: GameThemeStyles = {
  page: {
    background: 'bg-stone-900',
    gradient: 'bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950',
  },
  
  header: {
    background: 'bg-stone-800/95 backdrop-blur-sm',
    border: 'border-b border-stone-700/50',
  },
  
  headerButton: {
    background: 'bg-stone-700/80',
    backgroundHover: 'hover:bg-stone-600',
    text: 'text-stone-200',
  },
  
  categoryTitle: {
    text: 'text-white',
  },
  
  statsBadge: {
    background: 'bg-stone-700/80',
    text: 'text-white',
    iconColor: 'text-stone-400',
    valueColor: 'text-white',
  },
  
  comboBadge: {
    background: 'bg-gradient-to-r from-amber-500 to-orange-500',
    text: 'text-white',
    icon: 'text-white',
  },
  
  trophyBadge: {
    background: 'bg-stone-700/80',
    iconColor: 'text-amber-400',
    text: 'text-white',
  },
  
  progress: {
    track: 'bg-stone-700/50',
    fill: 'bg-gradient-to-r from-amber-500 via-orange-500 to-terra-500',
    text: 'text-amber-400',
  },
  
  grid: {
    background: 'bg-stone-800/80 backdrop-blur-sm',
    gap: 'gap-1.5',
  },
  
  cell: {
    idle: {
      background: 'bg-gradient-to-br from-stone-700 to-stone-800',
      text: 'text-stone-100',
      backgroundHover: 'hover:from-stone-600 hover:to-stone-700',
      shadow: 'shadow-lg shadow-stone-900/50',
    },
    selected: {
      background: 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-500',
      text: 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]',
      ring: 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-stone-900',
      shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.5),0_0_40px_rgba(249,115,22,0.3)]',
      borderColor: '#fbbf24',
    },
    hint: {
      ring: 'ring-amber-400/70',
      ringOffset: 'ring-offset-stone-900',
      dot: 'bg-amber-400',
    },
    found: {
      borderColor: 'rgba(255,255,255,0.4)',
    },
  },
  
  footer: {
    background: 'bg-stone-800/95 backdrop-blur-sm',
    border: 'border-t border-stone-700/50',
    title: 'text-stone-500',
  },
  
  wordChip: {
    idle: {
      background: 'bg-stone-700/80',
      text: 'text-stone-300',
    },
  },
  
  toast: {
    background: 'bg-stone-800/95 backdrop-blur-sm',
    border: 'border border-amber-500/50',
    text: 'text-amber-200',
    icon: 'text-amber-400',
  },
  
  winModal: {
    overlay: 'bg-black/80 backdrop-blur-sm',
    cardGradient: 'bg-gradient-to-b from-stone-800 to-stone-900',
    cardBorder: 'border border-stone-700/50',
    decorOrb1: 'bg-amber-400/20',
    decorOrb2: 'bg-orange-400/20',
    trophyGradient: 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500',
    trophyShadow: 'shadow-amber-500/30',
    trophyIcon: 'text-white',
    titleGradient: 'bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent',
    titleIcon: 'text-amber-400',
    subtitle: 'text-stone-300',
    statCard: {
      background: 'bg-stone-700/50 backdrop-blur-sm',
      border: 'border-stone-600/30',
      label: 'text-stone-400',
      valueDefault: 'text-white',
      valueScore: 'text-amber-400',
      valueWords: 'text-orange-400',
      valueCombo: 'text-terra-400',
    },
    nextLevelButton: {
      enabled: 'bg-gradient-to-r from-amber-500 via-orange-500 to-terra-500 text-white',
      enabledShadow: 'shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30',
      disabled: 'bg-stone-700/50 text-stone-400 cursor-not-allowed',
    },
    secondaryButton: {
      background: 'bg-stone-700/70',
      backgroundHover: 'hover:bg-stone-600',
      text: 'text-white',
    },
    backLink: {
      text: 'text-stone-400',
      textHover: 'hover:text-white',
    },
  },
};

/**
 * Тема "Светлая" - чистая и яркая
 */
const lightGameStyles: GameThemeStyles = {
  page: {
    background: 'bg-stone-50',
    gradient: 'bg-gradient-to-b from-amber-50/50 via-white to-orange-50/30',
  },
  
  header: {
    background: 'bg-white/95 backdrop-blur-sm',
    border: 'border-b border-stone-200',
  },
  
  headerButton: {
    background: 'bg-stone-100',
    backgroundHover: 'hover:bg-stone-200',
    text: 'text-stone-700',
  },
  
  categoryTitle: {
    text: 'text-stone-800',
  },
  
  statsBadge: {
    background: 'bg-stone-100',
    text: 'text-stone-700',
    iconColor: 'text-stone-500',
    valueColor: 'text-stone-800',
  },
  
  comboBadge: {
    background: 'bg-gradient-to-r from-amber-500 to-orange-500',
    text: 'text-white',
    icon: 'text-white',
  },
  
  trophyBadge: {
    background: 'bg-amber-100',
    iconColor: 'text-amber-600',
    text: 'text-amber-700',
  },
  
  progress: {
    track: 'bg-stone-200',
    fill: 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500',
    text: 'text-amber-600',
  },
  
  grid: {
    background: 'bg-white shadow-xl shadow-stone-200/50',
    gap: 'gap-1.5',
  },
  
  cell: {
    idle: {
      background: 'bg-gradient-to-br from-stone-100 to-stone-200',
      text: 'text-stone-700',
      backgroundHover: 'hover:from-stone-50 hover:to-stone-100',
      shadow: 'shadow-md shadow-stone-300/50',
    },
    selected: {
      background: 'bg-gradient-to-br from-rose-400 via-pink-500 to-purple-500',
      text: 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]',
      ring: 'ring-2 ring-pink-300 ring-offset-2 ring-offset-white',
      shadow: 'shadow-[0_0_25px_rgba(236,72,153,0.5),0_0_50px_rgba(168,85,247,0.25)]',
      borderColor: '#ec4899',
    },
    hint: {
      ring: 'ring-amber-500/70',
      ringOffset: 'ring-offset-white',
      dot: 'bg-amber-500',
    },
    found: {
      borderColor: 'rgba(255,255,255,0.6)',
    },
  },
  
  footer: {
    background: 'bg-white/95 backdrop-blur-sm',
    border: 'border-t border-stone-200',
    title: 'text-stone-500',
  },
  
  wordChip: {
    idle: {
      background: 'bg-stone-100',
      text: 'text-stone-600',
    },
  },
  
  toast: {
    background: 'bg-white/95 backdrop-blur-sm',
    border: 'border border-amber-400',
    text: 'text-amber-700',
    icon: 'text-amber-500',
  },
  
  winModal: {
    overlay: 'bg-white/80 backdrop-blur-sm',
    cardGradient: 'bg-gradient-to-b from-white to-stone-50',
    cardBorder: 'border border-stone-200 shadow-2xl shadow-stone-300/50',
    decorOrb1: 'bg-amber-200/40',
    decorOrb2: 'bg-orange-200/40',
    trophyGradient: 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500',
    trophyShadow: 'shadow-amber-400/40',
    trophyIcon: 'text-white',
    titleGradient: 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-clip-text text-transparent',
    titleIcon: 'text-amber-500',
    subtitle: 'text-stone-600',
    statCard: {
      background: 'bg-stone-100',
      border: 'border-stone-200',
      label: 'text-stone-500',
      valueDefault: 'text-stone-800',
      valueScore: 'text-amber-600',
      valueWords: 'text-orange-600',
      valueCombo: 'text-red-500',
    },
    nextLevelButton: {
      enabled: 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white',
      enabledShadow: 'shadow-lg shadow-amber-400/30 hover:shadow-xl hover:shadow-orange-400/40',
      disabled: 'bg-stone-200 text-stone-400 cursor-not-allowed',
    },
    secondaryButton: {
      background: 'bg-stone-100',
      backgroundHover: 'hover:bg-stone-200',
      text: 'text-stone-700',
    },
    backLink: {
      text: 'text-stone-500',
      textHover: 'hover:text-stone-800',
    },
  },
};

/**
 * Тема "Тёмная" - минималистичная с голубыми акцентами
 */
const darkGameStyles: GameThemeStyles = {
  page: {
    background: 'bg-slate-900',
    gradient: 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950',
  },
  
  header: {
    background: 'bg-slate-800/95 backdrop-blur-sm',
    border: 'border-b border-slate-700/50',
  },
  
  headerButton: {
    background: 'bg-slate-700/80',
    backgroundHover: 'hover:bg-slate-600',
    text: 'text-slate-200',
  },
  
  categoryTitle: {
    text: 'text-white',
  },
  
  statsBadge: {
    background: 'bg-slate-700/80',
    text: 'text-white',
    iconColor: 'text-slate-400',
    valueColor: 'text-white',
  },
  
  comboBadge: {
    background: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    text: 'text-white',
    icon: 'text-white',
  },
  
  trophyBadge: {
    background: 'bg-slate-700/80',
    iconColor: 'text-cyan-400',
    text: 'text-white',
  },
  
  progress: {
    track: 'bg-slate-700/50',
    fill: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500',
    text: 'text-cyan-400',
  },
  
  grid: {
    background: 'bg-slate-800/80 backdrop-blur-sm',
    gap: 'gap-1.5',
  },
  
  cell: {
    idle: {
      background: 'bg-gradient-to-br from-slate-700 to-slate-800',
      text: 'text-slate-100',
      backgroundHover: 'hover:from-slate-600 hover:to-slate-700',
      shadow: 'shadow-lg shadow-slate-900/50',
    },
    selected: {
      background: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600',
      text: 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]',
      ring: 'ring-2 ring-cyan-300/80 ring-offset-2 ring-offset-slate-900',
      shadow: 'shadow-[0_0_25px_rgba(34,211,238,0.6),0_0_50px_rgba(59,130,246,0.35)]',
      borderColor: '#22d3ee',
    },
    hint: {
      ring: 'ring-cyan-400/70',
      ringOffset: 'ring-offset-slate-900',
      dot: 'bg-cyan-400',
    },
    found: {
      borderColor: 'rgba(255,255,255,0.4)',
    },
  },
  
  footer: {
    background: 'bg-slate-800/95 backdrop-blur-sm',
    border: 'border-t border-slate-700/50',
    title: 'text-slate-500',
  },
  
  wordChip: {
    idle: {
      background: 'bg-slate-700/80',
      text: 'text-slate-300',
    },
  },
  
  toast: {
    background: 'bg-slate-800/95 backdrop-blur-sm',
    border: 'border border-cyan-500/50',
    text: 'text-cyan-200',
    icon: 'text-cyan-400',
  },
  
  winModal: {
    overlay: 'bg-black/80 backdrop-blur-sm',
    cardGradient: 'bg-gradient-to-b from-slate-800 to-slate-900',
    cardBorder: 'border border-slate-700/50',
    decorOrb1: 'bg-cyan-400/20',
    decorOrb2: 'bg-blue-400/20',
    trophyGradient: 'bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-500',
    trophyShadow: 'shadow-cyan-500/30',
    trophyIcon: 'text-white',
    titleGradient: 'bg-gradient-to-r from-cyan-200 via-cyan-400 to-cyan-200 bg-clip-text text-transparent',
    titleIcon: 'text-cyan-400',
    subtitle: 'text-slate-300',
    statCard: {
      background: 'bg-slate-700/50 backdrop-blur-sm',
      border: 'border-slate-600/30',
      label: 'text-slate-400',
      valueDefault: 'text-white',
      valueScore: 'text-cyan-400',
      valueWords: 'text-blue-400',
      valueCombo: 'text-indigo-400',
    },
    nextLevelButton: {
      enabled: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white',
      enabledShadow: 'shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30',
      disabled: 'bg-slate-700/50 text-slate-400 cursor-not-allowed',
    },
    secondaryButton: {
      background: 'bg-slate-700/70',
      backgroundHover: 'hover:bg-slate-600',
      text: 'text-white',
    },
    backLink: {
      text: 'text-slate-400',
      textHover: 'hover:text-white',
    },
  },
};

/**
 * Все темы игры
 */
export const gameThemes: Record<ThemeId, GameThemeStyles> = {
  steppe: steppeGameStyles,
  light: lightGameStyles,
  dark: darkGameStyles,
};

/**
 * Получить стили игры по ID темы
 */
export const getGameStyles = (themeId: ThemeId): GameThemeStyles => {
  return gameThemes[themeId] || gameThemes.steppe;
};

export default gameThemes;


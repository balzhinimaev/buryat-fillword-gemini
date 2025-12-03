// src/theme/ThemeContext.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { themes, type ThemeConfig } from './index';
import type { ThemeId } from '../types';

interface ThemeContextValue {
  theme: ThemeConfig;
  themeId: ThemeId;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  themeId: ThemeId;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ themeId, children }) => {
  const value = useMemo(() => ({
    theme: themes[themeId] || themes.steppe,
    themeId,
    isDark: themeId === 'steppe' || themeId === 'dark',
  }), [themeId]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Хук для получения текущей темы
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback на дефолтную тему если контекст не найден
    return {
      theme: themes.steppe,
      themeId: 'steppe',
      isDark: true,
    };
  }
  return context;
};

/**
 * Хук для получения только конфига темы
 */
export const useThemeConfig = (): ThemeConfig => {
  return useTheme().theme;
};


// Компонент для синхронизации темы приложения с оболочкой Telegram
import { useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import type { ThemeId } from '../types';

interface TelegramThemeSyncProps {
  themeId: ThemeId;
  screen?: string;
}

// Цвета для разных тем приложения
const THEME_COLORS: Record<ThemeId, { header: string; background: string }> = {
  steppe: {
    header: '#1c1917',      // stone-900
    background: '#1c1917',
  },
  dark: {
    header: '#0f172a',      // slate-900  
    background: '#020617',  // slate-950
  },
  light: {
    header: '#fafaf9',      // stone-50
    background: '#ffffff',
  },
};

export function TelegramThemeSync({ themeId, screen }: TelegramThemeSyncProps) {
  const { isTelegram, setHeaderColor, setBackgroundColor } = useTelegram();

  useEffect(() => {
    if (!isTelegram) return;

    const colors = THEME_COLORS[themeId] || THEME_COLORS.steppe;
    
    // Устанавливаем цвета оболочки Telegram
    setHeaderColor(colors.header);
    setBackgroundColor(colors.background);
    
  }, [isTelegram, themeId, screen, setHeaderColor, setBackgroundColor]);

  return null;
}


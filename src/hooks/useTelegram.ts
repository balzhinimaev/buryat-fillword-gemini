// Хук для работы с Telegram Web App API
import { useEffect, useState, useCallback, useRef } from 'react';
import type { TelegramWebApp, TelegramWebAppUser, TelegramThemeParams } from '../types/telegram';

interface MainButtonParams {
  text: string;
  color?: string;
  textColor?: string;
  isActive?: boolean;
  isVisible?: boolean;
  onClick?: () => void;
}

interface UseTelegramResult {
  webApp: TelegramWebApp | null;
  user: TelegramWebAppUser | null;
  initData: string | null;
  isReady: boolean;
  isTelegram: boolean;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  
  // Методы
  ready: () => void;
  close: () => void;
  expand: () => void;
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  hapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection') => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  
  // Тематизация оболочки Telegram
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  
  // MainButton (главная кнопка внизу)
  showMainButton: (params: MainButtonParams) => void;
  hideMainButton: () => void;
  setMainButtonLoading: (loading: boolean) => void;
  
  // BackButton (кнопка назад в шапке)
  showBackButton: (onClick: () => void) => void;
  hideBackButton: () => void;
}

export function useTelegram(): UseTelegramResult {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [mainButtonCallback, setMainButtonCallback] = useState<(() => void) | null>(null);
  const [backButtonCallback, setBackButtonCallback] = useState<(() => void) | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      setWebApp(tg);
      
      // Сообщаем Telegram, что приложение готово
      tg.ready();
      
      // Раскрываем на весь экран
      tg.expand();
      
      // Включаем подтверждение закрытия
      tg.enableClosingConfirmation();
      
      // Отключаем сворачивание при свайпе вниз
      if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
      }
      
      setIsReady(true);
    } else {
      // Не в Telegram - режим разработки
      setIsReady(true);
    }
  }, []);

  // Очистка callback'ов при размонтировании
  useEffect(() => {
    return () => {
      if (webApp && mainButtonCallback) {
        webApp.MainButton.offClick(mainButtonCallback);
      }
      if (webApp && backButtonCallback) {
        webApp.BackButton.offClick(backButtonCallback);
      }
    };
  }, [webApp, mainButtonCallback, backButtonCallback]);

  const ready = useCallback(() => {
    webApp?.ready();
  }, [webApp]);

  const close = useCallback(() => {
    webApp?.close();
  }, [webApp]);

  const expand = useCallback(() => {
    webApp?.expand();
  }, [webApp]);

  const showAlert = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      if (webApp) {
        webApp.showAlert(message, () => resolve());
      } else {
        alert(message);
        resolve();
      }
    });
  }, [webApp]);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (webApp) {
        webApp.showConfirm(message, (confirmed) => resolve(confirmed));
      } else {
        resolve(confirm(message));
      }
    });
  }, [webApp]);

  const hapticFeedback = useCallback((
    type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'
  ) => {
    if (!webApp?.HapticFeedback) return;

    switch (type) {
      case 'light':
      case 'medium':
      case 'heavy':
        webApp.HapticFeedback.impactOccurred(type);
        break;
      case 'success':
      case 'warning':
      case 'error':
        webApp.HapticFeedback.notificationOccurred(type);
        break;
      case 'selection':
        webApp.HapticFeedback.selectionChanged();
        break;
    }
  }, [webApp]);

  const openLink = useCallback((url: string) => {
    if (webApp) {
      webApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [webApp]);

  const openTelegramLink = useCallback((url: string) => {
    if (webApp) {
      webApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [webApp]);

  // === Тематизация оболочки Telegram ===
  
  const setHeaderColor = useCallback((color: string) => {
    if (webApp) {
      webApp.setHeaderColor(color);
    }
  }, [webApp]);

  const setBackgroundColor = useCallback((color: string) => {
    if (webApp) {
      webApp.setBackgroundColor(color);
    }
  }, [webApp]);

  // === MainButton ===
  
  const showMainButton = useCallback((params: MainButtonParams) => {
    if (!webApp) return;

    // Удаляем предыдущий callback
    if (mainButtonCallback) {
      webApp.MainButton.offClick(mainButtonCallback);
    }

    // Настраиваем кнопку
    webApp.MainButton.setParams({
      text: params.text,
      color: params.color,
      text_color: params.textColor,
      is_active: params.isActive ?? true,
      is_visible: params.isVisible ?? true,
    });

    // Добавляем новый callback
    if (params.onClick) {
      webApp.MainButton.onClick(params.onClick);
      setMainButtonCallback(() => params.onClick);
    }

    webApp.MainButton.show();
  }, [webApp, mainButtonCallback]);

  const hideMainButton = useCallback(() => {
    if (!webApp) return;
    
    if (mainButtonCallback) {
      webApp.MainButton.offClick(mainButtonCallback);
      setMainButtonCallback(null);
    }
    
    webApp.MainButton.hide();
  }, [webApp, mainButtonCallback]);

  const setMainButtonLoading = useCallback((loading: boolean) => {
    if (!webApp) return;
    
    if (loading) {
      webApp.MainButton.showProgress();
    } else {
      webApp.MainButton.hideProgress();
    }
  }, [webApp]);

  // === BackButton ===
  
  const showBackButton = useCallback((onClick: () => void) => {
    if (!webApp) return;

    // Удаляем предыдущий callback
    if (backButtonCallback) {
      webApp.BackButton.offClick(backButtonCallback);
    }

    webApp.BackButton.onClick(onClick);
    setBackButtonCallback(() => onClick);
    webApp.BackButton.show();
  }, [webApp, backButtonCallback]);

  const hideBackButton = useCallback(() => {
    if (!webApp) return;
    
    if (backButtonCallback) {
      webApp.BackButton.offClick(backButtonCallback);
      setBackButtonCallback(null);
    }
    
    webApp.BackButton.hide();
  }, [webApp, backButtonCallback]);

  return {
    webApp,
    user: webApp?.initDataUnsafe?.user || null,
    initData: webApp?.initData || null,
    isReady,
    isTelegram: !!webApp,
    colorScheme: webApp?.colorScheme || 'light',
    themeParams: webApp?.themeParams || {},
    
    ready,
    close,
    expand,
    showAlert,
    showConfirm,
    hapticFeedback,
    openLink,
    openTelegramLink,
    
    // Тематизация
    setHeaderColor,
    setBackgroundColor,
    showMainButton,
    hideMainButton,
    setMainButtonLoading,
    showBackButton,
    hideBackButton,
  };
}

/**
 * Хук для управления Telegram BackButton на конкретном экране.
 * Показывает кнопку при монтировании, скрывает при размонтировании.
 */
export function useBackButton(onBack: () => void) {
  const callbackRef = useRef(onBack);
  
  useEffect(() => {
    callbackRef.current = onBack;
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const handler = () => callbackRef.current();
    tg.BackButton.onClick(handler);
    tg.BackButton.show();

    return () => {
      tg.BackButton.offClick(handler);
      tg.BackButton.hide();
    };
  }, []);
}

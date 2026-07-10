// Соц-входы на экране авторизации: Telegram (внутри Mini App) и ВКонтакте
import React from 'react';
import { useAuth } from '../../store/authStore';
import { startVkLogin, VK_CONFIGURED } from '../../services/vkAuth';
import { IS_VK_MINIAPP } from '../../services/vkMiniApp';
import { useTelegram } from '../../hooks/useTelegram';
import { useTheme } from '../../theme/ThemeContext';
import { cn } from '../../components/ui';

export const SocialLoginButtons: React.FC = () => {
  const { state, login, clearError, reauthVkMiniApp } = useAuth();
  const { isTelegram, initData } = useTelegram();
  const { theme, isDark } = useTheme();

  const showTelegram = isTelegram && !!initData;
  const showVk = VK_CONFIGURED || IS_VK_MINIAPP;
  if (!showTelegram && !showVk) return null;

  return (
    <div className="mb-4 space-y-2">
      {showTelegram && (
        <button
          type="button"
          onClick={() => { clearError(); void login(); }}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: '#2AABEE' }}
        >
          Войти через Telegram
        </button>
      )}
      {showVk && (
        <button
          type="button"
          // В VK Mini App — повторный автологин по launch-параметрам
          // (web-OAuth redirect ломается внутри iframe VK).
          onClick={() => { void (IS_VK_MINIAPP ? reauthVkMiniApp() : startVkLogin()); }}
          disabled={state.isLoading}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: '#0077FF' }}
        >
          Войти через ВКонтакте
        </button>
      )}
      <div className="flex items-center gap-3 pt-1">
        <span className={cn('flex-1 h-px', isDark ? 'bg-white/10' : 'bg-stone-200')} />
        <span className={cn('text-xs', theme.text.dimmed)}>или по email</span>
        <span className={cn('flex-1 h-px', isDark ? 'bg-white/10' : 'bg-stone-200')} />
      </div>
    </div>
  );
};

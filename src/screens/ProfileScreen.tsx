// «Мой профиль»: XP/уровень, серия, звёзды, вклад в словарь + быстрые действия.
// Просмотр чужих профилей остаётся в UserProfileSheet (лидерборд).
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronRight,
  Hammer,
  Loader2,
  LogOut,
  RefreshCw,
  Settings,
} from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import { useAuth } from '../store/authStore';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { ProfileContent } from '../components/UserProfileSheet';
import { api, type UserProfileResponse } from '../services/api';
import { OFFLINE } from '../config/offline';

interface Props {
  store: GameStore;
}

export const ProfileScreen: React.FC<Props> = ({ store }) => {
  const { goBack, navigate } = store;
  const { theme, isDark } = useTheme();
  const { state: authState, logout } = useAuth();
  useBackButton(() => goBack());

  const myId = authState.user?._id ?? null;
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!myId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api.getUserProfile(myId)
      .then(setProfile)
      .catch((e) => setError((e as { message?: string })?.message || 'Не удалось загрузить профиль'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [myId]);

  const providerLabel = authState.user?.telegramId
    ? 'Telegram'
    : authState.user?.photoUrl
      ? 'ВКонтакте'
      : 'Email / локальный';

  const handleLogout = () => {
    if (!window.confirm('Выйти из аккаунта? Локальный прогресс останется на устройстве.')) return;
    logout();
    try { localStorage.removeItem('auth_tokens'); } catch { /* ignore */ }
    if (OFFLINE) window.location.reload();
    else navigate('menu');
  };

  const actionRow = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    danger = false,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-2xl border transition active:scale-[0.99]',
        isDark ? 'bg-stone-800/60 border-stone-700/50' : 'bg-white border-stone-200 shadow-sm',
      )}
    >
      <span className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
        danger
          ? 'bg-red-500/15 text-red-500'
          : isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600',
      )}>
        {icon}
      </span>
      <span className={cn('flex-1 text-left text-sm font-semibold', danger ? 'text-red-500' : theme.text.primary)}>
        {label}
      </span>
      <ChevronRight size={16} className={theme.text.dimmed} />
    </button>
  );

  return (
    <div className={cn('min-h-[100dvh] flex flex-col', theme.backgrounds.primaryGradient)}>
      <StickyHeader title="Мой профиль" onBack={() => goBack()} />

      {/* Hero-шапка */}
      <header className={cn(
        'relative overflow-hidden p-4 pb-5',
        isDark ? '' : 'rounded-b-3xl shadow-lg',
        theme.header.bg,
        theme.header.text,
      )}>
        <div className="absolute -top-12 -right-8 w-40 h-40 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => goBack()} aria-label="Назад" className="p-2 -ml-2 rounded-xl active:bg-white/10">
              <ArrowLeft size={22} />
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">
              аккаунт · {providerLabel}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight mt-1 px-1">Мой профиль</h1>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-10">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-amber-500" size={28} />
          </div>
        )}

        {!loading && !myId && (
          <div className={cn(
            'rounded-2xl p-6 border text-center text-sm',
            isDark ? 'bg-stone-800/60 border-stone-700/50' : 'bg-white border-stone-200 shadow-sm',
            theme.text.muted,
          )}>
            Войдите в аккаунт, чтобы видеть профиль и синхронизировать прогресс
          </div>
        )}

        {!loading && error && (
          <div className={cn(
            'rounded-2xl p-6 border text-center',
            isDark ? 'bg-stone-800/60 border-stone-700/50' : 'bg-white border-stone-200 shadow-sm',
          )}>
            <p className={cn('text-sm mb-3', theme.text.muted)}>{error}</p>
            <button
              type="button"
              onClick={load}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Повторить
            </button>
          </div>
        )}

        {!loading && profile && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <ProfileContent profile={profile} theme={theme} isDark={isDark} />
          </motion.div>
        )}

        {/* Быстрые действия */}
        <div className="space-y-2 pt-2">
          {actionRow(<Hammer size={17} />, 'Мой вклад в словарь', () => navigate('contribute'))}
          {actionRow(<Settings size={17} />, 'Настройки', () => navigate('settings'))}
          {myId && actionRow(<LogOut size={17} />, 'Выйти из аккаунта', handleLogout, true)}
        </div>
      </main>
    </div>
  );
};

export default ProfileScreen;

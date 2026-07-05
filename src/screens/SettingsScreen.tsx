// src/screens/SettingsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Volume2, 
  Palette, 
  Timer, 
  User,
  Shield,
  Bell,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  Check,
  Gauge,
  LogOut
} from 'lucide-react';
import { OFFLINE } from '../config/offline';
import { GAME_LANGS, setGameLang, useGameLang } from '../services/gameLang';
import { Modal, cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import { themeList } from '../theme';
import type { GameStore } from '../store/gameStore';
import type { ThemeId, Difficulty } from '../types';
import { useAuth } from '../store/authStore';
import { updateName, getDialects, getSettings, patchSettings, type ApiDialect } from '../services/api';

interface SettingsScreenProps {
  store: GameStore;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ store }) => {
  const { state, navigate, goBack, updateSettings, resetProgress } = store;
  const { settings } = state;
  const { theme, isDark } = useTheme();
  const { state: authState, setUserName, logout } = useAuth();

  // Профиль: способ входа + признак реального аккаунта
  const hasToken = (() => {
    try { return !!JSON.parse(localStorage.getItem('auth_tokens') || 'null')?.access_token; } catch { return false; }
  })();
  const isLoggedIn = hasToken || !!authState.user?.photoUrl || !!authState.user?.telegramId;
  const providerLabel = authState.user?.telegramId
    ? 'Вход через Telegram'
    : (authState.user?.photoUrl ? 'Вход через ВКонтакте' : 'Локальный профиль (офлайн)');
  const handleLogout = () => {
    if (!window.confirm('Выйти из аккаунта? Локальный прогресс останется на устройстве.')) return;
    logout();
    try { localStorage.removeItem('auth_tokens'); } catch { /* ignore */ }
    // В офлайн-сборке перезагружаем, чтобы восстановить гостевую сессию.
    if (OFFLINE) window.location.reload();
  };
  
  useBackButton(() => goBack());
  
  const [showResetModal, setShowResetModal] = useState(false);
  const gameLang = useGameLang();

  // Диалект контента: фильтрует главы кампаний с указанным диалектом
  const [dialects, setDialects] = useState<ApiDialect[]>([]);
  const [dialectCode, setDialectCode] = useState<string>('');
  const [dialectSaving, setDialectSaving] = useState(false);
  useEffect(() => {
    if (OFFLINE) return;
    let cancelled = false;
    getDialects()
      .then((d) => { if (!cancelled) setDialects(d.sort((a, b) => a.sortOrder - b.sortOrder)); })
      .catch(() => {});
    getSettings()
      .then((s) => { if (!cancelled) setDialectCode(s.preferredDialectCode ?? ''); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const selectDialect = (code: string) => {
    setDialectCode(code);
    setDialectSaving(true);
    patchSettings({ preferredDialectCode: code })
      .catch(() => {})
      .finally(() => setDialectSaving(false));
  };
  const [editingName, setEditingName] = useState(false);
  const backendPlayerName = authState.user?.name?.trim();
  const effectivePlayerName = useMemo(() => {
    if (backendPlayerName && backendPlayerName.length > 0) return backendPlayerName;
    return settings.playerName;
  }, [backendPlayerName, settings.playerName]);
  const [tempName, setTempName] = useState(effectivePlayerName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!backendPlayerName || editingName) return;
    if (settings.playerName !== backendPlayerName) {
      updateSettings({ playerName: backendPlayerName });
    }
    setTempName(backendPlayerName);
  }, [backendPlayerName, editingName, settings.playerName, updateSettings]);

  const handleNameSave = async () => {
    const newName = tempName.trim();
    if (!newName) {
      setNameError('Имя не может быть пустым');
      return;
    }
    if (newName.length > 50) {
      setNameError('Максимум 50 символов');
      return;
    }
    setNameError(null);
    setIsSavingName(true);
    try {
      await updateName(newName);
      updateSettings({ playerName: newName });
      setUserName(newName);
      setEditingName(false);
    } catch {
      setNameError('Не удалось сохранить имя. Попробуйте ещё раз.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleReset = () => {
    resetProgress();
    setShowResetModal(false);
    navigate('menu');
  };

  const handleThemeChange = (themeId: ThemeId) => {
    updateSettings({ theme: themeId });
  };

  return (
    <div className={cn("min-h-[100dvh] flex flex-col", theme.backgrounds.primaryGradient)}>
      {/* Sticky Header при скролле */}
      <StickyHeader 
        title="Настройки" 
        onBack={() => goBack()} 
      />
      
      {/* Декоративный фон для тёмных тем */}
      {isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 -left-32 w-80 h-80 bg-terra-500/5 rounded-full blur-3xl" />
        </div>
      )}

      {/* Header */}
      <header className={cn("p-4 pb-6 relative z-10", isDark ? "" : "rounded-b-3xl shadow-lg", theme.header.bg, theme.header.text)}>
        {isDark && <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />}
        <div className="relative z-10 flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => goBack()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={24} />
          </motion.button>
          <h1 className="text-xl font-bold flex-1">Настройки</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 space-y-4 relative z-10">
        {/* Профиль */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-2xl p-4",
            isDark
              ? cn(theme.backgrounds.card, "border", theme.borders.subtle)
              : "bg-white shadow-sm border border-stone-100"
          )}
        >
          <div className="flex items-center gap-3">
            {authState.user?.photoUrl ? (
              <img src={authState.user.photoUrl} alt="" className="w-14 h-14 rounded-2xl object-cover" />
            ) : (
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold",
                isDark ? "bg-terra-500/20 text-terra-300" : "bg-terra-100 text-terra-700"
              )}>
                {(effectivePlayerName || 'И').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className={cn("font-bold text-base truncate", theme.text.primary)}>
                {effectivePlayerName || 'Игрок'}
              </div>
              <div className={cn("text-xs", theme.text.muted)}>{providerLabel}</div>
            </div>
          </div>
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className={cn(
                "mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors",
                isDark
                  ? "bg-red-500/15 text-red-300 border border-red-400/20 hover:bg-red-500/25"
                  : "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
              )}
            >
              <LogOut size={16} /> Выйти
            </button>
          )}
        </motion.div>

        {/* Player Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-2xl p-4",
            isDark 
              ? cn(theme.backgrounds.card, "border", theme.borders.subtle)
              : "bg-white shadow-sm border border-stone-100"
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              isDark ? "bg-terra-500/20" : "bg-terra-100"
            )}>
              <User size={20} className={isDark ? "text-terra-400" : "text-terra-600"} />
            </div>
            <span className={cn("font-semibold", theme.text.primary)}>Имя игрока</span>
          </div>
          
          {editingName ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500",
                    isDark 
                      ? "bg-stone-700/50 border border-stone-600 text-white placeholder:text-stone-400"
                      : "border border-stone-200 text-stone-800"
                  )}
                  maxLength={50}
                  autoFocus
                />
                <button
                  onClick={handleNameSave}
                  disabled={isSavingName}
                  className={cn(
                    "px-4 py-2 bg-amber-500 text-white rounded-xl font-medium transition-colors",
                    isSavingName ? "opacity-70 cursor-not-allowed" : "hover:bg-amber-600"
                  )}
                >
                  {isSavingName ? "..." : "OK"}
                </button>
              </div>
              {nameError && (
                <p className={cn("text-sm", isDark ? "text-red-400" : "text-red-600")}>
                  {nameError}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setTempName(effectivePlayerName);
                setEditingName(true);
              }}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl transition-colors",
                isDark 
                  ? "bg-stone-700/30 text-white hover:bg-stone-700/50"
                  : "bg-stone-50 text-stone-700 hover:bg-stone-100"
              )}
            >
              {effectivePlayerName}
            </button>
          )}
        </motion.div>

        {/* Toggles - Sound */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3 px-1">
            <Volume2 size={18} className={theme.text.muted} />
            <span className={cn("text-sm font-medium uppercase tracking-wider", theme.text.muted)}>
              Звук и вибрация
            </span>
          </div>
          
          <div className={cn(
            "rounded-2xl overflow-hidden",
            isDark 
              ? cn(theme.backgrounds.card, "border", theme.borders.subtle)
              : "bg-white shadow-sm border border-stone-100"
          )}>
            <ToggleSwitchThemed
              enabled={settings.soundEnabled}
              onChange={(enabled) => updateSettings({ soundEnabled: enabled })}
              label="Звуковые эффекты"
              description="Звуки при нахождении слов"
              isDark={isDark}
              theme={theme}
            />
            <div className={cn("h-px", isDark ? "bg-stone-700/50" : "bg-stone-100")} />
            <ToggleSwitchThemed
              enabled={settings.vibrationEnabled}
              onChange={(enabled) => updateSettings({ vibrationEnabled: enabled })}
              label="Вибрация"
              description="Вибрация при взаимодействии"
              isDark={isDark}
              theme={theme}
            />
          </div>
        </motion.div>

        {/* Game settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3 px-1">
            <Timer size={18} className={theme.text.muted} />
            <span className={cn("text-sm font-medium uppercase tracking-wider", theme.text.muted)}>
              Игровой процесс
            </span>
          </div>
          
          <div className={cn(
            "rounded-2xl overflow-hidden",
            isDark 
              ? cn(theme.backgrounds.card, "border", theme.borders.subtle)
              : "bg-white shadow-sm border border-stone-100"
          )}>
            <ToggleSwitchThemed
              enabled={settings.timerEnabled}
              onChange={(enabled) => updateSettings({ timerEnabled: enabled })}
              label={settings.timerEnabled ? 'Игра на время' : 'Спокойная игра'}
              description={settings.timerEnabled ? 'С ограничением по времени' : 'Без ограничения по времени'}
              isDark={isDark}
              theme={theme}
            />
            <div className={cn("h-px", isDark ? "bg-stone-700/50" : "bg-stone-100")} />
            <ToggleSwitchThemed
              enabled={settings.showHints}
              onChange={(enabled) => updateSettings({ showHints: enabled })}
              label="Подсказки"
              description="Подсвечивать первую букву"
              isDark={isDark}
              theme={theme}
            />
          </div>
        </motion.div>

        {/* Difficulty */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className={cn(
            "rounded-2xl p-4",
            isDark 
              ? cn(theme.backgrounds.card, "border", theme.borders.subtle)
              : "bg-white shadow-sm border border-stone-100"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              isDark ? "bg-orange-500/20" : "bg-orange-100"
            )}>
              <Gauge size={20} className={isDark ? "text-orange-400" : "text-orange-600"} />
            </div>
            <div>
              <span className={cn("font-semibold", theme.text.primary)}>Сложность игры</span>
              <p className={cn("text-sm", theme.text.muted)}>Влияет на размер сетки и количество слов</p>
            </div>
          </div>
          
          <DifficultySelector
            value={settings.difficulty}
            onChange={(d) => updateSettings({ difficulty: d })}
            isDark={isDark}
            theme={theme}
          />
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3 px-1">
            <Bell size={18} className={theme.text.muted} />
            <span className={cn("text-sm font-medium uppercase tracking-wider", theme.text.muted)}>
              Уведомления
            </span>
          </div>
          
          <div className={cn(
            "rounded-2xl overflow-hidden",
            isDark 
              ? cn(theme.backgrounds.card, "border", theme.borders.subtle)
              : "bg-white shadow-sm border border-stone-100"
          )}>
            <ToggleSwitchThemed
              enabled={settings.notificationsEnabled}
              onChange={(enabled) => updateSettings({ notificationsEnabled: enabled })}
              label="Напоминания"
              description="Получать уведомления о занятиях"
              isDark={isDark}
              theme={theme}
            />
          </div>
        </motion.div>

        {/* Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3 px-1">
            <Shield size={18} className={theme.text.muted} />
            <span className={cn("text-sm font-medium uppercase tracking-wider", theme.text.muted)}>
              Конфиденциальность
            </span>
          </div>
          
          <div className={cn(
            "rounded-2xl overflow-hidden",
            isDark 
              ? cn(theme.backgrounds.card, "border", theme.borders.subtle)
              : "bg-white shadow-sm border border-stone-100"
          )}>
            <ToggleSwitchThemed
              enabled={settings.publicProfile}
              onChange={(enabled) => updateSettings({ publicProfile: enabled })}
              label="Публичный профиль"
              description="Показывать имя в таблице лидеров"
              isDark={isDark}
              theme={theme}
            />
          </div>
        </motion.div>

        {/* Hint language */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          className={cn(
            "rounded-2xl p-4",
            isDark
              ? cn(theme.backgrounds.card, "border", theme.borders.subtle)
              : "bg-white shadow-sm border border-stone-100"
          )}
        >
          <div className="mb-3">
            <span className={cn("font-semibold", theme.text.primary)}>Язык подсказок</span>
            <p className={cn("text-xs mt-0.5", theme.text.muted)}>
              На каком языке показывать перевод бурятских слов в игре
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {GAME_LANGS.map((l) => {
              const isSelected = gameLang === l.value;
              return (
                <motion.button
                  key={l.value}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setGameLang(l.value)}
                  className={cn(
                    'p-3 rounded-xl border-2 text-sm font-semibold transition-all',
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
                      : isDark
                        ? 'border-stone-700/50 hover:border-stone-600'
                        : 'border-stone-200 hover:border-stone-300',
                    theme.text.primary
                  )}
                >
                  {l.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Диалект контента */}
        {!OFFLINE && dialects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className={cn(
              "rounded-2xl p-4",
              isDark
                ? cn(theme.backgrounds.card, "border", theme.borders.subtle)
                : "bg-white shadow-sm border border-stone-100"
            )}
          >
            <div className="mb-3">
              <span className={cn("font-semibold", theme.text.primary)}>
                Диалект{dialectSaving ? ' · сохраняем…' : ''}
              </span>
              <p className={cn("text-xs mt-0.5", theme.text.muted)}>
                Главы кампаний на других диалектах будут скрыты. «Любой» — показывать всё.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[{ code: '', name: 'Любой' }, ...dialects.map((d) => ({ code: d.code, name: d.name }))].map((d) => {
                const isSelected = dialectCode === d.code;
                return (
                  <motion.button
                    key={d.code || 'any'}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectDialect(d.code)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-sm font-semibold transition-all',
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/30'
                        : isDark
                          ? 'border-stone-700/50 hover:border-stone-600'
                          : 'border-stone-200 hover:border-stone-300',
                      theme.text.primary
                    )}
                  >
                    {d.name}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Theme Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className={cn(
            "rounded-2xl p-4",
            isDark 
              ? cn(theme.backgrounds.card, "border", theme.borders.subtle)
              : "bg-white shadow-sm border border-stone-100"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              isDark ? "bg-amber-500/20" : "bg-amber-100"
            )}>
              <Palette size={20} className={isDark ? "text-amber-400" : "text-amber-600"} />
            </div>
            <span className={cn("font-semibold", theme.text.primary)}>Тема оформления</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {themeList.map((t) => {
              const isSelected = settings.theme === t.id;
              return (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleThemeChange(t.id)}
                  className={cn(
                    'relative p-3 rounded-xl border-2 transition-all',
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
                      : isDark 
                        ? 'border-stone-700/50 hover:border-stone-600'
                        : 'border-stone-200 hover:border-stone-300'
                  )}
                >
                  {/* Preview */}
                  <div className={cn(
                    'w-full h-10 rounded-lg bg-gradient-to-br mb-2 relative overflow-hidden',
                    t.preview
                  )}>
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Check size={18} className="text-white" />
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isSelected ? theme.text.accent : theme.text.secondary
                  )}>
                    {t.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Reset */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
        >
          <button
            onClick={() => setShowResetModal(true)}
            className={cn(
              "w-full flex items-center justify-center gap-3 p-4 rounded-2xl transition-colors",
              isDark 
                ? "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                : "bg-red-50 border border-red-100 text-red-600 hover:bg-red-100"
            )}
          >
            <RotateCcw size={20} />
            <span className="font-medium">Сбросить прогресс</span>
          </button>
        </motion.div>

        {/* App info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.48 }}
          className={cn("text-center py-4 text-sm", theme.text.dimmed)}
        >
          <p>Бурятский Филлворд v1.0.0</p>
          <p className="mt-1">Создано с ❤️ для изучения языка</p>
        </motion.div>
      </main>

      {/* Reset Modal */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)}>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-2">Сбросить прогресс?</h3>
          <p className="text-stone-500 mb-6">
            Все ваши достижения, статистика и выученные слова будут удалены. Это действие нельзя отменить.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowResetModal(false)}
              className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
            >
              Сбросить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Компонент переключателя с поддержкой темы
interface ToggleSwitchThemedProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
  isDark: boolean;
  theme: { text: { primary: string; muted: string } };
}

const ToggleSwitchThemed: React.FC<ToggleSwitchThemedProps> = ({
  enabled,
  onChange,
  label,
  description,
  isDark,
  theme,
}) => (
  <button
    onClick={() => onChange(!enabled)}
    className={cn(
      "w-full flex items-center justify-between p-4 transition-colors",
      isDark ? "hover:bg-stone-700/30" : "hover:bg-stone-50"
    )}
  >
    <div className="text-left">
      <div className={cn("font-medium", theme.text.primary)}>{label}</div>
      {description && (
        <div className={cn("text-sm", theme.text.muted)}>{description}</div>
      )}
    </div>
    <div
      className={cn(
        'w-14 h-8 rounded-full p-1 transition-colors',
        enabled 
          ? 'bg-amber-500' 
          : isDark ? 'bg-stone-700' : 'bg-stone-200'
      )}
    >
      <motion.div
        className="w-6 h-6 bg-white rounded-full shadow"
        animate={{ x: enabled ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
  </button>
);

// Конфигурация вариантов сложности
const DIFFICULTY_OPTIONS: {
  id: Difficulty;
  label: string;
  description: string;
  emoji: string;
  color: { bg: string; bgDark: string; text: string; textDark: string; ring: string };
}[] = [
  {
    id: 'easy',
    label: 'Легко',
    description: 'Маленькая сетка, мало слов',
    emoji: '🌱',
    color: {
      bg: 'bg-emerald-50',
      bgDark: 'bg-emerald-500/15',
      text: 'text-emerald-700',
      textDark: 'text-emerald-400',
      ring: 'ring-emerald-500',
    },
  },
  {
    id: 'medium',
    label: 'Средне',
    description: 'Стандартный размер',
    emoji: '🔥',
    color: {
      bg: 'bg-amber-50',
      bgDark: 'bg-amber-500/15',
      text: 'text-amber-700',
      textDark: 'text-amber-400',
      ring: 'ring-amber-500',
    },
  },
  {
    id: 'hard',
    label: 'Сложно',
    description: 'Большая сетка, много слов',
    emoji: '⚡',
    color: {
      bg: 'bg-red-50',
      bgDark: 'bg-red-500/15',
      text: 'text-red-700',
      textDark: 'text-red-400',
      ring: 'ring-red-500',
    },
  },
];

// Компонент выбора сложности
interface DifficultySelectorProps {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
  isDark: boolean;
  theme: { text: { primary: string; muted: string; secondary: string } };
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  value,
  onChange,
  isDark,
}) => (
  <div className="grid grid-cols-3 gap-2">
    {DIFFICULTY_OPTIONS.map((opt) => {
      const isSelected = value === opt.id;
      return (
        <motion.button
          key={opt.id}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onChange(opt.id)}
          className={cn(
            'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
            isSelected
              ? cn(
                  'ring-2',
                  opt.color.ring,
                  isDark ? opt.color.bgDark : opt.color.bg,
                  isDark ? 'border-transparent' : 'border-transparent'
                )
              : isDark
                ? 'border-stone-700/50 hover:border-stone-600 bg-stone-800/30'
                : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
          )}
        >
          <span className="text-2xl leading-none">{opt.emoji}</span>
          <span className={cn(
            'text-sm font-semibold',
            isSelected
              ? (isDark ? opt.color.textDark : opt.color.text)
              : (isDark ? 'text-stone-300' : 'text-stone-600')
          )}>
            {opt.label}
          </span>
          <span className={cn(
            'text-[10px] leading-tight text-center',
            isSelected
              ? (isDark ? opt.color.textDark : opt.color.text)
              : (isDark ? 'text-stone-500' : 'text-stone-400')
          )}>
            {opt.description}
          </span>
          {isSelected && (
            <motion.div
              layoutId="difficulty-check"
              className={cn(
                'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center',
                opt.id === 'easy' ? 'bg-emerald-500' : opt.id === 'medium' ? 'bg-amber-500' : 'bg-red-500'
              )}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <Check size={12} className="text-white" />
            </motion.div>
          )}
        </motion.button>
      );
    })}
  </div>
);

export default SettingsScreen;

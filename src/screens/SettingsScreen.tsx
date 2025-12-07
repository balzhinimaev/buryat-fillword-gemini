// src/screens/SettingsScreen.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Volume2, 
  Palette, 
  Timer, 
  User,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  Check
} from 'lucide-react';
import { Modal, cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { useTheme } from '../theme/ThemeContext';
import { useBackButton } from '../hooks/useTelegram';
import { themeList } from '../theme';
import type { GameStore } from '../store/gameStore';
import type { ThemeId } from '../types';

interface SettingsScreenProps {
  store: GameStore;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ store }) => {
  const { state, navigate, updateSettings, resetProgress } = store;
  const { settings } = state;
  const { theme, isDark } = useTheme();
  
  useBackButton(() => navigate('menu'));
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(settings.playerName);

  const handleNameSave = () => {
    if (tempName.trim()) {
      updateSettings({ playerName: tempName.trim() });
    }
    setEditingName(false);
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
        onBack={() => navigate('menu')} 
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
            onClick={() => navigate('menu')}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={24} />
          </motion.button>
          <h1 className="text-xl font-bold flex-1">Настройки</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 space-y-4 relative z-10">
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
                maxLength={20}
                autoFocus
              />
              <button
                onClick={handleNameSave}
                className="px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
              >
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl transition-colors",
                isDark 
                  ? "bg-stone-700/30 text-white hover:bg-stone-700/50"
                  : "bg-stone-50 text-stone-700 hover:bg-stone-100"
              )}
            >
              {settings.playerName}
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
              label="Таймер"
              description="Показывать время прохождения"
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

        {/* Theme Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
          transition={{ delay: 0.4 }}
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
          transition={{ delay: 0.5 }}
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

export default SettingsScreen;

// src/screens/SettingsScreen.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Volume2, 
  Palette, 
  Timer, 
  User,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { BackButton, ToggleSwitch, Modal, cn } from '../components/ui';
import type { GameStore } from '../store/gameStore';

interface SettingsScreenProps {
  store: GameStore;
}

type Theme = 'light' | 'dark' | 'baikal';

const themes: { id: Theme; name: string; colors: string }[] = [
  { id: 'light', name: 'Светлая', colors: 'from-slate-100 to-slate-200' },
  { id: 'dark', name: 'Тёмная', colors: 'from-slate-800 to-slate-900' },
  { id: 'baikal', name: 'Байкал', colors: 'from-baikal-500 to-baikal-700' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ store }) => {
  const { state, navigate, updateSettings, resetProgress } = store;
  const { settings } = state;
  
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

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-baikal-700 text-white p-4 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <BackButton onClick={() => navigate('menu')} />
          <h1 className="text-xl font-bold flex-1">Настройки</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 space-y-4">
        {/* Player Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <User size={20} className="text-purple-600" />
            </div>
            <span className="font-semibold text-slate-700">Имя игрока</span>
          </div>
          
          {editingName ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-baikal-500"
                maxLength={20}
                autoFocus
              />
              <button
                onClick={handleNameSave}
                className="px-4 py-2 bg-baikal-500 text-white rounded-xl font-medium"
              >
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="w-full text-left px-4 py-3 bg-slate-50 rounded-xl text-slate-700 hover:bg-slate-100"
            >
              {settings.playerName}
            </button>
          )}
        </motion.div>

        {/* Toggles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3 px-1">
            <Volume2 size={18} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Звук и вибрация
            </span>
          </div>
          
          <ToggleSwitch
            enabled={settings.soundEnabled}
            onChange={(enabled) => updateSettings({ soundEnabled: enabled })}
            label="Звуковые эффекты"
            description="Звуки при нахождении слов"
          />
          
          <ToggleSwitch
            enabled={settings.vibrationEnabled}
            onChange={(enabled) => updateSettings({ vibrationEnabled: enabled })}
            label="Вибрация"
            description="Вибрация при взаимодействии"
          />
        </motion.div>

        {/* Game settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3 px-1">
            <Timer size={18} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Игровой процесс
            </span>
          </div>
          
          <ToggleSwitch
            enabled={settings.timerEnabled}
            onChange={(enabled) => updateSettings({ timerEnabled: enabled })}
            label="Таймер"
            description="Показывать время прохождения"
          />
          
          <ToggleSwitch
            enabled={settings.showHints}
            onChange={(enabled) => updateSettings({ showHints: enabled })}
            label="Подсказки"
            description="Подсвечивать первую букву"
          />
        </motion.div>

        {/* Theme */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Palette size={20} className="text-amber-600" />
            </div>
            <span className="font-semibold text-slate-700">Тема оформления</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => updateSettings({ theme: theme.id })}
                className={cn(
                  'p-3 rounded-xl border-2 transition-all',
                  settings.theme === theme.id
                    ? 'border-baikal-500 ring-2 ring-baikal-200'
                    : 'border-transparent'
                )}
              >
                <div className={cn(
                  'w-full h-8 rounded-lg bg-gradient-to-br mb-2',
                  theme.colors
                )} />
                <span className="text-xs font-medium text-slate-600">{theme.name}</span>
              </button>
            ))}
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
            className="w-full flex items-center justify-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 hover:bg-red-100 transition-colors"
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
          className="text-center py-4 text-slate-400 text-sm"
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
          <h3 className="text-xl font-bold text-slate-800 mb-2">Сбросить прогресс?</h3>
          <p className="text-slate-500 mb-6">
            Все ваши достижения, статистика и выученные слова будут удалены. Это действие нельзя отменить.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowResetModal(false)}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium"
            >
              Отмена
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium"
            >
              Сбросить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsScreen;


// src/screens/WordContributionScreen.tsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Check, 
  X, 
  Send, 
  User, 
  Sparkles,
  Trophy,
  BookOpen,
  AlertCircle,
  ChevronDown,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Heart,
  Star,
  Flame,
  Shield,
  Crown
} from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { useContributionStore } from '../store/contributionStore';
import { useTelegram } from '../hooks/useTelegram';
import { useTheme } from '../theme/ThemeContext';
import { cn } from '../components/ui';
import { categories } from '../data/words';

interface Props {
  store: GameStore;
}

// Бурятские специальные буквы
const BURYAT_SPECIAL_CHARS = ['Ү', 'Һ', 'Ө', 'Ы', 'Э'];

// Табы экрана
type Tab = 'add' | 'verify' | 'stats';

// Компонент бурятской клавиатуры
const BuryatKeyboard: React.FC<{
  onChar: (char: string) => void;
  visible: boolean;
}> = ({ onChar, visible }) => {
  if (!visible) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex gap-2 flex-wrap justify-center"
    >
      {BURYAT_SPECIAL_CHARS.map(char => (
        <motion.button
          key={char}
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChar(char)}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 
                     text-white font-bold text-lg shadow-lg shadow-amber-500/30
                     hover:from-amber-400 hover:to-orange-500 transition-all"
        >
          {char}
        </motion.button>
      ))}
    </motion.div>
  );
};

// Достижения которые можно получить
const ACHIEVEMENTS = [
  { icon: Star, name: 'Первое слово', description: 'Добавьте первое слово', color: 'from-yellow-400 to-amber-500' },
  { icon: Flame, name: 'На волне', description: '10 слов подряд', color: 'from-orange-400 to-red-500' },
  { icon: Shield, name: 'Страж языка', description: 'Проверьте 20 слов', color: 'from-blue-400 to-indigo-500' },
  { icon: Crown, name: 'Мастер слов', description: '50 принятых слов', color: 'from-purple-400 to-pink-500' },
];

// Красивый онбординг экран
const WelcomeScreen: React.FC<{
  onJoin: (name: string, telegram?: string) => void;
  telegramUser: { first_name?: string; last_name?: string; username?: string; photo_url?: string } | null;
  isDark: boolean;
  theme: import('../theme').ThemeConfig;
}> = ({ onJoin, telegramUser, isDark, theme }) => {
  const displayName = telegramUser 
    ? [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || telegramUser.username || 'Гость'
    : 'Гость';
  
  const initials = telegramUser?.first_name?.[0]?.toUpperCase() || '?';
  
  const handleJoin = () => {
    onJoin(displayName, telegramUser?.username);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 flex flex-col min-h-[70vh]"
    >
      {/* Героический блок */}
      <div className="text-center mb-8">
        {/* Аватар пользователя или fallback */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 0.2 }}
          className="w-28 h-28 mx-auto mb-6 rounded-full relative"
        >
          {/* Градиентная рамка */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-1 shadow-2xl shadow-orange-500/40">
            {telegramUser?.photo_url ? (
              <img 
                src={telegramUser.photo_url} 
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className={cn(
                "w-full h-full rounded-full flex items-center justify-center",
                isDark ? "bg-stone-800" : "bg-white"
              )}>
                <span className={cn("text-3xl font-bold", isDark ? "text-amber-400" : "text-amber-600")}>{initials}</span>
              </div>
            )}
          </div>
          {/* Анимированное свечение */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 blur-xl -z-10"
          />
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn("text-2xl font-bold mb-2", theme.text.primary)}
        >
          Сайн байна, {displayName}! 👋
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={cn("leading-relaxed", theme.text.muted)}
        >
          Станьте <span className={cn("font-semibold", theme.text.accent)}>Хранителем бурятского языка</span>. 
          Каждое слово — это мост между поколениями.
        </motion.p>
      </div>

      {/* Блок миссии */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={cn(
          "p-5 rounded-2xl border mb-6",
          isDark 
            ? "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20"
            : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 shadow-md"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            isDark ? "bg-amber-500/20" : "bg-amber-200/80"
          )}>
            <Sparkles className={isDark ? "text-amber-400" : "text-amber-700"} size={24} />
          </div>
          <div>
            <h3 className={cn("font-semibold mb-1", isDark ? "text-amber-300" : "text-amber-900")}>Ваша миссия</h3>
            <p className={cn("text-sm leading-relaxed", isDark ? "text-stone-400" : "text-amber-800/70")}>
              Добавляйте слова из своего словарного запаса, проверяйте слова других участников 
              и помогайте сохранить родной язык для будущих поколений.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Достижения */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-8"
      >
        <h3 className={cn("font-semibold mb-3 flex items-center gap-2", isDark ? "text-stone-300" : "text-stone-700")}>
          <Trophy size={16} className={isDark ? "text-amber-400" : "text-amber-600"} />
          Достижения, которые вас ждут
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((ach, idx) => (
            <motion.div
              key={ach.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + idx * 0.1 }}
              className={cn(
                "p-3.5 rounded-xl border",
                isDark ? "bg-stone-800/50 border-stone-700/50" : "bg-white border-stone-200 shadow-sm"
              )}
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${ach.color} 
                              flex items-center justify-center mb-2 ${isDark ? 'opacity-50' : 'opacity-70'}`}>
                <ach.icon size={16} className="text-white" />
              </div>
              <p className={cn("text-sm font-medium", theme.text.primary)}>{ach.name}</p>
              <p className={cn("text-xs", theme.text.dimmed)}>{ach.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Статистика сообщества */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className={cn(
          "flex items-center justify-center gap-4 mb-8 py-5 px-4 rounded-2xl",
          isDark 
            ? "bg-stone-800/40 border border-stone-700/50" 
            : "bg-white border border-stone-200 shadow-sm"
        )}
      >
        <div className="text-center flex-1">
          <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-amber-600")}>1,247</p>
          <p className={cn("text-xs", isDark ? "text-stone-500" : "text-stone-500")}>слов в базе</p>
        </div>
        <div className={cn("w-px h-10", isDark ? "bg-stone-700" : "bg-stone-200")} />
        <div className="text-center flex-1">
          <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-amber-600")}>89</p>
          <p className={cn("text-xs", isDark ? "text-stone-500" : "text-stone-500")}>участников</p>
        </div>
        <div className={cn("w-px h-10", isDark ? "bg-stone-700" : "bg-stone-200")} />
        <div className="text-center flex-1">
          <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-amber-600")}>12</p>
          <p className={cn("text-xs", isDark ? "text-stone-500" : "text-stone-500")}>категорий</p>
        </div>
      </motion.div>

      {/* Кнопка присоединения */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-auto"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleJoin}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 
                     text-white font-bold text-lg shadow-xl shadow-orange-500/30
                     hover:shadow-orange-500/50 transition-all relative overflow-hidden group"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Heart size={20} />
            Стать Хранителем языка
          </span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400"
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.5 }}
          />
        </motion.button>
        
        <p className={cn("text-center text-xs mt-3", theme.text.dimmed)}>
          Присоединяясь, вы вносите вклад в сохранение культурного наследия 🙏
        </p>
      </motion.div>
    </motion.div>
  );
};

// Форма добавления слова
const AddWordForm: React.FC<{
  onSubmit: (bur: string, ru: string, categoryId: string, example?: string) => void;
  isDuplicate: (bur: string) => boolean;
}> = ({ onSubmit, isDuplicate }) => {
  const { theme, isDark } = useTheme();
  const [bur, setBur] = useState('');
  const [ru, setRu] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [example, setExample] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const burInputRef = useRef<HTMLInputElement>(null);

  const handleBurChar = (char: string) => {
    setBur(prev => prev + char);
    burInputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!bur.trim() || !ru.trim() || !categoryId) {
      setError('Заполните все обязательные поля');
      return;
    }

    if (isDuplicate(bur)) {
      setError('Это слово уже есть в базе');
      return;
    }

    onSubmit(bur, ru, categoryId, example || undefined);
    
    // Очистка формы
    setBur('');
    setRu('');
    setExample('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Сообщение об успехе */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 
                       flex items-center gap-3"
          >
            <CheckCircle2 className="text-emerald-400" size={24} />
            <div>
              <p className="text-emerald-300 font-medium">Слово добавлено!</p>
              <p className="text-emerald-400/70 text-sm">Спасибо за ваш вклад 💚</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ошибка */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 
                       flex items-center gap-2 text-red-300"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Бурятское слово */}
      <div>
        <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
          Бурятское слово *
        </label>
        <input
          ref={burInputRef}
          type="text"
          value={bur}
          onChange={(e) => setBur(e.target.value.toUpperCase())}
          onFocus={() => setShowKeyboard(true)}
          placeholder="Например: НАРАН"
          className={cn(
            "w-full px-4 py-3.5 rounded-xl border-2 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all uppercase tracking-wider",
            isDark 
              ? "bg-stone-800/80 border-stone-700 text-white placeholder-stone-500"
              : "bg-white border-stone-200 text-stone-900 placeholder-stone-400 shadow-sm"
          )}
        />
        
        {/* Бурятская клавиатура */}
        <AnimatePresence>
          {showKeyboard && (
            <div className="mt-3">
              <p className={cn("text-xs mb-2 text-center", theme.text.dimmed)}>
                Специальные бурятские буквы:
              </p>
              <BuryatKeyboard onChar={handleBurChar} visible={showKeyboard} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Русский перевод */}
      <div>
        <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
          Перевод на русский *
        </label>
        <input
          type="text"
          value={ru}
          onChange={(e) => setRu(e.target.value)}
          onFocus={() => setShowKeyboard(false)}
          placeholder="Например: Солнце"
          className={cn(
            "w-full px-4 py-3.5 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all",
            isDark 
              ? "bg-stone-800/80 border-stone-700 text-white placeholder-stone-500"
              : "bg-white border-stone-200 text-stone-900 placeholder-stone-400 shadow-sm"
          )}
        />
      </div>

      {/* Категория */}
      <div>
        <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
          Категория *
        </label>
        <button
          type="button"
          onClick={() => setShowCategories(!showCategories)}
          className={cn(
            "w-full px-4 py-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all",
            isDark 
              ? "bg-stone-800/80 border-stone-700 hover:border-stone-600"
              : "bg-white border-stone-200 hover:border-amber-300 shadow-sm"
          )}
        >
          {selectedCategory ? (
            <span className="flex items-center gap-2">
              <span>{selectedCategory.emoji}</span>
              <span className={theme.text.primary}>{selectedCategory.name}</span>
            </span>
          ) : (
            <span className={theme.text.dimmed}>Выберите категорию</span>
          )}
          <ChevronDown className={cn("transition-transform", theme.text.dimmed, showCategories ? 'rotate-180' : '')} size={18} />
        </button>

        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "mt-2 rounded-xl border overflow-hidden",
                isDark ? "bg-stone-800 border-stone-700" : "bg-white border-stone-200 shadow-lg"
              )}
            >
              <div className="max-h-48 overflow-y-auto">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat.id);
                      setShowCategories(false);
                    }}
                    className={cn(
                      "w-full px-4 py-3 text-left flex items-center gap-3 transition-colors",
                      isDark ? "hover:bg-stone-700/50" : "hover:bg-stone-50",
                      categoryId === cat.id && "bg-amber-500/20"
                    )}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span className={theme.text.primary}>{cat.name}</span>
                    {categoryId === cat.id && (
                      <Check className={cn("ml-auto", theme.text.accent)} size={18} />
                    )}
                  </button>
                ))}
                {/* Категория "Другое" */}
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId('other');
                    setShowCategories(false);
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-left flex items-center gap-3 transition-colors",
                    isDark ? "hover:bg-stone-700/50" : "hover:bg-stone-50",
                    categoryId === 'other' && "bg-amber-500/20"
                  )}
                >
                  <span className="text-xl">📝</span>
                  <span className={theme.text.primary}>Другое</span>
                  {categoryId === 'other' && (
                    <Check className={cn("ml-auto", theme.text.accent)} size={18} />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Пример использования */}
      <div>
        <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
          Пример использования (необязательно)
        </label>
        <textarea
          value={example}
          onChange={(e) => setExample(e.target.value)}
          onFocus={() => setShowKeyboard(false)}
          placeholder="Напишите пример предложения с этим словом..."
          rows={2}
          className={cn(
            "w-full px-4 py-3.5 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none",
            isDark 
              ? "bg-stone-800/80 border-stone-700 text-white placeholder-stone-500"
              : "bg-white border-stone-200 text-stone-900 placeholder-stone-400 shadow-sm"
          )}
        />
      </div>

      {/* Кнопка отправки */}
      <motion.button
        type="submit"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 
                   text-white font-bold text-lg shadow-lg shadow-emerald-500/30
                   hover:from-emerald-400 hover:to-teal-500 transition-all
                   flex items-center justify-center gap-2"
      >
        <Send size={20} />
        Добавить слово
      </motion.button>
    </form>
  );
};

// Карточка слова для верификации
const WordCard: React.FC<{
  word: {
    id: string;
    bur: string;
    ru: string;
    categoryId: string;
    example?: string;
    contributor: { name: string };
    verifications: string[];
  };
  onVerify: () => void;
  onFlag: () => void;
  isDark: boolean;
  theme: import('../theme').ThemeConfig;
}> = ({ word, onVerify, onFlag, isDark, theme }) => {
  const category = categories.find(c => c.id === word.categoryId);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        "p-4 rounded-2xl border",
        isDark ? "bg-stone-800/60 border-stone-700/50" : "bg-white border-stone-200 shadow-sm"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className={cn("text-xl font-bold", theme.text.accent)}>{word.bur}</h3>
          <p className={theme.text.primary}>{word.ru}</p>
        </div>
        <span className={cn(
          "px-2 py-1 rounded-lg text-xs",
          isDark ? "bg-stone-700/50 text-stone-400" : "bg-stone-100 text-stone-600"
        )}>
          {category?.emoji} {category?.name || 'Другое'}
        </span>
      </div>

      {word.example && (
        <p className={cn("text-sm italic mb-3", theme.text.muted)}>«{word.example}»</p>
      )}

      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-2 text-xs", theme.text.dimmed)}>
          <User size={12} />
          <span>{word.contributor.name}</span>
          <span>•</span>
          <span>{word.verifications.length}/3 ✓</span>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onFlag}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              isDark ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-red-50 text-red-500 hover:bg-red-100"
            )}
          >
            <X size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onVerify}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-50 text-emerald-500 hover:bg-emerald-100"
            )}
          >
            <Check size={18} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// Компонент статистики
const StatsView: React.FC<{
  stats: {
    totalWords: number;
    pendingWords: number;
    verifiedWords: number;
    rejectedWords: number;
    topContributors: { name: string; count: number }[];
  };
  onExport: () => void;
  isDark: boolean;
  theme: import('../theme').ThemeConfig;
}> = ({ stats, onExport, isDark, theme }) => {
  return (
    <div className="space-y-4">
      {/* Общая статистика */}
      <div className="grid grid-cols-2 gap-3">
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-stone-800/60 border-stone-700/50" : "bg-white border-stone-200 shadow-sm"
        )}>
          <div className={cn("flex items-center gap-2 text-sm mb-1", theme.text.muted)}>
            <BookOpen size={14} />
            Всего слов
          </div>
          <p className={cn("text-2xl font-bold", theme.text.primary)}>{stats.totalWords}</p>
        </div>
        
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
        )}>
          <div className={cn("flex items-center gap-2 text-sm mb-1", isDark ? "text-emerald-400" : "text-emerald-600")}>
            <CheckCircle2 size={14} />
            Проверено
          </div>
          <p className={cn("text-2xl font-bold", isDark ? "text-emerald-400" : "text-emerald-600")}>{stats.verifiedWords}</p>
        </div>
        
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"
        )}>
          <div className={cn("flex items-center gap-2 text-sm mb-1", isDark ? "text-amber-400" : "text-amber-600")}>
            <Clock size={14} />
            На проверке
          </div>
          <p className={cn("text-2xl font-bold", isDark ? "text-amber-400" : "text-amber-600")}>{stats.pendingWords}</p>
        </div>
        
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
        )}>
          <div className={cn("flex items-center gap-2 text-sm mb-1", isDark ? "text-red-400" : "text-red-600")}>
            <XCircle size={14} />
            Отклонено
          </div>
          <p className={cn("text-2xl font-bold", isDark ? "text-red-400" : "text-red-600")}>{stats.rejectedWords}</p>
        </div>
      </div>

      {/* Топ контрибьюторов */}
      {stats.topContributors.length > 0 && (
        <div className={cn(
          "p-4 rounded-xl border",
          isDark ? "bg-stone-800/60 border-stone-700/50" : "bg-white border-stone-200 shadow-sm"
        )}>
          <div className={cn("flex items-center gap-2 mb-4", theme.text.accent)}>
            <Trophy size={18} />
            <span className="font-semibold">Топ помощников</span>
          </div>
          
          <div className="space-y-2">
            {stats.topContributors.slice(0, 5).map((c, index) => (
              <div 
                key={c.name}
                className={cn(
                  "flex items-center justify-between py-2 border-b last:border-0",
                  isDark ? "border-stone-700/30" : "border-stone-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    index === 0 ? 'bg-amber-500 text-white' : 
                    index === 1 ? 'bg-stone-400 text-white' : 
                    index === 2 ? 'bg-orange-700 text-white' : 
                    isDark ? 'bg-stone-700 text-stone-400' : 'bg-stone-200 text-stone-600'
                  )}>
                    {index + 1}
                  </span>
                  <span className={theme.text.primary}>{c.name}</span>
                </div>
                <span className={theme.text.muted}>{c.count} слов</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Кнопка экспорта */}
      {stats.verifiedWords > 0 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onExport}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 
                     text-white font-bold shadow-lg shadow-violet-500/30
                     hover:from-violet-400 hover:to-purple-500 transition-all
                     flex items-center justify-center gap-2"
        >
          <Download size={20} />
          Экспортировать проверенные слова
        </motion.button>
      )}
    </div>
  );
};

// Главный компонент экрана
export const WordContributionScreen: React.FC<Props> = ({ store }) => {
  const { navigate } = store;
  const contribution = useContributionStore();
  const { user: telegramUser } = useTelegram();
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('add');

  const tabs = [
    { id: 'add' as Tab, label: 'Добавить', icon: Plus },
    { id: 'verify' as Tab, label: 'Проверить', icon: Check, badge: contribution.getWordsForVerification.length },
    { id: 'stats' as Tab, label: 'Статистика', icon: Trophy },
  ];

  const handleExport = () => {
    const data = contribution.exportVerifiedWords();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buryat_words_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn(
      "min-h-[100dvh] flex flex-col",
      isDark ? theme.backgrounds.primaryGradient : "bg-gradient-to-b from-stone-50 via-amber-50/30 to-orange-50/20"
    )}>
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isDark ? (
          <>
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 -left-32 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute top-20 right-0 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 -left-20 w-80 h-80 bg-orange-200/20 rounded-full blur-3xl" />
          </>
        )}
      </div>

      {/* Header */}
      <header className={cn(
        "p-4 pb-6 relative z-10",
        isDark ? "" : "rounded-b-3xl shadow-lg",
        theme.header.bg,
        theme.header.text
      )}>
        {isDark && <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />}
        
        <div className="relative z-10 flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('menu')}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </motion.button>
          
          <div className="flex-1">
            <h1 className="text-xl font-bold">Үгын Дархан</h1>
            <p className="text-sm opacity-80">Словарная мастерская</p>
          </div>

          {/* Аватар контрибьютора */}
          {contribution.currentContributor && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 p-0.5">
                {telegramUser?.photo_url ? (
                  <img 
                    src={telegramUser.photo_url} 
                    alt={contribution.currentContributor.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className={cn(
                    "w-full h-full rounded-full flex items-center justify-center font-bold text-sm",
                    isDark ? "bg-stone-800 text-amber-400" : "bg-white text-amber-600"
                  )}>
                    {contribution.currentContributor.name[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {contribution.currentContributor.name}
                </p>
                <p className="text-xs opacity-70">
                  {contribution.currentContributor.wordsAdded} слов
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Контент */}
      <main className={cn(
        "flex-1 px-4 pb-6 overflow-y-auto relative z-10",
        isDark ? "pt-6" : "pt-6 -mt-4"
      )}>
        {!contribution.currentContributor ? (
          // Приветственный экран
          <WelcomeScreen onJoin={contribution.setContributor} telegramUser={telegramUser} isDark={isDark} theme={theme} />
        ) : (
          <>
            {/* Табы */}
            <div className={cn(
              "flex gap-2 mb-6 p-1.5 rounded-2xl shadow-sm",
              isDark ? theme.backgrounds.card : "bg-white border border-stone-200"
            )}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl font-medium transition-all",
                    "flex items-center justify-center gap-2 relative",
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25' 
                      : cn(isDark ? "text-stone-400 hover:text-white hover:bg-stone-700/30" : "text-stone-500 hover:text-stone-800 hover:bg-stone-100")
                  )}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 
                                     text-white text-xs flex items-center justify-center font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Контент табов */}
            <AnimatePresence mode="wait">
              {activeTab === 'add' && (
                <motion.div
                  key="add"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className={cn(
                    "mb-6 p-4 rounded-2xl border",
                    isDark 
                      ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20"
                      : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-sm"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        isDark ? "bg-amber-500/20" : "bg-amber-100"
                      )}>
                        <Sparkles className={isDark ? "text-amber-400" : "text-amber-600"} size={20} />
                      </div>
                      <div>
                        <p className={cn("font-semibold mb-1", isDark ? "text-amber-200" : "text-amber-800")}>Как добавить слово?</p>
                        <p className={cn("text-sm", isDark ? "text-stone-400" : "text-amber-700/80")}>
                          Введите бурятское слово, его перевод и выберите категорию. 
                          Слово появится в игре после проверки другими носителями языка.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <AddWordForm 
                    onSubmit={contribution.addWord}
                    isDuplicate={contribution.isDuplicate}
                  />
                </motion.div>
              )}

              {activeTab === 'verify' && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {contribution.getWordsForVerification.length === 0 ? (
                    <div className="text-center py-12">
                      <div className={cn(
                        "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center",
                        isDark ? "bg-stone-800" : "bg-stone-100"
                      )}>
                        <Check className={theme.text.dimmed} size={40} />
                      </div>
                      <p className={theme.text.muted}>Нет слов для проверки</p>
                      <p className={cn("text-sm mt-1", theme.text.dimmed)}>
                        Приходите позже или добавьте свои слова!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className={cn("text-sm", theme.text.muted)}>
                        Помогите проверить слова других участников. 
                        Нажмите ✓ если слово правильное, или ✗ если есть ошибка.
                      </p>
                      
                      {contribution.getWordsForVerification.map(word => (
                        <WordCard
                          key={word.id}
                          word={word}
                          onVerify={() => contribution.verifyWord(word.id)}
                          onFlag={() => contribution.flagWord(word.id)}
                          isDark={isDark}
                          theme={theme}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'stats' && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <StatsView stats={contribution.stats} onExport={handleExport} isDark={isDark} theme={theme} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className={cn(
        "p-4 text-center border-t relative z-10",
        isDark ? "border-stone-800" : "border-stone-200"
      )}>
        <p className={cn("text-sm", theme.text.dimmed)}>
          <Users className="inline-block mr-1" size={14} />
          Вместе сохраняем бурятский язык 💛
        </p>
      </footer>
    </div>
  );
};

export default WordContributionScreen;


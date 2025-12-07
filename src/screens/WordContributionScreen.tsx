// src/screens/WordContributionScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Check, 
  Send, 
  Sparkles,
  Trophy,
  BookOpen,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Heart,
  Star,
  Flame,
  Shield,
  Crown,
  Lock,
  Mic,
  Settings2,
  Loader2
} from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { useContributionStore } from '../store/contributionStore';
import { useTelegram, useBackButton } from '../hooks/useTelegram';
import { useTheme } from '../theme/ThemeContext';
import { cn } from '../components/ui';
import { StickyHeader } from '../components/StickyHeader';
import { api, type ApiCategory, type ApiDialect, type ApiPartOfSpeech, type CreateWordRequest, type CreateWordResponse, type ProjectStats, type UserResponse, getDialects, getPartsOfSpeech, createWord, getProjectStats, joinLanguageKeepers } from '../services/api';
import { WordVerificationPanel } from '../components/WordVerificationPanel';

interface Props {
  store: GameStore;
}

// Бурятские специальные буквы (только уникальные, которых нет в русской раскладке)
const BURYAT_SPECIAL_CHARS_LOWER = ['ү', 'һ', 'ө'];
const BURYAT_SPECIAL_CHARS_UPPER = ['Ү', 'Һ', 'Ө'];

// Табы экрана
type Tab = 'add' | 'verify' | 'stats';

// Компонент бурятской клавиатуры
const BuryatKeyboard: React.FC<{
  onChar: (char: string) => void;
  visible: boolean;
}> = ({ onChar, visible }) => {
  if (!visible) return null;
  
  // Объединяем большие и маленькие буквы в один массив
  const allChars = [...BURYAT_SPECIAL_CHARS_UPPER, ...BURYAT_SPECIAL_CHARS_LOWER];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex gap-2 flex-wrap justify-center"
    >
      {allChars.map((char) => (
        <motion.button
          key={char}
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChar(char)}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 
                     text-white font-bold text-lg shadow-lg shadow-amber-500/30
                     hover:from-amber-400 hover:to-orange-500 transition-all
                     flex items-center justify-center"
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
  onJoinKeepers: () => Promise<UserResponse>;
  telegramUser: { first_name?: string; last_name?: string; username?: string; photo_url?: string } | null;
  isDark: boolean;
  theme: import('../theme').ThemeConfig;
  projectStats: ProjectStats | null;
  statsLoading: boolean;
}> = ({ onJoin, onJoinKeepers, telegramUser, isDark, theme, projectStats, statsLoading }) => {
  const displayName = telegramUser 
    ? [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || telegramUser.username || 'Гость'
    : 'Гость';
  
  const initials = telegramUser?.first_name?.[0]?.toUpperCase() || '?';
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  const handleJoin = async () => {
    setIsJoining(true);
    setJoinError(null);
    
    try {
      // Вызываем API для присоединения к хранителям
      await onJoinKeepers();
      // После успешного API вызова обновляем локальное состояние
      onJoin(displayName, telegramUser?.username);
    } catch (error) {
      console.error('Ошибка при присоединении к хранителям:', error);
      const message = error instanceof Error ? error.message : 'Не удалось присоединиться';
      setJoinError(message);
    } finally {
      setIsJoining(false);
    }
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
          {statsLoading ? (
            <Loader2 size={24} className={cn("animate-spin mx-auto mb-1", isDark ? "text-stone-500" : "text-stone-400")} />
          ) : (
            <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-amber-600")}>
              {projectStats?.wordsCount?.toLocaleString('ru-RU') ?? '—'}
            </p>
          )}
          <p className={cn("text-xs", isDark ? "text-stone-500" : "text-stone-500")}>слов в базе</p>
        </div>
        <div className={cn("w-px h-10", isDark ? "bg-stone-700" : "bg-stone-200")} />
        <div className="text-center flex-1">
          {statsLoading ? (
            <Loader2 size={24} className={cn("animate-spin mx-auto mb-1", isDark ? "text-stone-500" : "text-stone-400")} />
          ) : (
            <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-amber-600")}>
              {projectStats?.participantsCount?.toLocaleString('ru-RU') ?? '—'}
            </p>
          )}
          <p className={cn("text-xs", isDark ? "text-stone-500" : "text-stone-500")}>участников</p>
        </div>
        <div className={cn("w-px h-10", isDark ? "bg-stone-700" : "bg-stone-200")} />
        <div className="text-center flex-1">
          {statsLoading ? (
            <Loader2 size={24} className={cn("animate-spin mx-auto mb-1", isDark ? "text-stone-500" : "text-stone-400")} />
          ) : (
            <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-amber-600")}>
              {projectStats?.categoriesCount?.toLocaleString('ru-RU') ?? '—'}
            </p>
          )}
          <p className={cn("text-xs", isDark ? "text-stone-500" : "text-stone-500")}>категорий</p>
        </div>
      </motion.div>

      {/* Ошибка присоединения */}
      <AnimatePresence>
        {joinError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "mb-4 p-3 rounded-xl border flex items-center gap-2",
              isDark 
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-red-50 border-red-200 text-red-600"
            )}
          >
            <AlertCircle size={18} />
            <span className="text-sm">{joinError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопка присоединения */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-auto"
      >
        <motion.button
          whileHover={{ scale: isJoining ? 1 : 1.02 }}
          whileTap={{ scale: isJoining ? 1 : 0.98 }}
          onClick={handleJoin}
          disabled={isJoining}
          className={cn(
            "w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500",
            "text-white font-bold text-lg shadow-xl shadow-orange-500/30",
            "hover:shadow-orange-500/50 transition-all relative overflow-hidden group",
            isJoining && "opacity-80 cursor-not-allowed"
          )}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isJoining ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Присоединяемся...
              </>
            ) : (
              <>
                <Heart size={20} />
                Стать Хранителем языка
              </>
            )}
          </span>
          {!isJoining && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.5 }}
            />
          )}
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
  onSubmit: (data: CreateWordRequest) => Promise<CreateWordResponse>;
  categories: ApiCategory[];
  categoriesLoading: boolean;
  dialects: ApiDialect[];
  dialectsLoading: boolean;
  partsOfSpeech: ApiPartOfSpeech[];
  partsOfSpeechLoading: boolean;
}> = ({ onSubmit, categories, categoriesLoading, dialects, dialectsLoading, partsOfSpeech, partsOfSpeechLoading }) => {
  const { theme, isDark } = useTheme();
  const [bur, setBur] = useState('');
  const [ru, setRu] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [exampleBur, setExampleBur] = useState('');
  const [exampleRu, setExampleRu] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showExampleKeyboard, setShowExampleKeyboard] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const burInputRef = useRef<HTMLInputElement>(null);
  const exampleBurInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Расширенные параметры
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dialect, setDialect] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [difficulty, setDifficulty] = useState(0);
  const [showDialects, setShowDialects] = useState(false);
  const [showPartsOfSpeech, setShowPartsOfSpeech] = useState(false);

  const handleBurChar = (char: string) => {
    setBur(prev => prev + char);
    burInputRef.current?.focus();
  };

  const handleExampleBurChar = (char: string) => {
    setExampleBur(prev => prev + char);
    exampleBurInputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!bur.trim() || !ru.trim() || !categoryId) {
      setError('Заполните все обязательные поля');
      return;
    }

    // Находим полные объекты для получения _id с бэкенда
    const selectedDialect = dialects.find(d => d.code === dialect);
    const selectedPartOfSpeech = partsOfSpeech.find(p => p.code === partOfSpeech);

    // Формируем данные для отправки
    const requestData: CreateWordRequest = {
      bur: bur.trim().toUpperCase(),
      ru: ru.trim(),
      categoryId,
      ...(selectedDialect && { dialectId: selectedDialect._id }),
      ...(selectedPartOfSpeech && { partOfSpeechId: selectedPartOfSpeech._id }),
      ...(exampleBur.trim() && { exampleBur: exampleBur.trim() }),
      ...(exampleRu.trim() && { exampleRu: exampleRu.trim() }),
      ...(difficulty > 0 && { difficulty }),
    };

    // Логгируем данные перед отправкой
    console.log('📝 Отправка слова на сервер:', requestData);

    setIsSubmitting(true);
    
    try {
      const response = await onSubmit(requestData);
      console.log('✅ Слово успешно добавлено:', response);
      
      // Очистка формы
      setBur('');
      setRu('');
      setExampleBur('');
      setExampleRu('');
      setCategoryId('');
      setDialect('');
      setPartOfSpeech('');
      setDifficulty(0);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('❌ Ошибка при добавлении слова:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : (err as { message?: string })?.message || 'Ошибка при сохранении слова';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find(c => c._id === categoryId);

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
          onChange={(e) => setBur(e.target.value)}
          onFocus={() => {
            setShowKeyboard(true);
            setShowExampleKeyboard(false);
          }}
          placeholder="Например: наран"
          className={cn(
            "w-full px-4 py-3.5 rounded-xl border-2 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all tracking-wider",
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
          onFocus={() => {
            setShowKeyboard(false);
            setShowExampleKeyboard(false);
          }}
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
          onClick={() => {
            if (!categoriesLoading) {
              setShowCategories(!showCategories);
              setShowKeyboard(false);
              setShowExampleKeyboard(false);
            }
          }}
          disabled={categoriesLoading}
          className={cn(
            "w-full px-4 py-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all",
            isDark 
              ? "bg-stone-800/80 border-stone-700 hover:border-stone-600"
              : "bg-white border-stone-200 hover:border-amber-300 shadow-sm",
            categoriesLoading && "opacity-60 cursor-wait"
          )}
        >
          {categoriesLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={18} className={cn("animate-spin", theme.text.dimmed)} />
              <span className={theme.text.dimmed}>Загрузка категорий...</span>
            </span>
          ) : selectedCategory ? (
            <span className="flex items-center gap-2">
              <span>{selectedCategory.emoji}</span>
              <span className={theme.text.primary}>{selectedCategory.name}</span>
            </span>
          ) : (
            <span className={theme.text.dimmed}>Выберите категорию</span>
          )}
          {!categoriesLoading && (
            <ChevronDown className={cn("transition-transform", theme.text.dimmed, showCategories ? 'rotate-180' : '')} size={18} />
          )}
        </button>

        <AnimatePresence>
          {showCategories && !categoriesLoading && (
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
                {categories.length === 0 ? (
                  <div className={cn("px-4 py-3 text-center", theme.text.dimmed)}>
                    Категории не найдены
                  </div>
                ) : (
                  categories.filter(cat => cat.isActive).map(cat => (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => {
                        setCategoryId(cat._id);
                        setShowCategories(false);
                      }}
                      className={cn(
                        "w-full px-4 py-3 text-left flex items-center gap-3 transition-colors",
                        isDark ? "hover:bg-stone-700/50" : "hover:bg-stone-50",
                        categoryId === cat._id && "bg-amber-500/20"
                      )}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <div className="flex-1">
                        <span className={theme.text.primary}>{cat.name}</span>
                        {cat.nameBur && (
                          <span className={cn("ml-2 text-xs", theme.text.dimmed)}>({cat.nameBur})</span>
                        )}
                      </div>
                      {categoryId === cat._id && (
                        <Check className={cn("ml-auto", theme.text.accent)} size={18} />
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Пример использования на бурятском */}
      <div>
        <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
          Пример на бурятском <span className={theme.text.dimmed}>(необязательно)</span>
        </label>
        <textarea
          ref={exampleBurInputRef}
          value={exampleBur}
          onChange={(e) => setExampleBur(e.target.value)}
          onFocus={() => {
            setShowKeyboard(false);
            setShowExampleKeyboard(true);
          }}
          onClick={() => setShowExampleKeyboard(true)}
          placeholder="Жэшээ: Наран мандана..."
          rows={2}
          className={cn(
            "w-full px-4 py-3.5 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none",
            isDark 
              ? "bg-stone-800/80 border-stone-700 text-white placeholder-stone-500"
              : "bg-white border-stone-200 text-stone-900 placeholder-stone-400 shadow-sm"
          )}
        />
        
        {/* Бурятская клавиатура для примера */}
        <AnimatePresence>
          {showExampleKeyboard && (
            <div className="mt-3">
              <p className={cn("text-xs mb-2 text-center", theme.text.dimmed)}>
                Специальные бурятские буквы:
              </p>
              <BuryatKeyboard onChar={handleExampleBurChar} visible={showExampleKeyboard} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Пример использования на русском - появляется после заполнения бурятского */}
      <AnimatePresence>
        {exampleBur.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div>
              <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
                Перевод примера на русский <span className={theme.text.dimmed}>(необязательно)</span>
              </label>
              <textarea
                value={exampleRu}
                onChange={(e) => setExampleRu(e.target.value)}
                onFocus={() => {
                  setShowKeyboard(false);
                  setShowExampleKeyboard(false);
                }}
                placeholder="Пример: Солнце восходит..."
                rows={2}
                className={cn(
                  "w-full px-4 py-3.5 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none",
                  isDark 
                    ? "bg-stone-800/80 border-stone-700 text-white placeholder-stone-500"
                    : "bg-white border-stone-200 text-stone-900 placeholder-stone-400 shadow-sm"
                )}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Расширенные параметры */}
      <div className={cn(
        "rounded-xl border overflow-hidden",
        isDark ? "border-stone-700/50" : "border-stone-200"
      )}>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "w-full px-4 py-3.5 flex items-center justify-between transition-colors",
            isDark 
              ? "bg-stone-800/50 hover:bg-stone-800" 
              : "bg-stone-50 hover:bg-stone-100"
          )}
        >
          <div className="flex items-center gap-2">
            <Settings2 size={18} className={theme.text.muted} />
            <span className={theme.text.secondary}>Расширенные параметры</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              isDark ? "bg-stone-700 text-stone-400" : "bg-stone-200 text-stone-500"
            )}>
              необязательно
            </span>
          </div>
          {showAdvanced ? (
            <ChevronUp size={18} className={theme.text.muted} />
          ) : (
            <ChevronDown size={18} className={theme.text.muted} />
          )}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={cn(
                "p-4 space-y-4 border-t",
                isDark ? "border-stone-700/50 bg-stone-800/30" : "border-stone-200 bg-white"
              )}>
                {/* Диалект */}
                <div>
                  <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
                    Диалект
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDialects(!showDialects);
                      setShowPartsOfSpeech(false);
                    }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border-2 text-left flex items-center justify-between transition-all",
                      isDark 
                        ? "bg-stone-800/80 border-stone-700 hover:border-stone-600"
                        : "bg-white border-stone-200 hover:border-amber-300"
                    )}
                  >
                    {dialect ? (
                      <span className={theme.text.primary}>
                        {dialects.find(d => d.code === dialect)?.name}
                      </span>
                    ) : (
                      <span className={theme.text.dimmed}>{dialectsLoading ? 'Загрузка...' : 'Выберите диалект'}</span>
                    )}
                    <ChevronDown className={cn("transition-transform", theme.text.dimmed, showDialects ? 'rotate-180' : '')} size={18} />
                  </button>

                  <AnimatePresence>
                    {showDialects && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                          "mt-2 rounded-xl border overflow-hidden",
                          isDark ? "bg-stone-800 border-stone-700" : "bg-white border-stone-200 shadow-lg"
                        )}
                      >
                        <div className="max-h-40 overflow-y-auto">
                          {dialectsLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className={cn("animate-spin", theme.text.dimmed)} size={20} />
                            </div>
                          ) : dialects.length === 0 ? (
                            <div className={cn("px-4 py-3 text-center text-sm", theme.text.dimmed)}>
                              Нет доступных диалектов
                            </div>
                          ) : (
                            dialects.filter(d => d.isActive).map(d => (
                              <button
                                key={d._id}
                                type="button"
                                onClick={() => {
                                  setDialect(d.code);
                                  setShowDialects(false);
                                }}
                                className={cn(
                                  "w-full px-4 py-3 text-left transition-colors",
                                  isDark ? "hover:bg-stone-700/50" : "hover:bg-stone-50",
                                  dialect === d.code && "bg-amber-500/20"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className={theme.text.primary}>{d.name}</p>
                                    <p className={cn("text-xs", theme.text.dimmed)}>{d.description}</p>
                                  </div>
                                  {dialect === d.code && (
                                    <Check className={theme.text.accent} size={18} />
                                  )}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Часть речи */}
                <div>
                  <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
                    Часть речи
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPartsOfSpeech(!showPartsOfSpeech);
                      setShowDialects(false);
                    }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border-2 text-left flex items-center justify-between transition-all",
                      isDark 
                        ? "bg-stone-800/80 border-stone-700 hover:border-stone-600"
                        : "bg-white border-stone-200 hover:border-amber-300"
                    )}
                  >
                    {partOfSpeech ? (
                      <span className="flex items-center gap-2">
                        <span>{partsOfSpeech.find(p => p.code === partOfSpeech)?.emoji}</span>
                        <span className={theme.text.primary}>
                          {partsOfSpeech.find(p => p.code === partOfSpeech)?.name}
                        </span>
                      </span>
                    ) : (
                      <span className={theme.text.dimmed}>{partsOfSpeechLoading ? 'Загрузка...' : 'Выберите часть речи'}</span>
                    )}
                    <ChevronDown className={cn("transition-transform", theme.text.dimmed, showPartsOfSpeech ? 'rotate-180' : '')} size={18} />
                  </button>

                  <AnimatePresence>
                    {showPartsOfSpeech && (
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
                          {partsOfSpeechLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className={cn("animate-spin", theme.text.dimmed)} size={20} />
                            </div>
                          ) : partsOfSpeech.length === 0 ? (
                            <div className={cn("px-4 py-3 text-center text-sm", theme.text.dimmed)}>
                              Нет доступных частей речи
                            </div>
                          ) : (
                            partsOfSpeech.filter(p => p.isActive).map(p => (
                              <button
                                key={p._id}
                                type="button"
                                onClick={() => {
                                  setPartOfSpeech(p.code);
                                  setShowPartsOfSpeech(false);
                                }}
                                className={cn(
                                  "w-full px-4 py-3 text-left flex items-center gap-3 transition-colors",
                                  isDark ? "hover:bg-stone-700/50" : "hover:bg-stone-50",
                                  partOfSpeech === p.code && "bg-amber-500/20"
                                )}
                              >
                                <span className="text-xl">{p.emoji}</span>
                                <span className={theme.text.primary}>{p.name}</span>
                                {partOfSpeech === p.code && (
                                  <Check className={cn("ml-auto", theme.text.accent)} size={18} />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Сложность */}
                <div>
                  <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
                    Сложность слова
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setDifficulty(difficulty === star ? 0 : star)}
                        className="p-1 transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          size={28}
                          className={cn(
                            "transition-colors",
                            star <= difficulty
                              ? "fill-amber-400 text-amber-400"
                              : isDark 
                                ? "text-stone-600 hover:text-stone-500" 
                                : "text-stone-300 hover:text-stone-400"
                          )}
                        />
                      </button>
                    ))}
                    {difficulty > 0 && (
                      <span className={cn("ml-2 text-sm", theme.text.muted)}>
                        {difficulty === 1 && "Очень легко"}
                        {difficulty === 2 && "Легко"}
                        {difficulty === 3 && "Средне"}
                        {difficulty === 4 && "Сложно"}
                        {difficulty === 5 && "Очень сложно"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Запись голоса (заблокировано) */}
                <div>
                  <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
                    Произношение
                  </label>
                  <div 
                    className={cn(
                      "relative px-4 py-3.5 rounded-xl border-2 border-dashed flex items-center gap-3 cursor-not-allowed",
                      isDark 
                        ? "bg-stone-800/30 border-stone-700/50" 
                        : "bg-stone-50 border-stone-200"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isDark ? "bg-stone-700/50" : "bg-stone-200/80"
                    )}>
                      <Mic size={20} className={theme.text.dimmed} />
                    </div>
                    <div className="flex-1">
                      <p className={theme.text.muted}>Записать произношение</p>
                      <p className={cn("text-xs", theme.text.dimmed)}>Скоро будет доступно</p>
                    </div>
                    <div className={cn(
                      "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center",
                      isDark ? "bg-stone-700" : "bg-stone-200"
                    )}>
                      <Lock size={12} className={theme.text.dimmed} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Кнопка отправки */}
      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
        whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
        className={cn(
          "w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600",
          "text-white font-bold text-lg shadow-lg shadow-emerald-500/30",
          "hover:from-emerald-400 hover:to-teal-500 transition-all",
          "flex items-center justify-center gap-2",
          isSubmitting && "opacity-70 cursor-not-allowed"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Сохранение...
          </>
        ) : (
          <>
            <Send size={20} />
            Добавить слово
          </>
        )}
      </motion.button>
    </form>
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
  
  useBackButton(() => navigate('menu'));
  const [activeTab, setActiveTab] = useState<Tab>('add');
  
  // Категории из API
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Диалекты из API
  const [apiDialects, setApiDialects] = useState<ApiDialect[]>([]);
  const [dialectsLoading, setDialectsLoading] = useState(true);
  
  // Части речи из API
  const [apiPartsOfSpeech, setApiPartsOfSpeech] = useState<ApiPartOfSpeech[]>([]);
  const [partsOfSpeechLoading, setPartsOfSpeechLoading] = useState(true);
  
  // Статистика проекта из API
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Загрузка категорий, диалектов, частей речи и статистики при монтировании
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await api.getCategories();
        // Сортируем по order
        setApiCategories(data.sort((a, b) => a.order - b.order));
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };
    
    const fetchDialects = async () => {
      try {
        setDialectsLoading(true);
        const data = await getDialects();
        // Сортируем по sortOrder
        setApiDialects(data.sort((a, b) => a.sortOrder - b.sortOrder));
      } catch (error) {
        console.error('Failed to fetch dialects:', error);
      } finally {
        setDialectsLoading(false);
      }
    };
    
    const fetchPartsOfSpeech = async () => {
      try {
        setPartsOfSpeechLoading(true);
        const data = await getPartsOfSpeech();
        // Сортируем по sortOrder
        setApiPartsOfSpeech(data.sort((a, b) => a.sortOrder - b.sortOrder));
      } catch (error) {
        console.error('Failed to fetch parts of speech:', error);
      } finally {
        setPartsOfSpeechLoading(false);
      }
    };
    
    const fetchProjectStats = async () => {
      try {
        setStatsLoading(true);
        const data = await getProjectStats();
        setProjectStats(data);
      } catch (error) {
        console.error('Failed to fetch project stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchCategories();
    fetchDialects();
    fetchPartsOfSpeech();
    fetchProjectStats();
  }, []);

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
      {/* Sticky Header при скролле */}
      <StickyHeader 
        title="Үгын Дархан" 
        onBack={() => navigate('menu')}
        rightElement={<Heart size={20} className="text-rose-400 fill-rose-400/50" />}
      />
      
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
          <WelcomeScreen 
            onJoin={contribution.setContributor}
            onJoinKeepers={joinLanguageKeepers}
            telegramUser={telegramUser} 
            isDark={isDark} 
            theme={theme}
            projectStats={projectStats}
            statsLoading={statsLoading}
          />
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
                    onSubmit={createWord}
                    categories={apiCategories}
                    categoriesLoading={categoriesLoading}
                    dialects={apiDialects}
                    dialectsLoading={dialectsLoading}
                    partsOfSpeech={apiPartsOfSpeech}
                    partsOfSpeechLoading={partsOfSpeechLoading}
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
                  <WordVerificationPanel categories={apiCategories} />
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


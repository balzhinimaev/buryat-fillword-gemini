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
  MessageCircle,
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
  Heart
} from 'lucide-react';
import type { GameStore } from '../store/gameStore';
import { useContributionStore } from '../store/contributionStore';
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

// Форма регистрации контрибьютора
const ContributorForm: React.FC<{
  onSubmit: (name: string, telegram?: string) => void;
}> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [telegram, setTelegram] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), telegram.trim() || undefined);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6"
    >
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 
                        flex items-center justify-center shadow-xl shadow-amber-500/30">
          <Heart size={40} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Присоединяйтесь!</h2>
        <p className="text-stone-400 text-sm">
          Помогите сохранить бурятский язык. Ваш вклад бесценен!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-2">
            Ваше имя *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как вас зовут?"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-800/80 border border-stone-700 
                         text-white placeholder-stone-500 focus:outline-none focus:border-amber-500
                         transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-2">
            Telegram (необязательно)
          </label>
          <div className="relative">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
            <input
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@username"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-800/80 border border-stone-700 
                         text-white placeholder-stone-500 focus:outline-none focus:border-amber-500
                         transition-colors"
            />
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Для связи и благодарностей
          </p>
        </div>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={!name.trim()}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 
                     text-white font-bold text-lg shadow-lg shadow-amber-500/30
                     disabled:opacity-50 disabled:cursor-not-allowed
                     hover:from-amber-400 hover:to-orange-500 transition-all"
        >
          Начать помогать
        </motion.button>
      </form>
    </motion.div>
  );
};

// Форма добавления слова
const AddWordForm: React.FC<{
  onSubmit: (bur: string, ru: string, categoryId: string, example?: string) => void;
  isDuplicate: (bur: string) => boolean;
}> = ({ onSubmit, isDuplicate }) => {
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
        <label className="block text-sm font-medium text-stone-300 mb-2">
          Бурятское слово *
        </label>
        <input
          ref={burInputRef}
          type="text"
          value={bur}
          onChange={(e) => setBur(e.target.value.toUpperCase())}
          onFocus={() => setShowKeyboard(true)}
          placeholder="Например: НАРАН"
          className="w-full px-4 py-3 rounded-xl bg-stone-800/80 border border-stone-700 
                     text-white text-lg font-medium placeholder-stone-500 focus:outline-none 
                     focus:border-amber-500 transition-colors uppercase tracking-wider"
        />
        
        {/* Бурятская клавиатура */}
        <AnimatePresence>
          {showKeyboard && (
            <div className="mt-3">
              <p className="text-xs text-stone-500 mb-2 text-center">
                Специальные бурятские буквы:
              </p>
              <BuryatKeyboard onChar={handleBurChar} visible={showKeyboard} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Русский перевод */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">
          Перевод на русский *
        </label>
        <input
          type="text"
          value={ru}
          onChange={(e) => setRu(e.target.value)}
          onFocus={() => setShowKeyboard(false)}
          placeholder="Например: Солнце"
          className="w-full px-4 py-3 rounded-xl bg-stone-800/80 border border-stone-700 
                     text-white placeholder-stone-500 focus:outline-none focus:border-amber-500
                     transition-colors"
        />
      </div>

      {/* Категория */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">
          Категория *
        </label>
        <button
          type="button"
          onClick={() => setShowCategories(!showCategories)}
          className="w-full px-4 py-3 rounded-xl bg-stone-800/80 border border-stone-700 
                     text-left flex items-center justify-between transition-colors
                     hover:border-stone-600"
        >
          {selectedCategory ? (
            <span className="flex items-center gap-2">
              <span>{selectedCategory.emoji}</span>
              <span className="text-white">{selectedCategory.name}</span>
            </span>
          ) : (
            <span className="text-stone-500">Выберите категорию</span>
          )}
          <ChevronDown className={`text-stone-500 transition-transform ${showCategories ? 'rotate-180' : ''}`} size={18} />
        </button>

        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 rounded-xl bg-stone-800 border border-stone-700 overflow-hidden"
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
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 
                               transition-colors hover:bg-stone-700/50
                               ${categoryId === cat.id ? 'bg-amber-500/20' : ''}`}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="text-white">{cat.name}</span>
                    {categoryId === cat.id && (
                      <Check className="ml-auto text-amber-400" size={18} />
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
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 
                             transition-colors hover:bg-stone-700/50
                             ${categoryId === 'other' ? 'bg-amber-500/20' : ''}`}
                >
                  <span className="text-xl">📝</span>
                  <span className="text-white">Другое</span>
                  {categoryId === 'other' && (
                    <Check className="ml-auto text-amber-400" size={18} />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Пример использования */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">
          Пример использования (необязательно)
        </label>
        <textarea
          value={example}
          onChange={(e) => setExample(e.target.value)}
          onFocus={() => setShowKeyboard(false)}
          placeholder="Напишите пример предложения с этим словом..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-stone-800/80 border border-stone-700 
                     text-white placeholder-stone-500 focus:outline-none focus:border-amber-500
                     transition-colors resize-none"
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
}> = ({ word, onVerify, onFlag }) => {
  const category = categories.find(c => c.id === word.categoryId);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xl font-bold text-amber-400">{word.bur}</h3>
          <p className="text-white">{word.ru}</p>
        </div>
        <span className="px-2 py-1 rounded-lg bg-stone-700/50 text-stone-400 text-xs">
          {category?.emoji} {category?.name || 'Другое'}
        </span>
      </div>

      {word.example && (
        <p className="text-stone-400 text-sm italic mb-3">«{word.example}»</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-stone-500 text-xs">
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
            className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 
                       flex items-center justify-center hover:bg-red-500/30 transition-colors"
          >
            <X size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onVerify}
            className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 
                       flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
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
}> = ({ stats, onExport }) => {
  return (
    <div className="space-y-4">
      {/* Общая статистика */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-stone-800/60 border border-stone-700/50">
          <div className="flex items-center gap-2 text-stone-400 text-sm mb-1">
            <BookOpen size={14} />
            Всего слов
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalWords}</p>
        </div>
        
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
            <CheckCircle2 size={14} />
            Проверено
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats.verifiedWords}</p>
        </div>
        
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
            <Clock size={14} />
            На проверке
          </div>
          <p className="text-2xl font-bold text-amber-400">{stats.pendingWords}</p>
        </div>
        
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
            <XCircle size={14} />
            Отклонено
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.rejectedWords}</p>
        </div>
      </div>

      {/* Топ контрибьюторов */}
      {stats.topContributors.length > 0 && (
        <div className="p-4 rounded-xl bg-stone-800/60 border border-stone-700/50">
          <div className="flex items-center gap-2 text-amber-400 mb-4">
            <Trophy size={18} />
            <span className="font-semibold">Топ помощников</span>
          </div>
          
          <div className="space-y-2">
            {stats.topContributors.slice(0, 5).map((c, index) => (
              <div 
                key={c.name}
                className="flex items-center justify-between py-2 border-b border-stone-700/30 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${index === 0 ? 'bg-amber-500 text-white' : 
                      index === 1 ? 'bg-stone-400 text-white' : 
                      index === 2 ? 'bg-orange-700 text-white' : 
                      'bg-stone-700 text-stone-400'}
                  `}>
                    {index + 1}
                  </span>
                  <span className="text-white">{c.name}</span>
                </div>
                <span className="text-stone-400">{c.count} слов</span>
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
    <div className="min-h-[100dvh] bg-stone-900 flex flex-col">
      {/* Header */}
      <header className="relative p-4">
        {/* Декоративный фон */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent" />
        
        <div className="relative flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('menu')}
            className="w-10 h-10 rounded-xl bg-stone-800/80 flex items-center justify-center"
          >
            <ArrowLeft className="text-stone-300" size={20} />
          </motion.button>
          
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Үгын Дархан</h1>
            <p className="text-sm text-stone-400">Словарная мастерская</p>
          </div>

          {/* Аватар контрибьютора */}
          {contribution.currentContributor && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-800/60">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 
                              flex items-center justify-center text-white font-bold text-sm">
                {contribution.currentContributor.name[0].toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-white text-sm font-medium">
                  {contribution.currentContributor.name}
                </p>
                <p className="text-stone-500 text-xs">
                  {contribution.currentContributor.wordsAdded} слов
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Контент */}
      <main className="flex-1 px-4 pb-6 overflow-y-auto">
        {!contribution.currentContributor ? (
          // Форма регистрации
          <ContributorForm onSubmit={contribution.setContributor} />
        ) : (
          <>
            {/* Табы */}
            <div className="flex gap-2 mb-6 p-1 rounded-xl bg-stone-800/60">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 py-3 px-4 rounded-lg font-medium transition-all
                    flex items-center justify-center gap-2 relative
                    ${activeTab === tab.id 
                      ? 'bg-amber-500 text-white shadow-lg' 
                      : 'text-stone-400 hover:text-white'}
                  `}
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
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 
                                  border border-amber-500/20">
                    <div className="flex items-start gap-3">
                      <Sparkles className="text-amber-400 mt-0.5" size={20} />
                      <div>
                        <p className="text-amber-200 font-medium mb-1">Как добавить слово?</p>
                        <p className="text-stone-400 text-sm">
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
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-stone-800 
                                      flex items-center justify-center">
                        <Check className="text-stone-600" size={40} />
                      </div>
                      <p className="text-stone-400">Нет слов для проверки</p>
                      <p className="text-stone-500 text-sm mt-1">
                        Приходите позже или добавьте свои слова!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-stone-400 text-sm">
                        Помогите проверить слова других участников. 
                        Нажмите ✓ если слово правильное, или ✗ если есть ошибка.
                      </p>
                      
                      {contribution.getWordsForVerification.map(word => (
                        <WordCard
                          key={word.id}
                          word={word}
                          onVerify={() => contribution.verifyWord(word.id)}
                          onFlag={() => contribution.flagWord(word.id)}
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
                  <StatsView stats={contribution.stats} onExport={handleExport} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center border-t border-stone-800">
        <p className="text-stone-500 text-sm">
          <Users className="inline-block mr-1" size={14} />
          Вместе сохраняем бурятский язык 💛
        </p>
      </footer>
    </div>
  );
};

export default WordContributionScreen;


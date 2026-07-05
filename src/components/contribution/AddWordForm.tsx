// src/components/contribution/AddWordForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Send, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  Star,
  Settings2,
  Loader2
} from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { cn } from '../ui';
import { BuryatKeyboard } from './BuryatKeyboard';
import { AudioRecorderField, releaseAudioDraft, type AudioDraft } from './AudioRecorderField';
import { submitAudioSuggestion } from '../../services/api';
import type { 
  ApiCategory, 
  ApiDialect, 
  ApiPartOfSpeech, 
  CreateWordRequest, 
  CreateWordResponse 
} from '../../services/api';

interface AddWordFormProps {
  onSubmit: (data: CreateWordRequest) => Promise<CreateWordResponse>;
  categories: ApiCategory[];
  categoriesLoading: boolean;
  dialects: ApiDialect[];
  dialectsLoading: boolean;
  partsOfSpeech: ApiPartOfSpeech[];
  partsOfSpeechLoading: boolean;
}

export const AddWordForm: React.FC<AddWordFormProps> = ({ 
  onSubmit, 
  categories, 
  categoriesLoading, 
  dialects, 
  dialectsLoading, 
  partsOfSpeech, 
  partsOfSpeechLoading 
}) => {
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
  const formRef = useRef<HTMLFormElement>(null);
  const burInputRef = useRef<HTMLInputElement>(null);
  const exampleBurInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Расширенные параметры
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dialect, setDialect] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [difficulty, setDifficulty] = useState(0);
  const [showDialects, setShowDialects] = useState(false);
  const [showPartsOfSpeech, setShowPartsOfSpeech] = useState(false);
  const [audioDraft, setAudioDraft] = useState<AudioDraft | null>(null);
  const [audioNote, setAudioNote] = useState('');

  // По умолчанию — литературный диалект (все базовые слова словаря на нём)
  useEffect(() => {
    if (!dialect && dialects.some((d) => d.code === 'literary')) {
      setDialect('literary');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialects]);

  const resetForm = () => {
    setBur('');
    setRu('');
    setExampleBur('');
    setExampleRu('');
    setCategoryId('');
    setDialect('');
    setPartOfSpeech('');
    setDifficulty(0);
    setShowKeyboard(false);
    setShowExampleKeyboard(false);
    setShowCategories(false);
    setShowDialects(false);
    setShowPartsOfSpeech(false);
    releaseAudioDraft(audioDraft);
    setAudioDraft(null);
  };

  const localizeErrorMessage = (message: string): { text: string; isDuplicate: boolean } => {
    const duplicateRegex = /Word\s+"(.+?)"\s+with translation\s+"(.+?)"\s+already exists/i;
    const match = message.match(duplicateRegex);

    if (match) {
      const [, burWord, ruWord] = match;
      return {
        text: `Слово "${burWord}" с переводом "${ruWord}" уже есть в словаре`,
        isDuplicate: true,
      };
    }

    if (message.toLowerCase().includes('already exists')) {
      return {
        text: 'Такое слово уже есть в словаре',
        isDuplicate: true,
      };
    }

    return { text: message || 'Ошибка при сохранении слова', isDuplicate: false };
  };

  useEffect(() => {
    if (error) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error]);

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

      // Озвучка уходит отдельным предложением (на модерацию) — само слово уже создано
      setAudioNote('');
      if (audioDraft && response?._id) {
        try {
          await submitAudioSuggestion(response._id, audioDraft.blob, 'word', {
            dialectId: selectedDialect?._id,
            fileName: audioDraft.fileName,
          });
        } catch (audioErr) {
          console.log('⚠️ Слово создано, но озвучку отправить не удалось:', audioErr);
          setAudioNote('Слово отправлено, но озвучку загрузить не удалось — можно добавить её позже со страницы слова.');
        }
      }

      // Очистка формы
      resetForm();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('❌ Ошибка при добавлении слова:', err);
      const rawMessage = err instanceof Error 
        ? err.message 
        : (err as { message?: string })?.message || 'Ошибка при сохранении слова';
      const { text, isDuplicate } = localizeErrorMessage(rawMessage);

      if (isDuplicate) {
        resetForm();
      }

      setError(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find(c => c._id === categoryId);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
              <p className="text-emerald-400/70 text-sm">
                {audioNote || 'Спасибо за ваш вклад 💚'}
              </p>
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

                {/* Запись произношения — уйдёт на модерацию вместе со словом */}
                <div>
                  <label className={cn("block text-sm font-medium mb-2", theme.text.secondary)}>
                    Произношение
                  </label>
                  <div
                    className={cn(
                      "px-4 py-3.5 rounded-xl border-2 border-dashed",
                      isDark
                        ? "bg-stone-800/30 border-stone-700/50"
                        : "bg-stone-50 border-stone-200"
                    )}
                  >
                    <AudioRecorderField value={audioDraft} onChange={setAudioDraft} disabled={isSubmitting} />
                    <p className={cn("text-xs mt-2", theme.text.dimmed)}>
                      Озвучка появится у слова после проверки модератором
                    </p>
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


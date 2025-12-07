// src/components/WordVerificationPanel.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  User,
  Clock,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Quote,
} from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { cn } from './ui';
import type { PendingWord, VoteResponse, ApiCategory } from '../services/api';
import { getPendingWords, voteWord } from '../services/api';
import { useAuth } from '../store/authStore';

interface WordVerificationPanelProps {
  categories: ApiCategory[];
}

// Форматирование даты
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  if (hours < 24) return `${hours} ч. назад`;
  if (days < 7) return `${days} дн. назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

// Карточка слова для голосования
const VoteWordCard: React.FC<{
  word: PendingWord;
  category: ApiCategory | undefined;
  onVote: (type: 'upvote' | 'downvote', reason?: string) => Promise<void>;
  isVoting: boolean;
  currentUserId: string | undefined;
  currentUserTelegramId: number | undefined;
  onSwipe: (direction: 'left' | 'right') => void;
}> = ({ word, category, onVote, isVoting, currentUserId, currentUserTelegramId, onSwipe }) => {
  const { theme, isDark } = useTheme();
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState('');
  const [voteResult, setVoteResult] = useState<'upvote' | 'downvote' | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Проверяем, является ли пользователь автором слова (по telegramId)
  const isOwnWord = currentUserTelegramId !== undefined && 
    word.contributor.telegramId === currentUserTelegramId;
  
  // Проверяем, голосовал ли пользователь
  const hasUpvoted = currentUserId ? word.upvotes.includes(currentUserId) : false;
  const hasDownvoted = currentUserId ? word.downvotes.includes(currentUserId) : false;

  const handleVote = async (type: 'upvote' | 'downvote') => {
    // Проверяем, уже голосовал ли пользователь
    if ((type === 'upvote' && hasUpvoted) || (type === 'downvote' && hasDownvoted)) {
      // Запускаем эффект вибрации
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (type === 'downvote' && !showReasonInput) {
      setShowReasonInput(true);
      return;
    }
    
    try {
      await onVote(type, type === 'downvote' ? reason : undefined);
      setVoteResult(type);
      setShowReasonInput(false);
      setReason('');
      // Возвращаем карточку в исходное положение через 600мс
      setTimeout(() => setVoteResult(null), 600);
    } catch {
      // Ошибка обрабатывается в родительском компоненте
      // При ошибке также запускаем shake
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        onSwipe('right');
      } else {
        onSwipe('left');
      }
    }
  };

  const exampleText = word.exampleBur || word.example;

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        x: isShaking ? [0, -8, 8, -8, 8, -4, 4, 0] : 0,
        rotate: voteResult === 'upvote' ? 1.5 : voteResult === 'downvote' ? -1.5 : 0,
      }}
      transition={{
        x: {
          duration: 0.5,
          ease: "easeInOut"
        }
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.8, 
        x: voteResult === 'upvote' ? 300 : voteResult === 'downvote' ? -300 : 0,
        transition: { duration: 0.3 }
      }}
      className={cn(
        "p-5 rounded-2xl border relative overflow-hidden",
        isDark 
          ? "bg-gradient-to-br from-stone-800/90 to-stone-800/70 border-stone-700/50" 
          : "bg-white border-stone-200 shadow-lg"
      )}
    >
      {/* Фоновый паттерн */}
      <div className={cn(
        "absolute inset-0 opacity-5",
        isDark ? "bg-[url('/patterns/dots.svg')]" : "bg-[url('/patterns/grid.svg')]"
      )} />

      {/* Контент */}
      <div className="relative z-10">
        {/* Заголовок слова */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className={cn(
              "text-2xl font-bold tracking-wide mb-1",
              isDark ? "text-amber-400" : "text-amber-600"
            )}>
              {word.bur}
            </h3>
            <p className={cn("text-lg", theme.text.primary)}>
              {word.ru}
            </p>
          </div>
          
          {category && (
            <span className={cn(
              "px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-1.5",
              isDark 
                ? "bg-stone-700/60 text-stone-300" 
                : "bg-stone-100 text-stone-600"
            )}>
              <span>{category.emoji}</span>
              <span className="hidden sm:inline">{category.name}</span>
            </span>
          )}
        </div>

        {/* Пример использования */}
        {exampleText && (
          <div className={cn(
            "mb-4 p-3 rounded-xl border-l-4",
            isDark 
              ? "bg-stone-700/30 border-amber-500/50" 
              : "bg-amber-50 border-amber-400"
          )}>
            <div className="flex items-start gap-2">
              <Quote size={14} className={cn(
                "mt-0.5 flex-shrink-0",
                isDark ? "text-amber-500/60" : "text-amber-500"
              )} />
              <div>
                <p className={cn("text-sm italic", theme.text.secondary)}>
                  {exampleText}
                </p>
                {word.exampleRu && (
                  <p className={cn("text-xs mt-1", theme.text.dimmed)}>
                    {word.exampleRu}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Метаданные */}
        <div className={cn(
          "flex items-center justify-between text-xs mb-4 pb-4 border-b",
          isDark ? "border-stone-700/50" : "border-stone-200"
        )}>
          <div className={cn("flex items-center gap-1.5", theme.text.dimmed)}>
            <User size={12} />
            <span>{word.contributor.name}</span>
          </div>
          <div className={cn("flex items-center gap-1.5", theme.text.dimmed)}>
            <Clock size={12} />
            <span>{formatDate(word.createdAt)}</span>
          </div>
        </div>

        {/* Статус голосов */}
        <div className={cn(
          "flex items-center justify-center gap-4 mb-4 py-2 px-3 rounded-xl",
          isDark ? "bg-stone-700/30" : "bg-stone-50"
        )}>
          <div className={cn(
            "flex items-center gap-1.5",
            word.upvotes.length > 0 
              ? (isDark ? "text-emerald-400" : "text-emerald-600")
              : theme.text.dimmed
          )}>
            <ThumbsUp size={14} />
            <span className="font-medium">{word.upvotes.length}</span>
          </div>
          <div className={cn("w-px h-4", isDark ? "bg-stone-600" : "bg-stone-300")} />
          <div className={cn(
            "flex items-center gap-1.5",
            word.downvotes.length > 0 
              ? (isDark ? "text-red-400" : "text-red-600")
              : theme.text.dimmed
          )}>
            <ThumbsDown size={14} />
            <span className="font-medium">{word.downvotes.length}</span>
          </div>
          <div className={cn("w-px h-4", isDark ? "bg-stone-600" : "bg-stone-300")} />
          <div className={cn("flex items-center gap-1.5", theme.text.dimmed)}>
            <Sparkles size={14} />
            <span className="font-medium">{word.verificationScore}</span>
          </div>
        </div>

        {/* Форма причины отклонения */}
        <AnimatePresence>
          {showReasonInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className={cn(
                "p-3 rounded-xl border",
                isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
              )}>
                <div className="flex items-start gap-2 mb-2">
                  <MessageSquare size={16} className={isDark ? "text-red-400" : "text-red-500"} />
                  <p className={cn("text-sm font-medium", isDark ? "text-red-300" : "text-red-700")}>
                    Укажите причину (необязательно)
                  </p>
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Например: орфографическая ошибка, неверный перевод..."
                  rows={2}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2",
                    isDark 
                      ? "bg-stone-800 border-stone-700 text-white placeholder-stone-500 focus:ring-red-500/30 focus:border-red-500"
                      : "bg-white border-stone-200 text-stone-800 placeholder-stone-400 focus:ring-red-500/20 focus:border-red-400"
                  )}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      setShowReasonInput(false);
                      setReason('');
                    }}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                      isDark 
                        ? "bg-stone-700 text-stone-300 hover:bg-stone-600"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    )}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleVote('downvote')}
                    disabled={isVoting}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                      isDark 
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-red-100 text-red-600 hover:bg-red-200",
                      isVoting && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {isVoting ? <Loader2 size={14} className="animate-spin" /> : <ThumbsDown size={14} />}
                    Отклонить
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Кнопки голосования */}
        {isOwnWord ? (
          <div className={cn(
            "text-center py-3 rounded-xl",
            isDark ? "bg-stone-700/30 text-stone-400" : "bg-stone-100 text-stone-500"
          )}>
            <p className="text-sm">Это ваше слово — голосовать нельзя</p>
          </div>
        ) : !showReasonInput && (
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: hasDownvoted ? 1 : 1.02 }}
              whileTap={{ scale: hasDownvoted ? 1 : 0.98 }}
              onClick={() => handleVote('downvote')}
              disabled={isVoting || hasDownvoted}
              className={cn(
                "flex-1 py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                isDark 
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-red-50 text-red-600 border border-red-200",
                hasDownvoted 
                  ? "opacity-50 cursor-not-allowed" 
                  : (isDark ? "hover:bg-red-500/30" : "hover:bg-red-100"),
                isVoting && !hasDownvoted && "opacity-60 cursor-not-allowed"
              )}
            >
              <ThumbsDown size={18} />
              <span>{hasDownvoted ? 'Отклонено ✓' : 'Отклонить'}</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: hasUpvoted ? 1 : 1.02 }}
              whileTap={{ scale: hasUpvoted ? 1 : 0.98 }}
              onClick={() => handleVote('upvote')}
              disabled={isVoting || hasUpvoted}
              className={cn(
                "flex-1 py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                isDark 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-200",
                hasUpvoted 
                  ? "opacity-50 cursor-not-allowed" 
                  : (isDark ? "hover:bg-emerald-500/30" : "hover:bg-emerald-100"),
                isVoting && !hasUpvoted && "opacity-60 cursor-not-allowed"
              )}
            >
              {isVoting && !hasUpvoted ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ThumbsUp size={18} />
              )}
              <span>{hasUpvoted ? 'Одобрено ✓' : 'Одобрить'}</span>
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const WordVerificationPanel: React.FC<WordVerificationPanelProps> = ({ categories }) => {
  const { theme, isDark } = useTheme();
  const { state: { user } } = useAuth();
  
  const [words, setWords] = useState<PendingWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votingWordId, setVotingWordId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Ref для отмены автоперехода при ручной навигации
  const autoTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchWords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingWords();
      setWords(data);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to fetch pending words:', err);
      setError('Не удалось загрузить слова на проверке');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const handleVote = async (wordId: string, type: 'upvote' | 'downvote', reason?: string) => {
    setVotingWordId(wordId);
    try {
      const response: VoteResponse = await voteWord({ wordId, type, reason });
      
      // Обновляем слово в списке
      setWords(prev => prev.map(w => 
        w._id === wordId ? response.word : w
      ));
      
      setSuccessMessage(type === 'upvote' ? 'Голос за одобрение учтён!' : 'Голос за отклонение учтён!');
      
      // Сохраняем текущий индекс для проверки
      const indexAtVote = currentIndex;
      
      // Отменяем предыдущий таймер если есть
      if (autoTransitionRef.current) {
        clearTimeout(autoTransitionRef.current);
      }
      
      autoTransitionRef.current = setTimeout(() => {
        setSuccessMessage(null);
        // Переходим к следующему слову только если пользователь не перешёл сам
        setCurrentIndex(prev => {
          // Если индекс изменился с момента голосования - не переходим
          if (prev !== indexAtVote) return prev;
          // Иначе переходим к следующему
          return prev < words.length - 1 ? prev + 1 : prev;
        });
        autoTransitionRef.current = null;
      }, 1500);
    } catch (err) {
      console.error('Vote failed:', err);
      // Показываем сообщение от API
      const errorMessage = (err as { message?: string })?.message || 'Не удалось проголосовать';
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    } finally {
      setVotingWordId(null);
    }
  };

  // Отмена автоперехода при ручной навигации
  const cancelAutoTransition = useCallback(() => {
    if (autoTransitionRef.current) {
      clearTimeout(autoTransitionRef.current);
      autoTransitionRef.current = null;
    }
  }, []);

  const handleSwipe = (direction: 'left' | 'right') => {
    cancelAutoTransition();
    if (direction === 'right' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (direction === 'left' && currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToNext = () => {
    cancelAutoTransition();
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    cancelAutoTransition();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const currentWord = words[currentIndex];

  // Загрузка
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={40} className={cn("animate-spin mb-4", theme.text.accent)} />
        <p className={theme.text.muted}>Загрузка слов на проверке...</p>
      </div>
    );
  }

  // Ошибка
  if (error && words.length === 0) {
    return (
      <div className={cn(
        "p-6 rounded-2xl border text-center",
        isDark 
          ? "bg-red-500/10 border-red-500/30"
          : "bg-red-50 border-red-200"
      )}>
        <AlertCircle size={40} className={cn(
          "mx-auto mb-3",
          isDark ? "text-red-400" : "text-red-500"
        )} />
        <p className={cn("font-medium mb-2", isDark ? "text-red-300" : "text-red-700")}>
          {error}
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchWords}
          className={cn(
            "px-4 py-2 rounded-xl font-medium flex items-center gap-2 mx-auto",
            isDark 
              ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
              : "bg-red-100 text-red-600 hover:bg-red-200"
          )}
        >
          <RefreshCw size={16} />
          Попробовать снова
        </motion.button>
      </div>
    );
  }

  // Нет слов
  if (words.length === 0) {
    return (
      <div className="text-center py-12">
        <div className={cn(
          "w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center",
          isDark ? "bg-stone-800" : "bg-stone-100"
        )}>
          <CheckCircle2 className={cn("w-12 h-12", theme.text.dimmed)} />
        </div>
        <p className={cn("font-semibold mb-1", theme.text.primary)}>
          Все слова проверены! 🎉
        </p>
        <p className={cn("text-sm mb-4", theme.text.dimmed)}>
          Нет слов, ожидающих проверки. Приходите позже!
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchWords}
          className={cn(
            "px-4 py-2 rounded-xl font-medium flex items-center gap-2 mx-auto",
            isDark 
              ? "bg-stone-700 text-stone-300 hover:bg-stone-600"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          )}
        >
          <RefreshCw size={16} />
          Обновить
        </motion.button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Инструкция */}
      <div className={cn(
        "p-4 rounded-xl border",
        isDark 
          ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20"
          : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            isDark ? "bg-amber-500/20" : "bg-amber-100"
          )}>
            <Sparkles className={isDark ? "text-amber-400" : "text-amber-600"} size={20} />
          </div>
          <div>
            <p className={cn("font-medium mb-1", isDark ? "text-amber-200" : "text-amber-800")}>
              Как проверять слова?
            </p>
            <p className={cn("text-sm", isDark ? "text-stone-400" : "text-amber-700/80")}>
              Одобряйте правильные слова 👍 и отклоняйте ошибочные 👎. 
              Слово попадёт в игру после достижения нужного числа голосов.
            </p>
          </div>
        </div>
      </div>

      {/* Сообщения */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-3 rounded-xl border flex items-center gap-2",
              isDark 
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            )}
          >
            <CheckCircle2 size={18} />
            <span className="font-medium">{successMessage}</span>
          </motion.div>
        )}
        
        {error && words.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-3 rounded-xl border flex items-center justify-between",
              isDark 
                ? "bg-red-500/20 border-red-500/30 text-red-300"
                : "bg-red-50 border-red-200 text-red-700"
            )}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Счётчик и навигация */}
      <div className="flex items-center justify-between">
        <motion.button
          whileHover={{ scale: currentIndex > 0 ? 1.1 : 1 }}
          whileTap={{ scale: currentIndex > 0 ? 0.9 : 1 }}
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
            currentIndex > 0
              ? (isDark ? "bg-stone-700 text-white hover:bg-stone-600" : "bg-stone-100 text-stone-700 hover:bg-stone-200")
              : (isDark ? "bg-stone-800/50 text-stone-600" : "bg-stone-50 text-stone-300"),
            currentIndex === 0 && "cursor-not-allowed"
          )}
        >
          <ChevronLeft size={20} />
        </motion.button>

        <div className={cn("text-sm font-medium", theme.text.muted)}>
          <span className={theme.text.accent}>{currentIndex + 1}</span>
          <span> / {words.length}</span>
        </div>

        <motion.button
          whileHover={{ scale: currentIndex < words.length - 1 ? 1.1 : 1 }}
          whileTap={{ scale: currentIndex < words.length - 1 ? 0.9 : 1 }}
          onClick={goToNext}
          disabled={currentIndex >= words.length - 1}
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
            currentIndex < words.length - 1
              ? (isDark ? "bg-stone-700 text-white hover:bg-stone-600" : "bg-stone-100 text-stone-700 hover:bg-stone-200")
              : (isDark ? "bg-stone-800/50 text-stone-600" : "bg-stone-50 text-stone-300"),
            currentIndex >= words.length - 1 && "cursor-not-allowed"
          )}
        >
          <ChevronRight size={20} />
        </motion.button>
      </div>

      {/* Карточка слова */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          {currentWord && (
            <VoteWordCard
              key={currentWord._id || `word-${currentIndex}`}
              word={currentWord}
              category={categories.find(c => c._id === currentWord.categoryId)}
              onVote={(type, reason) => handleVote(currentWord._id, type, reason)}
              isVoting={votingWordId === currentWord._id}
              currentUserId={user?._id}
              currentUserTelegramId={user?.telegramId}
              onSwipe={handleSwipe}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Прогресс-бар */}
      <div className={cn(
        "h-1.5 rounded-full overflow-hidden",
        isDark ? "bg-stone-700" : "bg-stone-200"
      )}>
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Кнопка обновления */}
      <div className="flex justify-center">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchWords}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors",
            isDark 
              ? "bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700"
              : "bg-stone-100 text-stone-500 hover:text-stone-700 hover:bg-stone-200"
          )}
        >
          <RefreshCw size={14} />
          Обновить список
        </motion.button>
      </div>
    </div>
  );
};

export default WordVerificationPanel;


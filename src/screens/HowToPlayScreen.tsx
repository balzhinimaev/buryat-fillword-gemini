// src/screens/HowToPlayScreen.tsx
import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play,
  Hand,
  CheckCircle2,
  ListChecks,
  Timer,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import { cn } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';

interface HowToPlayScreenProps {
  store: GameStore;
}

type HowToStep = {
  title: string;
  subtitle: string;
  emoji: string;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string;
  darkColor: string;
  illustration: React.ReactNode;
  tips: string[];
};

// Мини-сетка для иллюстрации
const MiniGrid: React.FC<{ 
  letters: string[][]; 
  highlighted?: [number, number][];
  isDark: boolean;
}> = ({ letters, highlighted = [], isDark }) => {
  const isHighlighted = (r: number, c: number) => 
    highlighted.some(([hr, hc]) => hr === r && hc === c);
  
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${letters[0].length}, 1fr)` }}>
      {letters.map((row, r) => 
        row.map((letter, c) => (
          <motion.div
            key={`${r}-${c}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: (r * letters[0].length + c) * 0.03 }}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-all",
              isHighlighted(r, c)
                ? isDark 
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 text-stone-900 shadow-lg shadow-amber-500/30"
                  : "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                : isDark
                  ? "bg-stone-700/60 text-stone-300"
                  : "bg-stone-200 text-stone-600"
            )}
          >
            {letter}
          </motion.div>
        ))
      )}
    </div>
  );
};

// Анимированная рука для демонстрации свайпа
// Размер клетки: 36px (w-9), gap: 4px (gap-1)
// Шаг перемещения между клетками = 36 + 4 = 40px
const CELL_SIZE = 36;
const GAP = 4;
const STEP = CELL_SIZE + GAP;
const HAND_SIZE = 32; // w-8

const SwipeHand: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{
      // Начальная позиция: центр первой клетки [0,0] минус половина размера иконки руки
      left: CELL_SIZE / 2 - HAND_SIZE / 2,
      top: CELL_SIZE / 2 - HAND_SIZE / 2,
    }}
    animate={{ 
      // Путь: [0,0] → [0,1] → [0,2] → [1,2]
      x: [0, STEP, STEP * 2, STEP * 2],
      y: [0, 0, 0, STEP],
    }}
    transition={{ 
      duration: 2.5,
      repeat: Infinity,
      repeatDelay: 0.8,
      ease: "easeInOut",
      times: [0, 0.3, 0.6, 1], // Равномерные шаги
    }}
  >
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center shadow-lg",
      isDark ? "bg-amber-400/90" : "bg-amber-500/90"
    )}>
      <Hand size={16} className="text-white -rotate-12" />
    </div>
  </motion.div>
);

const createSteps = (isDark: boolean): HowToStep[] => [
  {
    title: 'Привет! 👋',
    subtitle: 'Давай научимся играть — это очень просто!',
    emoji: '🎮',
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
    darkColor: 'from-violet-600 to-purple-700',
    illustration: (
      <div className="relative flex items-center justify-center py-4">
        <motion.div 
          className="text-7xl"
          animate={{ 
            rotate: [0, -10, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        >
          🎯
        </motion.div>
        <motion.div
          className="absolute -right-2 top-0 text-3xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ✨
        </motion.div>
      </div>
    ),
    tips: [
      'Находи спрятанные слова на бурятском языке',
      'Запоминай переводы — так ты выучишь язык!',
    ],
  },
  {
    title: 'Веди пальцем',
    subtitle: 'Нажми на букву и веди по соседним',
    emoji: '👆',
    icon: Hand,
    color: 'from-blue-500 to-cyan-500',
    darkColor: 'from-blue-600 to-cyan-600',
    illustration: (
      <div className="flex items-center justify-center py-2">
        {/* Обёртка для точного позиционирования руки относительно сетки */}
        <div className="relative">
          <MiniGrid 
            letters={[
              ['С', 'А', 'Й'],
              ['М', 'И', 'Н'],
              ['Э', 'Н', 'Д'],
            ]}
            highlighted={[[0, 0], [0, 1], [0, 2], [1, 2]]}
            isDark={isDark}
          />
          <SwipeHand isDark={isDark} />
        </div>
      </div>
    ),
    tips: [
      'Можно двигаться ↑ ↓ ← → (не по диагонали!)',
      'Не отрывай палец, пока ведёшь по буквам',
    ],
  },
  {
    title: 'Отпусти — готово!',
    subtitle: 'Если слово правильное — оно засчитается',
    emoji: '✅',
    icon: CheckCircle2,
    color: 'from-emerald-500 to-teal-500',
    darkColor: 'from-emerald-600 to-teal-600',
    illustration: (
      <div className="relative flex items-center justify-center py-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center",
            isDark ? "bg-emerald-500/20" : "bg-emerald-500/10"
          )}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <CheckCircle2 size={48} className={isDark ? "text-emerald-400" : "text-emerald-500"} />
          </motion.div>
        </motion.div>
        <motion.div
          className="absolute -top-2 -right-2"
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
        >
          <span className="text-3xl">🎉</span>
        </motion.div>
      </div>
    ),
    tips: [
      'Найденное слово подсветится на поле',
      'Ошибся? Не страшно — попробуй ещё раз!',
    ],
  },
  {
    title: 'Список слов',
    subtitle: 'Там видно, что искать и что нашёл',
    emoji: '📋',
    icon: ListChecks,
    color: 'from-orange-500 to-amber-500',
    darkColor: 'from-orange-600 to-amber-600',
    illustration: (
      <div className="space-y-2 py-2">
        {[
          { word: 'САЙН', translation: 'Привет', found: true },
          { word: 'МЭНДЭ', translation: 'Здравствуй', found: true },
          { word: 'БАЙНА', translation: 'Есть', found: false },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.15 }}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl",
              item.found 
                ? isDark ? "bg-emerald-500/20" : "bg-emerald-500/10"
                : isDark ? "bg-stone-700/40" : "bg-stone-200/60"
            )}
          >
            <span className={cn(
              "font-bold text-sm",
              item.found 
                ? isDark ? "text-emerald-400 line-through" : "text-emerald-600 line-through"
                : isDark ? "text-stone-300" : "text-stone-700"
            )}>
              {item.word}
            </span>
            <span className={cn(
              "text-xs",
              isDark ? "text-stone-400" : "text-stone-500"
            )}>
              {item.translation}
            </span>
            {item.found && <CheckCircle2 size={14} className={isDark ? "text-emerald-400" : "text-emerald-500"} />}
          </motion.div>
        ))}
      </div>
    ),
    tips: [
      'Слова показаны вместе с переводом',
      'Нашёл все — уровень пройден!',
    ],
  },
  {
    title: 'Звёзды ⭐',
    subtitle: 'Играй быстрее — получай больше!',
    emoji: '🏆',
    icon: Timer,
    color: 'from-amber-500 to-yellow-500',
    darkColor: 'from-amber-600 to-yellow-600',
    illustration: (
      <div className="flex items-center justify-center gap-2 py-4">
        {[1, 2, 3].map((star) => (
          <motion.div
            key={star}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: star * 0.2, type: 'spring' }}
          >
            <motion.span 
              className="text-4xl"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                delay: star * 0.3
              }}
            >
              ⭐
            </motion.span>
          </motion.div>
        ))}
      </div>
    ),
    tips: [
      'Чем быстрее — тем больше звёзд',
      'Меньше ошибок — лучше результат',
    ],
  },
  {
    title: 'Подсказки 💡',
    subtitle: 'Если сложно — включи в настройках',
    emoji: '✨',
    icon: Lightbulb,
    color: 'from-pink-500 to-rose-500',
    darkColor: 'from-pink-600 to-rose-600',
    illustration: (
      <div className="relative flex items-center justify-center py-4">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center",
            isDark ? "bg-amber-400/20" : "bg-amber-500/15"
          )}
        >
          <Lightbulb size={36} className={isDark ? "text-amber-400" : "text-amber-500"} />
        </motion.div>
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ 
            scale: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-xl">💫</span>
        </motion.div>
      </div>
    ),
    tips: [
      'Подсветятся первые буквы слов',
      'Меню → Настройки → Подсказки',
    ],
  },
];

export const HowToPlayScreen: React.FC<HowToPlayScreenProps> = ({ store }) => {
  const { navigate, updateSettings, state } = store;
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);

  const STEPS = createSteps(isDark);
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const markSeen = useCallback(() => {
    if (state.settings.hasSeenHowTo) return;
    updateSettings({ hasSeenHowTo: true });
  }, [state.settings.hasSeenHowTo, updateSettings]);

  const closeToMenu = useCallback(() => {
    markSeen();
    navigate('menu');
  }, [markSeen, navigate]);

  const totalSteps = STEPS.length;

  const goPrev = useCallback(() => {
    setStepIndex((s) => Math.max(0, s - 1));
  }, []);

  const goNext = useCallback(() => {
    setStepIndex((s) => Math.min(totalSteps - 1, s + 1));
  }, [totalSteps]);

  const handleFinish = useCallback(() => {
    markSeen();
    navigate('gameMode');
  }, [markSeen, navigate]);

  useBackButton(() => {
    if (!isFirst) {
      goPrev();
      return;
    }
    closeToMenu();
  });

  const StepIcon = step.icon;

  return (
    <div className={cn("min-h-[100dvh] flex flex-col relative overflow-hidden", styles.pageGradient)}>
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn("absolute top-1/4 -left-32 w-64 h-64 rounded-full blur-3xl", styles.decorativeOrbs.primary)} />
        <div className={cn("absolute bottom-1/3 -right-32 w-80 h-80 rounded-full blur-3xl", styles.decorativeOrbs.secondary)} />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, ${styles.gridPattern} 1px, transparent 1px),
              linear-gradient(to bottom, ${styles.gridPattern} 1px, transparent 1px)
            `,
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={closeToMenu}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              isDark ? "text-stone-400 hover:text-stone-200" : "text-stone-500 hover:text-stone-700"
            )}
          >
            ← Меню
          </button>
          
          <button
            onClick={handleFinish}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
              isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/5 hover:bg-black/10 text-stone-800"
            )}
          >
            Пропустить
          </button>
        </div>
      </header>

      {/* Progress dots */}
      <div className="relative z-10 flex items-center justify-center gap-2 py-3">
        {STEPS.map((_, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{ 
              width: i === stepIndex ? 32 : 8,
              opacity: i === stepIndex ? 1 : 0.4
            }}
            className={cn(
              "h-2 rounded-full transition-colors",
              i === stepIndex 
                ? isDark ? "bg-amber-400" : "bg-amber-500"
                : isDark ? "bg-white/30" : "bg-black/20"
            )}
          />
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 px-5 pb-6 relative z-10 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex-1 flex flex-col"
          >
            {/* Card */}
            <div className={cn(
              "flex-1 rounded-3xl border overflow-hidden flex flex-col",
              styles.statsCard.background,
              styles.statsCard.border
            )}>
              {/* Header with gradient */}
              <div className={cn(
                "relative px-5 pt-5 pb-4",
                `bg-gradient-to-r ${isDark ? step.darkColor : step.color}`
              )}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="relative flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <StepIcon size={28} className="text-white" />
                  </div>
                  <div className="flex-1 pt-1">
                    <h2 className="text-xl font-bold text-white leading-tight">
                      {step.title}
                    </h2>
                    <p className="text-sm text-white/80 mt-1">
                      {step.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Illustration */}
              <div className={cn(
                "flex-1 flex items-center justify-center px-5 py-6",
                isDark ? "bg-stone-800/30" : "bg-stone-50/50"
              )}>
                {step.illustration}
              </div>

              {/* Tips */}
              <div className="px-5 pb-5 space-y-2">
                {step.tips.map((tip, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl",
                      isDark ? "bg-white/5" : "bg-white/70"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-sm",
                      isDark ? "bg-amber-400/20 text-amber-300" : "bg-amber-500/15 text-amber-600"
                    )}>
                      {idx + 1}
                    </div>
                    <p className={cn("text-sm leading-relaxed flex-1", styles.buttons.text.primary)}>
                      {tip}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={!isFirst ? goPrev : closeToMenu}
            className={cn(
              "p-4 rounded-2xl border flex items-center justify-center gap-2 font-semibold transition-colors",
              styles.buttons.card.background,
              styles.buttons.card.border,
              styles.buttons.card.borderHover
            )}
          >
            <ChevronLeft size={18} />
            {!isFirst ? 'Назад' : 'Меню'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={!isLast ? goNext : handleFinish}
            className={cn(
              "p-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-white",
              `bg-gradient-to-r ${isDark ? step.darkColor : step.color}`,
              "shadow-lg"
            )}
            style={{
              boxShadow: isDark 
                ? '0 4px 20px rgba(251, 191, 36, 0.2)' 
                : '0 4px 20px rgba(251, 191, 36, 0.3)'
            }}
          >
            {!isLast ? (
              <>
                Дальше <ChevronRight size={18} />
              </>
            ) : (
              <>
                <Play size={18} /> Играть!
              </>
            )}
          </motion.button>
        </div>

        {/* Step counter */}
        <div className={cn("text-center mt-3 text-sm", styles.buttons.text.muted)}>
          {stepIndex + 1} из {STEPS.length}
        </div>
      </main>
    </div>
  );
};

export default HowToPlayScreen;

// src/screens/HowToPlayScreen.tsx
import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import { getMenuStyles } from '../theme/menuStyles';
import { useBackButton } from '../hooks/useTelegram';
import type { GameStore } from '../store/gameStore';

interface HowToPlayScreenProps {
  store: GameStore;
}

// ─── Floating particles ────────────────────────────────────────────
const FloatingParticles: React.FC<{ color: string }> = ({ color }) => {
  const particles = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
      dur: Math.random() * 7 + 5,
      delay: Math.random() * 3,
    })), []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: color }}
          animate={{ y: [0, -30, 0], opacity: [0, 0.7, 0], scale: [0.5, 1.3, 0.5] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
};

// ─── Mini fillword grid with animated swipe finger ─────────────────
const CELL = 40;
const GAP = 5;

const AnimatedGrid: React.FC<{
  letters: string[][];
  path: [number, number][];
  isDark: boolean;
  accentFrom: string;
  accentTo: string;
}> = ({ letters, path, isDark, accentFrom, accentTo }) => {
  const cols = letters[0].length;

  // visitedCount: how many path cells are highlighted (0 = none, path.length = all)
  const [visitedCount, setVisitedCount] = useState(0);
  const [fingerVisible, setFingerVisible] = useState(false);
  const [fingerIdx, setFingerIdx] = useState(0); // which cell the finger is over
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const STEP_MS = 420;   // time per cell
  const HOLD_MS = 700;   // hold after last cell
  const PAUSE_MS = 1600; // pause before restart
  const INIT_MS = 500;   // initial delay

  useEffect(() => {
    let step = -1; // -1 = initial wait
    const total = path.length;

    const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

    const tick = () => {
      step++;

      if (step === 0) {
        // Show finger at first cell, no cells highlighted yet
        setFingerVisible(true);
        setFingerIdx(0);
        setVisitedCount(0);
        timerRef.current = setTimeout(tick, STEP_MS * 0.5);
      } else if (step <= total) {
        // Highlight cell (step-1) and move finger to cell (step-1)
        setFingerIdx(step - 1);
        setVisitedCount(step);
        timerRef.current = setTimeout(tick, STEP_MS);
      } else if (step === total + 1) {
        // Hold: all cells highlighted, finger still visible
        timerRef.current = setTimeout(tick, HOLD_MS);
      } else if (step === total + 2) {
        // Hide finger, keep highlights briefly
        setFingerVisible(false);
        timerRef.current = setTimeout(tick, 300);
      } else if (step === total + 3) {
        // Reset highlights
        setVisitedCount(0);
        timerRef.current = setTimeout(tick, PAUSE_MS);
      } else {
        // Restart cycle
        step = -1;
        tick();
      }
    };

    timerRef.current = setTimeout(tick, INIT_MS);
    return clear;
  }, [path.length]);

  // Path cell positions (center of each cell)
  const pathPositions = useMemo(() =>
    path.map(([r, c]) => ({
      x: c * (CELL + GAP) + CELL / 2,
      y: r * (CELL + GAP) + CELL / 2,
    })),
    [path]
  );

  // Which path cells are currently "active"
  const isActive = (r: number, c: number) => {
    for (let i = 0; i < visitedCount; i++) {
      if (path[i][0] === r && path[i][1] === c) return true;
    }
    return false;
  };

  const isOnPath = (r: number, c: number) => path.some(([pr, pc]) => pr === r && pc === c);

  const gridW = cols * CELL + (cols - 1) * GAP;
  const gridH = letters.length * CELL + (letters.length - 1) * GAP;

  const fingerW = 36;
  const fingerPos = pathPositions[fingerIdx] || pathPositions[0];

  return (
    <div className="relative" style={{ width: gridW, height: gridH + 28 }}>
      {/* Grid */}
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${cols}, ${CELL}px)`, gap: `${GAP}px` }}
      >
        {letters.map((row, r) =>
          row.map((letter, c) => {
            const onPath = isOnPath(r, c);
            const active = isActive(r, c);
            return (
              <div
                key={`${r}-${c}`}
                className={cn(
                  'rounded-xl flex items-center justify-center font-extrabold text-base select-none transition-all duration-200',
                  active
                    ? 'text-white scale-105'
                    : onPath
                      ? isDark
                        ? 'bg-stone-700/70 text-stone-300'
                        : 'bg-stone-200/80 text-stone-500'
                      : isDark
                        ? 'bg-stone-700/70 text-stone-400'
                        : 'bg-stone-200/80 text-stone-500'
                )}
                style={{
                  width: CELL, height: CELL,
                  ...(active ? {
                    background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`,
                    boxShadow: `0 0 16px ${accentFrom}60, 0 4px 12px ${accentFrom}30`,
                  } : {}),
                }}
              >
                {letter}
              </div>
            );
          })
        )}
      </div>

      {/* Finger */}
      <div
        className="absolute top-0 left-0 pointer-events-none z-10 transition-all ease-out"
        style={{
          width: fingerW,
          height: fingerW,
          transform: `translate(${fingerPos.x - fingerW / 2}px, ${fingerPos.y - 4}px)`,
          opacity: fingerVisible ? 1 : 0,
          transitionDuration: fingerVisible ? `${STEP_MS * 0.7}ms` : '200ms',
        }}
      >
        <span className="text-3xl block text-center" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}>
          👆
        </span>
      </div>
    </div>
  );
};

// ─── Animated word list ────────────────────────────────────────────
const AnimatedWordList: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const words = [
    { word: 'САЙН', translation: 'Привет', found: true },
    { word: 'МЭНДЭ', translation: 'Здравствуй', found: true },
    { word: 'БАЙНА', translation: 'Есть', found: false },
  ];
  return (
    <div className="space-y-2.5 w-full max-w-[260px]">
      {words.map((item, i) => (
        <motion.div
          key={i}
          initial={{ x: -40, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.2, type: 'spring', stiffness: 150 }}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all',
            item.found
              ? isDark
                ? 'bg-emerald-500/15 border-emerald-500/30'
                : 'bg-emerald-50 border-emerald-200'
              : isDark
                ? 'bg-stone-800/60 border-stone-700/50'
                : 'bg-white/80 border-stone-200'
          )}
        >
          <span className={cn(
            'font-extrabold text-sm tracking-wide',
            item.found
              ? isDark ? 'text-emerald-400 line-through' : 'text-emerald-600 line-through'
              : isDark ? 'text-stone-200' : 'text-stone-700'
          )}>
            {item.word}
          </span>
          <span className={cn('text-xs flex-1', isDark ? 'text-stone-400' : 'text-stone-500')}>
            {item.translation}
          </span>
          {item.found && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 + i * 0.2, type: 'spring', stiffness: 300 }}
            >
              <CheckCircle2 size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-500'} />
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

// ─── Animated stars burst ──────────────────────────────────────────
const StarsBurst: React.FC = () => (
  <div className="flex items-center justify-center gap-6">
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        className="relative flex items-center justify-center"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.4 + i * 0.25, type: 'spring', stiffness: 200 }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          className="relative z-10"
        >
          <span className="text-5xl block" style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.5))' }}>
            ⭐
          </span>
        </motion.div>
        {/* Sparkle ring */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [0.5, 1.8], opacity: [0.5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: 0.6 + i * 0.25 }}
        >
          <div className="w-10 h-10 rounded-full border-2 border-amber-400/40" />
        </motion.div>
      </motion.div>
    ))}
  </div>
);

// ─── Hint lightbulb with glow ──────────────────────────────────────
const HintIllustration: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="relative flex items-center justify-center">
    {/* Glow rings */}
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: 80 + i * 40,
          height: 80 + i * 40,
          border: `2px solid`,
          borderColor: isDark ? `rgba(251,191,36,${0.15 - i * 0.04})` : `rgba(245,158,11,${0.15 - i * 0.04})`,
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
      />
    ))}
    <motion.div
      className={cn(
        'w-20 h-20 rounded-2xl flex items-center justify-center relative z-10',
        isDark ? 'bg-amber-500/20' : 'bg-amber-100'
      )}
      style={{
        boxShadow: isDark
          ? '0 0 30px rgba(251,191,36,0.25), 0 0 60px rgba(251,191,36,0.1)'
          : '0 0 30px rgba(245,158,11,0.2), 0 0 60px rgba(245,158,11,0.08)',
      }}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <span className="text-4xl">💡</span>
    </motion.div>
    {/* floating sparks */}
    {[0, 1, 2, 3].map(i => (
      <motion.div
        key={`spark-${i}`}
        className="absolute text-sm"
        style={{
          left: `${25 + i * 18}%`,
          top: `${10 + (i % 2) * 60}%`,
        }}
        animate={{ y: [0, -12, 0], opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
      >
        ✨
      </motion.div>
    ))}
  </div>
);

// ─── Step data ─────────────────────────────────────────────────────
type StepData = {
  title: string;
  subtitle: string;
  accentFrom: string;
  accentTo: string;
  glowColor: string;
  illustration: (isDark: boolean) => React.ReactNode;
  tips: string[];
};

const STEP_DATA: StepData[] = [
  {
    title: 'Добро пожаловать!',
    subtitle: 'Находи слова на бурятском языке. Это просто — смотри!',
    accentFrom: '#8b5cf6',
    accentTo: '#6d28d9',
    glowColor: 'rgba(139,92,246,0.35)',
    illustration: () => (
      <div className="relative flex items-center justify-center">
        <motion.div
          className="text-8xl"
          animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 0.5 }}
          style={{ filter: 'drop-shadow(0 8px 24px rgba(139,92,246,0.3))' }}
        >
          🎯
        </motion.div>
        {/* Orbiting sparkles */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute text-2xl"
            animate={{
              rotate: [i * 120, i * 120 + 360],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '50% 50%' }}
          >
            <motion.span
              style={{
                display: 'block',
                transform: `translateY(-52px) rotate(-${i * 120}deg)`,
              }}
              animate={{ scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            >
              ✨
            </motion.span>
          </motion.div>
        ))}
      </div>
    ),
    tips: [
      'Находи спрятанные слова на бурятском языке',
      'Запоминай переводы — так ты выучишь язык!',
    ],
  },
  {
    title: 'Веди пальцем',
    subtitle: 'Нажми на букву и веди по соседним, не отрывая палец',
    accentFrom: '#3b82f6',
    accentTo: '#06b6d4',
    glowColor: 'rgba(59,130,246,0.35)',
    illustration: (isDark: boolean) => (
      <AnimatedGrid
        letters={[
          ['С', 'А', 'Й', 'Н'],
          ['М', 'И', 'Н', 'Э'],
          ['Э', 'Н', 'Д', 'У'],
        ]}
        path={[[0, 0], [0, 1], [0, 2], [0, 3]]}
        isDark={isDark}
        accentFrom="#3b82f6"
        accentTo="#06b6d4"
      />
    ),
    tips: [
      'Двигайся ↑ ↓ ← → (не по диагонали!)',
      'Не отрывай палец, пока ведёшь по буквам',
    ],
  },
  {
    title: 'Слово найдено!',
    subtitle: 'Отпусти палец — если правильно, слово засчитается',
    accentFrom: '#10b981',
    accentTo: '#14b8a6',
    glowColor: 'rgba(16,185,129,0.35)',
    illustration: (isDark: boolean) => (
      <div className="relative flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className={cn(
            'w-24 h-24 rounded-3xl flex items-center justify-center',
            isDark ? 'bg-emerald-500/15' : 'bg-emerald-50',
          )}
          style={{
            boxShadow: isDark
              ? '0 0 40px rgba(16,185,129,0.2), 0 0 80px rgba(16,185,129,0.08)'
              : '0 0 40px rgba(16,185,129,0.15)',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <CheckCircle2 size={56} className={isDark ? 'text-emerald-400' : 'text-emerald-500'} />
          </motion.div>
        </motion.div>
        {/* Confetti burst */}
        {['🎉', '🎊', '✨', '💚'].map((emoji, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl"
            initial={{ scale: 0 }}
            animate={{
              scale: [0, 1.2, 0],
              x: [0, (i % 2 === 0 ? 1 : -1) * (30 + i * 10)],
              y: [0, -(20 + i * 15)],
            }}
            transition={{ duration: 1.2, delay: 0.5 + i * 0.15, repeat: Infinity, repeatDelay: 2 }}
          >
            {emoji}
          </motion.div>
        ))}
      </div>
    ),
    tips: [
      'Найденное слово подсветится на поле',
      'Ошибся? Не страшно — попробуй ещё раз!',
    ],
  },
  {
    title: 'Список слов',
    subtitle: 'Видно, что искать и что уже нашёл',
    accentFrom: '#f97316',
    accentTo: '#f59e0b',
    glowColor: 'rgba(249,115,22,0.35)',
    illustration: (isDark: boolean) => <AnimatedWordList isDark={isDark} />,
    tips: [
      'Слова показаны вместе с переводом',
      'Нашёл все — уровень пройден!',
    ],
  },
  {
    title: 'Собирай звёзды',
    subtitle: 'Чем быстрее и точнее — тем больше!',
    accentFrom: '#f59e0b',
    accentTo: '#eab308',
    glowColor: 'rgba(245,158,11,0.4)',
    illustration: () => <StarsBurst />,
    tips: [
      'Чем быстрее — тем больше звёзд',
      'Меньше ошибок — лучше результат',
    ],
  },
  {
    title: 'Подсказки',
    subtitle: 'Если сложно — включи в настройках',
    accentFrom: '#ec4899',
    accentTo: '#f43f5e',
    glowColor: 'rgba(236,72,153,0.35)',
    illustration: (isDark: boolean) => <HintIllustration isDark={isDark} />,
    tips: [
      'Подсветятся первые буквы слов',
      'Меню → Настройки → Подсказки',
    ],
  },
];

// ─── Quest-style progress nodes ────────────────────────────────────
const QuestProgress: React.FC<{
  current: number;
  total: number;
  isDark: boolean;
  accentFrom: string;
  accentTo: string;
  glowColor: string;
}> = ({ current, total, isDark, accentFrom, accentTo, glowColor }) => (
  <div className="relative flex items-center justify-center gap-0 px-2">
    {Array.from({ length: total }).map((_, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <React.Fragment key={i}>
          {/* Connector line */}
          {i > 0 && (
            <div className="relative h-[3px] flex-1 mx-0.5">
              <div className={cn(
                'absolute inset-0 rounded-full',
                isDark ? 'bg-white/8' : 'bg-black/8'
              )} />
              {done && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${accentFrom}, ${accentTo})` }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </div>
          )}
          {/* Node */}
          <motion.div
            animate={active ? { scale: [1, 1.15, 1] } : {}}
            transition={active ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
            className={cn(
              'relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300',
              done
                ? 'text-white'
                : active
                  ? 'text-white'
                  : isDark
                    ? 'bg-stone-800 text-stone-500 border-2 border-stone-700'
                    : 'bg-stone-100 text-stone-400 border-2 border-stone-300'
            )}
            style={(done || active) ? {
              background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`,
              boxShadow: active
                ? `0 0 16px ${glowColor}, 0 0 32px ${glowColor}`
                : `0 0 8px ${glowColor}`,
            } : {}}
          >
            {done ? <Check size={13} strokeWidth={3} /> : i + 1}
          </motion.div>
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Check icon (inline, avoids extra import) ──────────────────────
const Check: React.FC<{ size: number; strokeWidth?: number }> = ({ size, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Main component ────────────────────────────────────────────────
export const HowToPlayScreen: React.FC<HowToPlayScreenProps> = ({ store }) => {
  const { navigate, goBack, updateSettings, state } = store;
  const { themeId, isDark } = useTheme();
  const styles = getMenuStyles(themeId);

  const [stepIndex, setStepIndex] = useState(0);
  const step = STEP_DATA[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEP_DATA.length - 1;

  const markSeen = useCallback(() => {
    if (state.settings.hasSeenHowTo) return;
    updateSettings({ hasSeenHowTo: true });
  }, [state.settings.hasSeenHowTo, updateSettings]);

  const closeToMenu = useCallback(() => {
    markSeen();
    goBack();
  }, [markSeen, goBack]);

  const goPrev = useCallback(() => {
    setStepIndex(s => Math.max(0, s - 1));
  }, []);

  const goNext = useCallback(() => {
    setStepIndex(s => Math.min(STEP_DATA.length - 1, s + 1));
  }, []);

  const handleFinish = useCallback(() => {
    markSeen();
    navigate('gameMode');
  }, [markSeen, navigate]);
  // handleFinish — прямой переход к игре, не goBack

  useBackButton(() => {
    if (!isFirst) { goPrev(); return; }
    closeToMenu();
  });

  return (
    <div className={cn('min-h-[100dvh] flex flex-col relative overflow-hidden', styles.pageGradient)}>
      {/* Particles */}
      <FloatingParticles color={step.glowColor} />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${step.glowColor}, transparent)` }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${step.glowColor}, transparent)` }}
          animate={{ scale: [1.15, 1, 1.15], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(to right, ${styles.gridPattern} 1px, transparent 1px),
              linear-gradient(to bottom, ${styles.gridPattern} 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* ─── Header ─── */}
      <header className="relative z-10 px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={closeToMenu}
            className={cn(
              'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              isDark ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            ← Меню
          </button>
          <button
            onClick={handleFinish}
            className={cn(
              'px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all',
              isDark
                ? 'bg-white/8 hover:bg-white/15 text-stone-300'
                : 'bg-black/5 hover:bg-black/10 text-stone-600'
            )}
          >
            Пропустить
          </button>
        </div>
      </header>

      {/* ─── Quest progress ─── */}
      <div className="relative z-10 px-6 py-3">
        <QuestProgress
          current={stepIndex}
          total={STEP_DATA.length}
          isDark={isDark}
          accentFrom={step.accentFrom}
          accentTo={step.accentTo}
          glowColor={step.glowColor}
        />
      </div>

      {/* ─── Content ─── */}
      <main className="flex-1 px-4 pb-5 relative z-10 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="flex-1 flex flex-col"
          >
            {/* Card */}
            <div className={cn(
              'flex-1 rounded-3xl border overflow-hidden flex flex-col',
              isDark
                ? 'bg-gradient-to-b from-stone-800/80 to-stone-900/80 border-stone-700/40 backdrop-blur-sm'
                : 'bg-gradient-to-b from-white/90 to-stone-50/90 border-stone-200/60 backdrop-blur-sm shadow-xl shadow-stone-200/30'
            )}>
              {/* Title section */}
              <div className="relative px-5 pt-5 pb-2 text-center">
                {/* Gradient accent line at top */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: `linear-gradient(90deg, ${step.accentFrom}, ${step.accentTo})` }}
                />

                <motion.h2
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className={cn('text-2xl font-extrabold tracking-tight', styles.statsCard.text.primary)}
                >
                  {step.title}
                </motion.h2>
                <motion.p
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.18 }}
                  className={cn(
                    'text-[15px] mt-1.5 leading-relaxed',
                    isDark ? 'text-stone-300' : 'text-stone-600'
                  )}
                >
                  {step.subtitle}
                </motion.p>
              </div>

              {/* Illustration */}
              <div className="flex-1 flex items-center justify-center px-5 py-4">
                {step.illustration(isDark)}
              </div>

              {/* Tips */}
              <div className={cn(
                'px-5 pb-5 pt-3 space-y-2.5 border-t',
                isDark ? 'border-white/5' : 'border-black/5'
              )}>
                {step.tips.map((tip, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + idx * 0.1 }}
                    className="flex items-start gap-2.5"
                  >
                    <div
                      className="mt-[7px] w-2 h-2 rounded-full shrink-0"
                      style={{ background: `linear-gradient(135deg, ${step.accentFrom}, ${step.accentTo})` }}
                    />
                    <p className={cn(
                      'text-[15px] leading-snug',
                      isDark ? 'text-stone-200' : 'text-stone-700'
                    )}>
                      {tip}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ─── Navigation ─── */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {/* Back / Menu */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={!isFirst ? goPrev : closeToMenu}
            className={cn(
              'p-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all',
              isDark
                ? 'bg-stone-800/60 border-stone-700/50 text-stone-300 active:bg-stone-700'
                : 'bg-white/80 border-stone-200 text-stone-600 active:bg-stone-100'
            )}
          >
            <ChevronLeft size={18} />
            {!isFirst ? 'Назад' : 'Меню'}
          </motion.button>

          {/* Next / Play */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={!isLast ? goNext : handleFinish}
            className="p-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-white relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${step.accentFrom}, ${step.accentTo})`,
              boxShadow: `0 4px 20px ${step.glowColor}, 0 0 40px ${step.glowColor}`,
            }}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2.5 }}
            />
            <span className="relative flex items-center gap-2">
              {!isLast ? (
                <>Дальше <ChevronRight size={18} /></>
              ) : (
                <><Play size={18} /> Играть!</>
              )}
            </span>
          </motion.button>
        </div>

        {/* Step counter */}
        <div className={cn('text-center mt-2.5 text-xs font-medium', styles.buttons.text.muted)}>
          {stepIndex + 1} из {STEP_DATA.length}
        </div>
      </main>
    </div>
  );
};

export default HowToPlayScreen;

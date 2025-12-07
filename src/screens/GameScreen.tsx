// src/screens/GameScreen.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Trophy, 
  Clock, 
  Share2, 
  RotateCcw,
  Zap,
  ChevronRight,
  Sparkles,
  Lock,
  Info,
  Eye
} from 'lucide-react';
import { cn, StarsDisplay } from '../components/ui';
import type { GameStore } from '../store/gameStore';
import { getCategoryById, categories } from '../data/words';
import { generateSnakeLevel, findWordByPath, type PlacedWord } from '../gameEngine';
import type { Coord, CellStatus } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { getGameStyles, type GameThemeStyles } from '../theme/gameStyles';

interface GameScreenProps {
  store: GameStore;
}

// Информация о найденной клетке (для красивого отображения слов)
type FoundCellInfo = {
  wordIndex: number;
  neighbors: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };
};

// Палитра цветов для слов (адаптивная к теме)
const getWordColors = (isDark: boolean) => isDark ? [
  { bg: '#ef4444', text: '#fff' }, // red
  { bg: '#f97316', text: '#fff' }, // orange
  { bg: '#eab308', text: '#1a1a1a' }, // yellow
  { bg: '#22c55e', text: '#fff' }, // green
  { bg: '#14b8a6', text: '#fff' }, // teal
  { bg: '#0ea5e9', text: '#fff' }, // sky
  { bg: '#3b82f6', text: '#fff' }, // blue
  { bg: '#8b5cf6', text: '#fff' }, // violet
  { bg: '#d946ef', text: '#fff' }, // fuchsia
  { bg: '#ec4899', text: '#fff' }, // pink
  { bg: '#06b6d4', text: '#fff' }, // cyan
  { bg: '#84cc16', text: '#1a1a1a' }, // lime
] : [
  { bg: '#dc2626', text: '#fff' }, // red
  { bg: '#ea580c', text: '#fff' }, // orange
  { bg: '#ca8a04', text: '#fff' }, // yellow (darker for light theme)
  { bg: '#16a34a', text: '#fff' }, // green
  { bg: '#0d9488', text: '#fff' }, // teal
  { bg: '#0284c7', text: '#fff' }, // sky
  { bg: '#2563eb', text: '#fff' }, // blue
  { bg: '#7c3aed', text: '#fff' }, // violet
  { bg: '#c026d3', text: '#fff' }, // fuchsia
  { bg: '#db2777', text: '#fff' }, // pink
  { bg: '#0891b2', text: '#fff' }, // cyan
  { bg: '#65a30d', text: '#fff' }, // lime
];

// Компонент слова с flip-эффектом
const FlippableWordChip = React.memo(({ 
  word, 
  isFound, 
  color, 
  styles,
  isDark,
  index
}: { 
  word: { bur: string; ru: string };
  isFound: boolean;
  color: { bg: string; text: string };
  styles: GameThemeStyles;
  isDark: boolean;
  index: number;
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasBeenClicked, setHasBeenClicked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleClick = () => {
    if (isFound || isFlipped) return;
    
    setIsFlipped(true);
    setHasBeenClicked(true);
    
    // Автоматически возвращаем через 1.5 секунды
    timeoutRef.current = setTimeout(() => {
      setIsFlipped(false);
    }, 1500);
  };
  
  // Очистка таймера при размонтировании или когда слово найдено
  useEffect(() => {
    if (isFound && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isFound]);

  // Показываем анимацию-подсказку только для первого незнайденного слова
  const showHintAnimation = !isFound && !hasBeenClicked && index === 0;
  
  return (
    <div 
      className={cn(
        "relative cursor-pointer group",
        !isFound && "hover:-translate-y-0.5 transition-transform duration-200"
      )}
      style={{ perspective: '600px' }}
      onClick={handleClick}
    >
      <div
        className={cn(
          "relative transition-transform duration-500 ease-out",
          !isFound && "active:scale-95"
        )}
        style={{
          transformStyle: 'preserve-3d',
          // Сбрасываем флип если слово уже найдено
          transform: (isFlipped && !isFound) ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Лицевая сторона - русское слово */}
        <div
          className={cn(
            "px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2",
            "transition-all duration-200",
            !isFound && `${styles.wordChip.idle.background} ${styles.wordChip.idle.text}`,
            !isFound && "group-hover:shadow-md group-hover:ring-2 group-hover:ring-amber-400/30",
            isFound && "scale-95",
            showHintAnimation && "animate-[gentle-bounce_2s_ease-in-out_infinite]"
          )}
          style={{
            ...(isFound ? { backgroundColor: color.bg, color: color.text } : undefined),
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <span className={isFound ? 'line-through opacity-70' : ''}>
            {word.ru}
          </span>
          {/* Иконка глаза для незнайденных слов */}
          {!isFound && (
            <Eye 
              size={14} 
              className={cn(
                "opacity-40 group-hover:opacity-70 transition-opacity",
                showHintAnimation && "animate-pulse"
              )} 
            />
          )}
          {isFound && (
            <span className="text-xs opacity-70 animate-[pop_0.2s_ease-out]">
              ({word.bur})
            </span>
          )}
        </div>
        
        {/* Обратная сторона - бурятское слово */}
        {!isFound && (
          <div
            className={cn(
              "absolute inset-0 px-3 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5",
              "bg-gradient-to-br",
              isDark 
                ? "from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30" 
                : "from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-400/40"
            )}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <span className="drop-shadow-sm text-base">{word.bur}</span>
            <span className="text-[10px] opacity-80">🇲🇳</span>
          </div>
        )}
      </div>
    </div>
  );
});

// Компонент клетки - оптимизированный с CSS анимациями
const LetterCell = React.memo(({ 
  char, 
  status, 
  r, c, 
  wordColor,
  isHint,
  neighbors,
  styles,
  onPointerDown 
}: { 
  char: string; 
  status: CellStatus; 
  r: number; 
  c: number;
  wordColor?: { bg: string; text: string };
  isHint?: boolean;
  neighbors?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
  styles: GameThemeStyles;
  onPointerDown: (e: React.PointerEvent) => void; 
}) => {
  const isFound = status === 'found';
  const isSelected = status === 'selected';
  const isIdle = status === 'idle';

  // Вычисляем border-radius для найденных клеток (скругляем только внешние углы)
  const getBorderRadius = () => {
    if (!isFound || !neighbors) return undefined;
    const radius = '12px';
    const noRadius = '2px';
    
    // top-left, top-right, bottom-right, bottom-left
    const tl = (!neighbors.top && !neighbors.left) ? radius : noRadius;
    const tr = (!neighbors.top && !neighbors.right) ? radius : noRadius;
    const br = (!neighbors.bottom && !neighbors.right) ? radius : noRadius;
    const bl = (!neighbors.bottom && !neighbors.left) ? radius : noRadius;
    
    return `${tl} ${tr} ${br} ${bl}`;
  };

  // Вычисляем границы (только по внешнему краю слова)
  const getBorder = () => {
    if (!isFound || !neighbors) return undefined;
    const borderColor = styles.cell.found.borderColor;
    const borderWidth = '2px';
    
    return {
      borderTop: neighbors.top ? 'none' : `${borderWidth} solid ${borderColor}`,
      borderBottom: neighbors.bottom ? 'none' : `${borderWidth} solid ${borderColor}`,
      borderLeft: neighbors.left ? 'none' : `${borderWidth} solid ${borderColor}`,
      borderRight: neighbors.right ? 'none' : `${borderWidth} solid ${borderColor}`,
    };
  };

  return (
    <div
      className={cn(
        "select-none touch-none aspect-square flex items-center justify-center",
        "text-xl sm:text-2xl font-bold cursor-pointer relative",
        "transition-all duration-100 ease-out",
        "will-change-transform",
        isSelected && `${styles.cell.selected.background} ${styles.cell.selected.text} ${styles.cell.selected.shadow} ${styles.cell.selected.ring} rounded-xl scale-105 z-10`,
        isIdle && `${styles.cell.idle.background} ${styles.cell.idle.text} ${styles.cell.idle.shadow} ${styles.cell.idle.backgroundHover} active:scale-95 rounded-xl`,
        isHint && isIdle && `ring-2 ${styles.cell.hint.ring} ring-offset-1 ${styles.cell.hint.ringOffset}`,
        isFound && "shadow-md"
      )}
      style={{
        ...(isFound && wordColor 
          ? { backgroundColor: wordColor.bg, color: wordColor.text }
          : undefined),
        ...(isFound && { borderRadius: getBorderRadius() }),
        ...(isFound && getBorder()),
      }}
      data-r={r} 
      data-c={c}
      onDragStart={(e) => e.preventDefault()} 
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={onPointerDown}
    >
      {char}
      {isHint && isIdle && (
        <div className={cn("absolute -top-1 -left-1 w-3 h-3 rounded-full shadow-sm animate-[pulse_2s_ease-in-out_infinite]", styles.cell.hint.dot)} />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.char === nextProps.char &&
         prevProps.status === nextProps.status &&
         prevProps.r === nextProps.r &&
         prevProps.c === nextProps.c &&
         prevProps.wordColor?.bg === nextProps.wordColor?.bg &&
         prevProps.isHint === nextProps.isHint &&
         prevProps.neighbors?.top === nextProps.neighbors?.top &&
         prevProps.neighbors?.bottom === nextProps.neighbors?.bottom &&
         prevProps.neighbors?.left === nextProps.neighbors?.left &&
         prevProps.neighbors?.right === nextProps.neighbors?.right &&
         prevProps.styles === nextProps.styles;
});


export const GameScreen: React.FC<GameScreenProps> = ({ store }) => {
  const { state, navigate, completeLevel, addToLeaderboard } = store;
  const category = getCategoryById(state.selectedCategory || '');
  
  // Получаем тему
  const { themeId, isDark } = useTheme();
  const styles = useMemo(() => getGameStyles(themeId), [themeId]);
  const wordColors = useMemo(() => getWordColors(isDark), [isDark]);
  
  const [gridLetters, setGridLetters] = useState<string[][]>([]);
  const [gridSize, setGridSize] = useState(5);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [foundWordIds, setFoundWordIds] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<Coord[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [foundCellsRegistry, setFoundCellsRegistry] = useState<Map<string, FoundCellInfo>>(new Map());
  
  const [showWinModal, setShowWinModal] = useState(false);
  const [time, setTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFoundTimeRef = useRef<number>(0);
  const lastFailedAttemptRef = useRef<string | null>(null); // Для отслеживания повторных неудачных попыток
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRectsRef = useRef<Map<string, DOMRect>>(new Map());

  // Инициализация игры
  const initGame = useCallback(() => {
    if (!category) return;
    
    const result = generateSnakeLevel(category.gridSize, category.words);
    setGridLetters(result.grid);
    setGridSize(result.size);
    setPlacedWords(result.placedWords);
    setFoundWordIds(new Set());
    setFoundCellsRegistry(new Map());
    setShowWinModal(false);
    setSelectedPath([]);
    setTime(0);
    setScore(0);
    setCombo(0);
    lastFoundTimeRef.current = Date.now();
    lastFailedAttemptRef.current = null;
  }, [category]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: initialize game when category changes
  useEffect(() => { initGame(); }, [initGame]);
  
  // Очистка таймера toast при размонтировании
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);
  
  // Показать toast-уведомление
  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Таймер
  useEffect(() => {
    if (state.settings.timerEnabled && !showWinModal) {
      timerRef.current = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.settings.timerEnabled, showWinModal]);

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Обработчики указателя
  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    e.preventDefault();
    if (e.button !== 0) return;
    if (foundCellsRegistry.has(`${r}-${c}`)) return;

    // Кешируем позиции клеток при начале выделения
    updateCellRects();
    
    setIsSelecting(true);
    setSelectedPath([{ r, c }]);
  };

  const triggerWin = useCallback((finalFoundWords: Set<string>) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Используем цвета темы для конфетти
    const confettiColors = isDark 
      ? ['#FACC15', '#F97316', '#10B981', '#0EA5E9']
      : ['#F59E0B', '#EA580C', '#059669', '#0284C7'];
    
    confetti({ 
      particleCount: 150, 
      spread: 70, 
      origin: { y: 0.6 }, 
      colors: confettiColors
    });
    
    if (category) {
      const foundWordsArray = placedWords
        .filter(pw => finalFoundWords.has(pw.word.bur))
        .map(pw => pw.word.bur);
        
      completeLevel(
        category.id,
        foundWordsArray,
        time,
        placedWords.length
      );
      
      addToLeaderboard({
        playerName: state.settings.playerName,
        score,
        categoryId: category.id,
        time,
      });
    }
    
    setTimeout(() => setShowWinModal(true), 500);
  }, [category, placedWords, time, score, completeLevel, addToLeaderboard, state.settings.playerName, isDark]);

  const handlePointerUp = useCallback(() => {
    setIsSelecting(false);
    if (selectedPath.length === 0) return;

    const matchedWord = findWordByPath(placedWords, selectedPath);
    const wordId = matchedWord ? matchedWord.word.bur : null;

    // Если путь не совпал точно, проверяем, не составил ли пользователь правильное слово другими буквами
    if (!matchedWord && selectedPath.length > 0) {
      // Получаем строку из выбранных букв
      const selectedLetters = selectedPath.map(p => gridLetters[p.r][p.c]).join('').toUpperCase();
      
      // Ищем слово с такими же буквами среди незнайденных слов
      const matchingWordByLetters = placedWords.find(pw => 
        !foundWordIds.has(pw.word.bur) && 
        pw.word.bur.toUpperCase() === selectedLetters
      );
      
      if (matchingWordByLetters) {
        // Пользователь правильно составил слово, но использовал не те клетки
        showToast(`Слово "${matchingWordByLetters.word.bur}" верное! Но найдите его в другом месте на поле 🔍`);
        lastFailedAttemptRef.current = null; // Сбрасываем, т.к. слово в целом правильное
      } else if (selectedLetters.length >= 2) {
        // Слово не найдено вообще — проверяем повторную попытку
        if (lastFailedAttemptRef.current === selectedLetters) {
          // Пользователь ввёл то же самое дважды — сообщаем, что такого слова нет
          showToast(`Слова "${selectedLetters.toLowerCase()}" нет в этом уровне ❌`);
          lastFailedAttemptRef.current = null; // Сбрасываем после уведомления
        } else {
          // Запоминаем неудачную попытку
          lastFailedAttemptRef.current = selectedLetters;
        }
      }
    }

    if (matchedWord && wordId && !foundWordIds.has(wordId)) {
      // Успешно нашли слово — сбрасываем счётчик неудачных попыток
      lastFailedAttemptRef.current = null;
      const now = Date.now();
      const timeSinceLast = now - lastFoundTimeRef.current;
      lastFoundTimeRef.current = now;
      
      const newCombo = timeSinceLast < 5000 ? combo + 1 : 1;
      setCombo(newCombo);
      
      const basePoints = matchedWord.word.bur.length * 10;
      const comboBonus = newCombo > 1 ? basePoints * (newCombo - 1) * 0.5 : 0;
      const wordScore = Math.round(basePoints + comboBonus);
      setScore(s => s + wordScore);
      
      const newFoundWordIds = new Set(foundWordIds);
      newFoundWordIds.add(wordId);
      setFoundWordIds(newFoundWordIds);
      
      // Сохраняем индекс слова и информацию о соседях для каждой клетки
      const wordIndex = placedWords.findIndex(pw => pw.word.bur === wordId);
      const pathSet = new Set(matchedWord.path.map(p => `${p.r}-${p.c}`));
      
      setFoundCellsRegistry(prev => {
        const newMap = new Map(prev);
        matchedWord.path.forEach(p => {
          // Определяем соседей в том же слове
          const neighbors = {
            top: pathSet.has(`${p.r - 1}-${p.c}`),
            bottom: pathSet.has(`${p.r + 1}-${p.c}`),
            left: pathSet.has(`${p.r}-${p.c - 1}`),
            right: pathSet.has(`${p.r}-${p.c + 1}`),
          };
          newMap.set(`${p.r}-${p.c}`, { wordIndex, neighbors });
        });
        return newMap;
      });
      
      if (state.settings.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      if (newFoundWordIds.size === placedWords.length) {
        triggerWin(newFoundWordIds);
      }
    }

    setSelectedPath([]);
  }, [selectedPath, placedWords, foundWordIds, combo, state.settings.vibrationEnabled, triggerWin, gridLetters, showToast]);

  // Кеширование позиций клеток при начале выделения
  const updateCellRects = useCallback(() => {
    if (!gridRef.current) return;
    const cells = gridRef.current.querySelectorAll('[data-r][data-c]');
    const newRects = new Map<string, DOMRect>();
    cells.forEach(cell => {
      const r = cell.getAttribute('data-r');
      const c = cell.getAttribute('data-c');
      if (r && c) {
        newRects.set(`${r}-${c}`, cell.getBoundingClientRect());
      }
    });
    cellRectsRef.current = newRects;
  }, []);

  // Найти клетку по координатам курсора (включая "умное" определение)
  const findCellAtPoint = useCallback((clientX: number, clientY: number, lastCell: Coord | null): Coord | null => {
    // Сначала проверяем, находится ли курсор прямо над какой-то клеткой
    for (const [key, rect] of cellRectsRef.current.entries()) {
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        const [r, c] = key.split('-').map(Number);
        return { r, c };
      }
    }

    // Если курсор за пределами клеток, определяем направление от последней клетки
    if (lastCell) {
      const lastRect = cellRectsRef.current.get(`${lastCell.r}-${lastCell.c}`);
      if (!lastRect) return null;

      // Центр последней клетки
      const centerX = lastRect.left + lastRect.width / 2;
      const centerY = lastRect.top + lastRect.height / 2;

      // Вектор от центра последней клетки к курсору
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      // Минимальное расстояние для активации (половина размера клетки)
      const threshold = lastRect.width * 0.3;
      
      // Определяем преобладающее направление
      let targetR = lastCell.r;
      let targetC = lastCell.c;

      // Если горизонтальное смещение больше вертикального
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > threshold) {
          targetC = lastCell.c + 1;
        } else if (dx < -threshold) {
          targetC = lastCell.c - 1;
        }
      } else {
        if (dy > threshold) {
          targetR = lastCell.r + 1;
        } else if (dy < -threshold) {
          targetR = lastCell.r - 1;
        }
      }

      // Проверяем, что целевая клетка существует
      if (cellRectsRef.current.has(`${targetR}-${targetC}`)) {
        return { r: targetR, c: targetC };
      }

      // Если диагональное движение - пробуем вторичное направление
      if (Math.abs(dx) > threshold && Math.abs(dy) > threshold) {
        // Пробуем горизонтальное
        const altC = dx > 0 ? lastCell.c + 1 : lastCell.c - 1;
        if (cellRectsRef.current.has(`${lastCell.r}-${altC}`)) {
          return { r: lastCell.r, c: altC };
        }
        // Пробуем вертикальное
        const altR = dy > 0 ? lastCell.r + 1 : lastCell.r - 1;
        if (cellRectsRef.current.has(`${altR}-${lastCell.c}`)) {
          return { r: altR, c: lastCell.c };
        }
      }
    }

    return null;
  }, []);

  // Глобальные события движения
  useEffect(() => {
    const handleMove = (e: Event) => {
      if (!isSelecting) return;

      let clientX, clientY;
      if ((e as TouchEvent).touches?.length > 0) {
        clientX = (e as TouchEvent).touches[0].clientX;
        clientY = (e as TouchEvent).touches[0].clientY;
      } else if ((e as PointerEvent).clientX !== undefined) {
        clientX = (e as PointerEvent).clientX;
        clientY = (e as PointerEvent).clientY;
      } else return;

      setSelectedPath(prevPath => {
        if (prevPath.length === 0) return prevPath;
        
        const last = prevPath[prevPath.length - 1];
        const foundCell = findCellAtPoint(clientX, clientY, last);
        
        if (!foundCell) return prevPath;
        
        const { r, c } = foundCell;
        
        // Проверяем возврат назад
        if (prevPath.length > 1) {
          const preLast = prevPath[prevPath.length - 2];
          if (preLast.r === r && preLast.c === c) {
            return prevPath.slice(0, -1);
          }
        }

        // Если та же клетка - ничего не делаем
        if (last.r === r && last.c === c) return prevPath;
        
        // Проверяем соседство
        const isNeighbor = Math.abs(last.r - r) + Math.abs(last.c - c) === 1;
        
        const isAlreadySelected = prevPath.some(p => p.r === r && p.c === c);
        const isFound = foundCellsRegistry.has(`${r}-${c}`);
        
        if (isNeighbor && !isAlreadySelected && !isFound) {
          return [...prevPath, { r, c }];
        }

        return prevPath;
      });
    };

    const handleEnd = () => { if (isSelecting) handlePointerUp(); };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isSelecting, foundCellsRegistry, handlePointerUp, findCellAtPoint]);

  const getCellStatus = (r: number, c: number): CellStatus => {
    if (selectedPath.some(p => p.r === r && p.c === c)) return 'selected';
    if (foundCellsRegistry.has(`${r}-${c}`)) return 'found';
    return 'idle';
  };

  const getCellWordColor = (r: number, c: number): { bg: string; text: string } | undefined => {
    const cellInfo = foundCellsRegistry.get(`${r}-${c}`);
    if (cellInfo !== undefined) {
      return wordColors[cellInfo.wordIndex % wordColors.length];
    }
    return undefined;
  };

  const getCellNeighbors = (r: number, c: number) => {
    const cellInfo = foundCellsRegistry.get(`${r}-${c}`);
    return cellInfo?.neighbors;
  };

  // Вычисляем клетки-подсказки (первые буквы незнайденных слов)
  const hintCells = useMemo(() => {
    if (!state.settings.showHints) return new Set<string>();
    
    const hints = new Set<string>();
    placedWords.forEach(pw => {
      if (!foundWordIds.has(pw.word.bur) && pw.path.length > 0) {
        const firstCell = pw.path[0];
        hints.add(`${firstCell.r}-${firstCell.c}`);
      }
    });
    return hints;
  }, [state.settings.showHints, placedWords, foundWordIds]);

  const shareResult = async () => {
    const stars = foundWordIds.size === placedWords.length ? 3 : 
                  foundWordIds.size >= placedWords.length * 0.7 ? 2 : 1;
    
    const text = `🎮 Бурятский Филлворд
📚 ${category?.name} ${category?.emoji}
⭐ ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}
🎯 ${foundWordIds.size}/${placedWords.length} слов
⏱️ ${formatTime(time)}
🏆 ${score} очков

Учи бурятский язык играя! 🇲🇳`;

    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        alert('Результат скопирован в буфер обмена!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const calculateStars = (): number => {
    const completion = foundWordIds.size / placedWords.length;
    if (completion >= 1) return 3;
    if (completion >= 0.7) return 2;
    if (completion >= 0.5) return 1;
    return 0;
  };

  if (!category) {
    return (
      <div className={cn("min-h-[100dvh] flex items-center justify-center", styles.page.background)}>
        <p className={styles.categoryTitle.text}>Категория не найдена</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-[100dvh] font-sans flex flex-col max-w-md mx-auto relative overflow-hidden select-none",
      styles.page.gradient
    )}>
      
      {/* Header */}
      <header className={cn("p-4 z-20", styles.header.background, styles.header.border)}>
        <div className="flex justify-between items-center mb-3">
          <button 
            onClick={() => navigate('levels')}
            className={cn(
              "p-2 rounded-xl transition-all duration-200",
              styles.headerButton.background,
              styles.headerButton.backgroundHover,
              styles.headerButton.text
            )}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category.emoji}</span>
            <h1 className={cn("text-lg font-bold", styles.categoryTitle.text)}>{category.name}</h1>
          </div>
          
          <button 
            onClick={initGame}
            className={cn(
              "p-2 rounded-xl active:rotate-180 transition-all duration-300",
              styles.headerButton.background,
              styles.headerButton.backgroundHover,
              styles.headerButton.text
            )}
          >
            <RotateCcw size={20} />
          </button>
        </div>
        
        {/* Stats bar */}
        <div className="flex items-center justify-between gap-3">
          <div className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2",
            styles.statsBadge.background
          )}>
            <Clock size={16} className={styles.statsBadge.iconColor} />
            <span className={cn("font-mono font-bold", styles.statsBadge.valueColor)}>{formatTime(time)}</span>
          </div>
          
          {combo > 1 && (
            <div className={cn(
              "flex items-center gap-1 rounded-xl px-3 py-2 animate-[pop_0.2s_ease-out]",
              styles.comboBadge.background,
              styles.comboBadge.text
            )}>
              <Zap size={16} className={styles.comboBadge.icon} />
              <span className="font-bold">x{combo}</span>
            </div>
          )}
          
          <div className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2",
            styles.trophyBadge.background
          )}>
            <Trophy size={16} className={styles.trophyBadge.iconColor} />
            <span className={cn("font-bold", styles.trophyBadge.text)}>{score}</span>
          </div>
        </div>
        
        {/* Progress */}
        <div className="mt-3 flex items-center gap-3">
          <div className={cn("flex-1 h-3 rounded-full overflow-hidden", styles.progress.track)}>
            <div 
              className={cn("h-full transition-[width] duration-300 ease-out", styles.progress.fill)}
              style={{ width: placedWords.length > 0 ? `${(foundWordIds.size / placedWords.length) * 100}%` : '0%' }}
            />
          </div>
          <span className={cn("text-sm font-bold", styles.progress.text)}>{foundWordIds.size}/{placedWords.length}</span>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center touch-none">
        <div 
          className="relative"
          style={{ 
            maxWidth: `${Math.min(gridSize * 56, 380)}px`,
            width: '100%'
          }}
        >
          <div 
            ref={gridRef}
            className={cn("grid p-3 rounded-2xl touch-none", styles.grid.background, styles.grid.gap)}
            style={{ 
              touchAction: 'none',
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            }}
          >
            {gridLetters.map((row, r) => (
              row.map((char, c) => (
                <LetterCell
                  key={`${r}-${c}`}
                  char={char}
                  r={r} c={c}
                  status={getCellStatus(r, c)}
                  wordColor={getCellWordColor(r, c)}
                  neighbors={getCellNeighbors(r, c)}
                  isHint={hintCells.has(`${r}-${c}`)}
                  styles={styles}
                  onPointerDown={(e) => handlePointerDown(e, r, c)}
                />
              ))
            ))}
          </div>
        </div>
      </main>

      {/* Footer - Words to find */}
      <footer className={cn("p-4 pb-8 z-10", styles.footer.background, styles.footer.border)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn("text-xs font-bold uppercase tracking-wider", styles.footer.title)}>
            Найди слова:
          </h3>
          <div className={cn(
            "text-[10px] flex items-center gap-1 px-2 py-1 rounded-full",
            isDark ? "bg-white/10 text-white/60" : "bg-black/5 text-black/50"
          )}>
            <Eye size={10} />
            <span>нажми чтобы подсмотреть</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 content-start max-h-36 overflow-auto">
          {placedWords.map((pw, idx) => {
            const isFound = foundWordIds.has(pw.word.bur);
            const colorIdx = idx % wordColors.length;
            const color = wordColors[colorIdx];
            // Находим индекс среди незнайденных слов
            const unfoundIndex = placedWords
              .slice(0, idx)
              .filter(p => !foundWordIds.has(p.word.bur))
              .length;
            
            return (
              <FlippableWordChip
                key={pw.word.bur}
                word={pw.word}
                isFound={isFound}
                color={color}
                styles={styles}
                isDark={isDark}
                index={isFound ? -1 : unfoundIndex}
              />
            );
          })}
        </div>
      </footer>

      {/* Toast уведомление */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.4 }}
            className={cn(
              "fixed bottom-24 left-4 right-4 mx-auto max-w-sm z-40",
              "rounded-2xl px-4 py-3 shadow-xl",
              "flex items-center gap-3",
              styles.toast.background,
              styles.toast.border
            )}
          >
            <div className={cn("flex-shrink-0", styles.toast.icon)}>
              <Info size={20} />
            </div>
            <p className={cn("text-sm font-medium", styles.toast.text)}>
              {toastMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win Modal */}
      <AnimatePresence>
        {showWinModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className={cn("absolute inset-0 z-50 flex items-center justify-center p-4", styles.winModal.overlay)}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }} 
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={cn(
                "rounded-3xl p-6 text-center w-full max-w-sm shadow-2xl relative overflow-hidden",
                styles.winModal.cardGradient,
                styles.winModal.cardBorder
              )}
            >
              {/* Декоративный фон */}
              <div className="absolute inset-0 opacity-30">
                <div className={cn("absolute top-0 left-1/4 w-32 h-32 rounded-full blur-3xl", styles.winModal.decorOrb1)} />
                <div className={cn("absolute bottom-0 right-1/4 w-24 h-24 rounded-full blur-3xl", styles.winModal.decorOrb2)} />
              </div>
              
              <div className="relative z-10">
                {/* Иконка с анимацией */}
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2, duration: 0.6 }}
                  className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg",
                    styles.winModal.trophyGradient,
                    styles.winModal.trophyShadow
                  )}
                >
                  <Trophy size={44} className={cn("drop-shadow-md", styles.winModal.trophyIcon)} />
                </motion.div>
                
                {/* Заголовок */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Sparkles size={20} className={styles.winModal.titleIcon} />
                    <h2 className={cn("text-3xl font-bold", styles.winModal.titleGradient)}>
                      Бэрхэ!
                    </h2>
                    <Sparkles size={20} className={styles.winModal.titleIcon} />
                  </div>
                  <p className={cn("mb-4", styles.winModal.subtitle)}>
                    Поздравляем! Вы отлично справились 🎉
                  </p>
                </motion.div>
                
                {/* Звёзды */}
                <motion.div 
                  className="flex justify-center mb-5"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <StarsDisplay stars={calculateStars()} size={36} />
                </motion.div>
                
                {/* Статистика */}
                <motion.div 
                  className="grid grid-cols-2 gap-2 mb-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className={cn(
                    "rounded-xl p-3 border",
                    styles.winModal.statCard.background,
                    styles.winModal.statCard.border
                  )}>
                    <div className={cn("text-xs mb-0.5", styles.winModal.statCard.label)}>⏱️ Время</div>
                    <div className={cn("text-lg font-bold", styles.winModal.statCard.valueDefault)}>{formatTime(time)}</div>
                  </div>
                  <div className={cn(
                    "rounded-xl p-3 border",
                    styles.winModal.statCard.background,
                    styles.winModal.statCard.border
                  )}>
                    <div className={cn("text-xs mb-0.5", styles.winModal.statCard.label)}>🏆 Очки</div>
                    <div className={cn("text-lg font-bold", styles.winModal.statCard.valueScore)}>{score}</div>
                  </div>
                  <div className={cn(
                    "rounded-xl p-3 border",
                    styles.winModal.statCard.background,
                    styles.winModal.statCard.border
                  )}>
                    <div className={cn("text-xs mb-0.5", styles.winModal.statCard.label)}>📖 Слов найдено</div>
                    <div className={cn("text-lg font-bold", styles.winModal.statCard.valueWords)}>{foundWordIds.size}/{placedWords.length}</div>
                  </div>
                  <div className={cn(
                    "rounded-xl p-3 border",
                    styles.winModal.statCard.background,
                    styles.winModal.statCard.border
                  )}>
                    <div className={cn("text-xs mb-0.5", styles.winModal.statCard.label)}>🔥 Макс. комбо</div>
                    <div className={cn("text-lg font-bold", styles.winModal.statCard.valueCombo)}>×{combo}</div>
                  </div>
                </motion.div>
                
                {/* Кнопки */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {/* Кнопка следующего уровня */}
                  {(() => {
                    const currentIndex = categories.findIndex(c => c.id === category?.id);
                    const nextCategory = currentIndex >= 0 && currentIndex < categories.length - 1 
                      ? categories[currentIndex + 1] 
                      : null;
                    const isNextUnlocked = nextCategory && state.stats.totalStars >= nextCategory.unlockRequirement;
                    
                    if (nextCategory) {
                      return (
                        <button 
                          onClick={() => isNextUnlocked && store.selectCategory(nextCategory.id)}
                          disabled={!isNextUnlocked}
                          className={cn(
                            "w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200",
                            isNextUnlocked 
                              ? `${styles.winModal.nextLevelButton.enabled} ${styles.winModal.nextLevelButton.enabledShadow} hover:scale-[1.02] active:scale-[0.98]`
                              : styles.winModal.nextLevelButton.disabled
                          )}
                        >
                          {isNextUnlocked ? (
                            <>
                              <span>Следующий уровень</span>
                              <span className="text-lg">{nextCategory.emoji}</span>
                              <ChevronRight size={18} />
                            </>
                          ) : (
                            <>
                              <Lock size={16} />
                              <span>Нужно ⭐ {nextCategory.unlockRequirement}</span>
                            </>
                          )}
                        </button>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={initGame}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2",
                        styles.winModal.secondaryButton.background,
                        styles.winModal.secondaryButton.backgroundHover,
                        styles.winModal.secondaryButton.text
                      )}
                    >
                      <RotateCcw size={16} />
                      Ещё раз
                    </button>
                    <button 
                      onClick={shareResult}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200",
                        styles.winModal.secondaryButton.background,
                        styles.winModal.secondaryButton.backgroundHover,
                        styles.winModal.secondaryButton.text
                      )}
                    >
                      <Share2 size={16} />
                      Поделиться
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => navigate('levels')}
                    className={cn(
                      "w-full py-3 font-medium transition-colors",
                      styles.winModal.backLink.text,
                      styles.winModal.backLink.textHover
                    )}
                  >
                    ← К списку уровней
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameScreen;

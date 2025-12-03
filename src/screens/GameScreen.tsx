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
  Lock
} from 'lucide-react';
import { cn, StarsDisplay } from '../components/ui';
import type { GameStore } from '../store/gameStore';
import { getCategoryById, categories } from '../data/words';
import { generateSnakeLevel, findWordByPath, type PlacedWord } from '../gameEngine';
import type { Coord, CellStatus } from '../types';

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

// Палитра цветов для слов (как в дебаге)
const WORD_COLORS = [
  { bg: '#ef4444', text: '#fff' }, // red
  { bg: '#f97316', text: '#fff' }, // orange
  { bg: '#eab308', text: '#000' }, // yellow
  { bg: '#22c55e', text: '#fff' }, // green
  { bg: '#14b8a6', text: '#fff' }, // teal
  { bg: '#0ea5e9', text: '#fff' }, // sky
  { bg: '#3b82f6', text: '#fff' }, // blue
  { bg: '#8b5cf6', text: '#fff' }, // violet
  { bg: '#d946ef', text: '#fff' }, // fuchsia
  { bg: '#ec4899', text: '#fff' }, // pink
  { bg: '#06b6d4', text: '#fff' }, // cyan
  { bg: '#84cc16', text: '#000' }, // lime
];

// Компонент клетки - оптимизированный с CSS анимациями
const LetterCell = React.memo(({ 
  char, 
  status, 
  r, c, 
  wordColor,
  isHint,
  neighbors,
  onPointerDown 
}: { 
  char: string; 
  status: CellStatus; 
  r: number; 
  c: number;
  wordColor?: { bg: string; text: string };
  isHint?: boolean;
  neighbors?: { top: boolean; bottom: boolean; left: boolean; right: boolean };
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
    const borderColor = 'rgba(255,255,255,0.5)';
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
        "transition-[transform,background-color,box-shadow] duration-100 ease-out",
        "will-change-transform",
        isSelected && "ring-4 ring-white scale-105 z-20 shadow-xl rounded-xl",
        isIdle && "bg-slate-700 text-white shadow-lg hover:bg-slate-600 active:scale-95 rounded-xl",
        isHint && isIdle && "ring-2 ring-amber-400/70 ring-offset-1 ring-offset-slate-900",
        isFound && "shadow-md"
      )}
      style={{
        ...(isFound && wordColor 
          ? { backgroundColor: wordColor.bg, color: wordColor.text }
          : isSelected 
            ? { backgroundColor: '#0ea5e9', color: '#fff' }
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
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-amber-400 rounded-full shadow-sm animate-[pulse_2s_ease-in-out_infinite]" />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Кастомное сравнение для предотвращения лишних ререндеров
  return prevProps.char === nextProps.char &&
         prevProps.status === nextProps.status &&
         prevProps.r === nextProps.r &&
         prevProps.c === nextProps.c &&
         prevProps.wordColor?.bg === nextProps.wordColor?.bg &&
         prevProps.isHint === nextProps.isHint &&
         prevProps.neighbors?.top === nextProps.neighbors?.top &&
         prevProps.neighbors?.bottom === nextProps.neighbors?.bottom &&
         prevProps.neighbors?.left === nextProps.neighbors?.left &&
         prevProps.neighbors?.right === nextProps.neighbors?.right;
});

export const GameScreen: React.FC<GameScreenProps> = ({ store }) => {
  const { state, navigate, completeLevel, addToLeaderboard } = store;
  const category = getCategoryById(state.selectedCategory || '');
  
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
  const lastFoundTimeRef = useRef<number>(0);
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
  }, [category]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: initialize game when category changes
  useEffect(() => { initGame(); }, [initGame]);

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
    
    confetti({ 
      particleCount: 150, 
      spread: 70, 
      origin: { y: 0.6 }, 
      colors: ['#0EA5E9', '#FACC15', '#10B981'] 
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
  }, [category, placedWords, time, score, completeLevel, addToLeaderboard, state.settings.playerName]);

  const handlePointerUp = useCallback(() => {
    setIsSelecting(false);
    if (selectedPath.length === 0) return;

    const matchedWord = findWordByPath(placedWords, selectedPath);
    const wordId = matchedWord ? matchedWord.word.bur : null;

    if (matchedWord && wordId && !foundWordIds.has(wordId)) {
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
  }, [selectedPath, placedWords, foundWordIds, combo, state.settings.vibrationEnabled, triggerWin]);

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
      return WORD_COLORS[cellInfo.wordIndex % WORD_COLORS.length];
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
      <div className="min-h-[100dvh] flex items-center justify-center">
        <p>Категория не найдена</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-900 font-sans text-white flex flex-col max-w-md mx-auto relative overflow-hidden select-none">
      
      {/* Header */}
      <header className="bg-slate-800 p-4 z-20">
        <div className="flex justify-between items-center mb-3">
          <button 
            onClick={() => navigate('levels')}
            className="p-2 bg-slate-700 rounded-xl hover:bg-slate-600 transition"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category.emoji}</span>
            <h1 className="text-lg font-bold">{category.name}</h1>
          </div>
          
          <button 
            onClick={initGame}
            className="p-2 bg-slate-700 rounded-xl hover:bg-slate-600 active:rotate-180 transition duration-300"
          >
            <RotateCcw size={20} />
          </button>
        </div>
        
        {/* Stats bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-700 rounded-xl px-3 py-2">
            <Clock size={16} className="text-slate-400" />
            <span className="font-mono font-bold">{formatTime(time)}</span>
          </div>
          
          {combo > 1 && (
            <div className="flex items-center gap-1 bg-amber-500 text-black rounded-xl px-3 py-2 animate-[pop_0.2s_ease-out]">
              <Zap size={16} />
              <span className="font-bold">x{combo}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 bg-slate-700 rounded-xl px-3 py-2">
            <Trophy size={16} className="text-amber-400" />
            <span className="font-bold">{score}</span>
          </div>
        </div>
        
        {/* Progress */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-[width] duration-300 ease-out"
              style={{ width: placedWords.length > 0 ? `${(foundWordIds.size / placedWords.length) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-sm font-bold text-emerald-400">{foundWordIds.size}/{placedWords.length}</span>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center touch-none">
        <div 
          ref={gridRef}
          className="grid gap-1 p-3 bg-slate-800 rounded-2xl touch-none"
          style={{ 
            touchAction: 'none',
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            maxWidth: `${Math.min(gridSize * 56, 380)}px`,
            width: '100%'
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
                onPointerDown={(e) => handlePointerDown(e, r, c)}
              />
            ))
          ))}
        </div>
      </main>

      {/* Footer - Words to find */}
      <footer className="bg-slate-800 p-4 pb-8 z-10">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Найди слова:
        </h3>
        <div className="flex flex-wrap gap-2 content-start max-h-36 overflow-auto">
          {placedWords.map((pw, idx) => {
            const isFound = foundWordIds.has(pw.word.bur);
            const colorIdx = idx % WORD_COLORS.length;
            const color = WORD_COLORS[colorIdx];
            
            return (
              <div 
                key={pw.word.bur}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2",
                  "transition-[transform,background-color] duration-200 ease-out",
                  !isFound && "bg-slate-700 text-slate-300",
                  isFound && "scale-95"
                )}
                style={isFound ? { 
                  backgroundColor: color.bg, 
                  color: color.text,
                } : undefined}
              >
                <span className={isFound ? 'line-through opacity-70' : ''}>
                  {pw.word.ru}
                </span>
                {isFound && (
                  <span className="text-xs opacity-70 animate-[pop_0.2s_ease-out]">
                    ({pw.word.bur})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </footer>

      {/* Win Modal */}
      <AnimatePresence>
        {showWinModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }} 
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-6 text-center w-full max-w-sm shadow-2xl border border-slate-700/50 relative overflow-hidden"
            >
              {/* Декоративный фон */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-emerald-400/20 rounded-full blur-3xl" />
              </div>
              
              <div className="relative z-10">
                {/* Иконка с анимацией */}
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2, duration: 0.6 }}
                  className="w-24 h-24 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/30"
                >
                  <Trophy size={44} className="text-white drop-shadow-md" />
                </motion.div>
                
                {/* Заголовок */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Sparkles size={20} className="text-amber-400" />
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                      Бэрхэ!
                    </h2>
                    <Sparkles size={20} className="text-amber-400" />
                  </div>
                  <p className="text-slate-300 mb-4">
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
                  <div className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-3 border border-slate-600/30">
                    <div className="text-xs text-slate-400 mb-0.5">⏱️ Время</div>
                    <div className="text-lg font-bold text-white">{formatTime(time)}</div>
                  </div>
                  <div className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-3 border border-slate-600/30">
                    <div className="text-xs text-slate-400 mb-0.5">🏆 Очки</div>
                    <div className="text-lg font-bold text-amber-400">{score}</div>
                  </div>
                  <div className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-3 border border-slate-600/30">
                    <div className="text-xs text-slate-400 mb-0.5">📖 Слов найдено</div>
                    <div className="text-lg font-bold text-emerald-400">{foundWordIds.size}/{placedWords.length}</div>
                  </div>
                  <div className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-3 border border-slate-600/30">
                    <div className="text-xs text-slate-400 mb-0.5">🔥 Макс. комбо</div>
                    <div className="text-lg font-bold text-cyan-400">×{combo}</div>
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
                              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
                              : "bg-slate-700/50 text-slate-400 cursor-not-allowed"
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
                      className="flex-1 py-3 bg-slate-700/70 text-white rounded-xl font-semibold hover:bg-slate-600 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={16} />
                      Ещё раз
                    </button>
                    <button 
                      onClick={shareResult}
                      className="flex-1 py-3 bg-slate-700/70 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-600 transition-all duration-200"
                    >
                      <Share2 size={16} />
                      Поделиться
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => navigate('levels')}
                    className="w-full py-3 text-slate-400 hover:text-white font-medium transition-colors"
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

// src/screens/GameScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Trophy, 
  Clock, 
  Share2, 
  RotateCcw,
  Check,
  Zap
} from 'lucide-react';
import { cn, StarsDisplay } from '../components/ui';
import type { GameStore } from '../store/gameStore';
import { getCategoryById } from '../data/words';
import { generateSnakeLevel } from '../gameEngine';
import type { WordData, Coord, CellStatus } from '../types';

interface GameScreenProps {
  store: GameStore;
}

// Компонент клетки
const LetterCell = React.memo(({ 
  char, 
  status, 
  r, c, 
  onPointerDown 
}: { 
  char: string; 
  status: CellStatus; 
  r: number; c: number;
  onPointerDown: (e: React.PointerEvent) => void; 
}) => {
  const baseStyle = "select-none touch-none w-full aspect-square flex items-center justify-center text-lg sm:text-xl font-bold rounded-xl transition-all duration-200 user-select-none cursor-pointer";
  
  const statusStyles = {
    idle: "bg-white text-baikal-900 shadow-[0_3px_0_#cbd5e1] border-2 border-slate-200 active:translate-y-[3px] active:shadow-none",
    selected: "bg-gradient-to-br from-baikal-400 to-baikal-600 text-white border-baikal-600 shadow-lg scale-95 rounded-2xl z-10",
    found: "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white border-emerald-500 opacity-90 scale-95 rounded-2xl z-0"
  };

  return (
    <motion.div
      layout
      className={cn(baseStyle, statusStyles[status])}
      data-r={r} 
      data-c={c}
      onDragStart={(e) => e.preventDefault()} 
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={onPointerDown}
    >
      {char}
    </motion.div>
  );
});

export const GameScreen: React.FC<GameScreenProps> = ({ store }) => {
  const { state, navigate, completeLevel, addToLeaderboard } = store;
  const category = getCategoryById(state.selectedCategory || '');
  
  const [gridLetters, setGridLetters] = useState<string[][]>([]);
  const [targetWords, setTargetWords] = useState<WordData[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<Coord[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [foundCellsRegistry, setFoundCellsRegistry] = useState<Set<string>>(new Set());
  // Карта: ключ клетки -> множество слов использующих эту клетку
  const [cellToWords, setCellToWords] = useState<Map<string, Set<string>>>(new Map());
  
  const [showWinModal, setShowWinModal] = useState(false);
  const [time, setTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const lastFoundTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Инициализация игры
  const initGame = useCallback(() => {
    if (!category) return;
    
    const { grid, placedWords, wordPaths: paths } = generateSnakeLevel(category.gridSize, category.words);
    setGridLetters(grid);
    setTargetWords(placedWords);
    setFoundWords([]);
    setFoundCellsRegistry(new Set());
    setShowWinModal(false);
    setSelectedPath([]);
    setTime(0);
    setScore(0);
    setCombo(0);
    lastFoundTimeRef.current = Date.now();
    
    // Строим карту: какие слова используют каждую клетку
    const newCellToWords = new Map<string, Set<string>>();
    for (const wp of paths) {
      for (const coord of wp.path) {
        const key = `${coord.r}-${coord.c}`;
        if (!newCellToWords.has(key)) {
          newCellToWords.set(key, new Set());
        }
        newCellToWords.get(key)!.add(wp.word.bur);
      }
    }
    setCellToWords(newCellToWords);
  }, [category]);

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

  // Проверяем, можно ли использовать клетку (не все слова через неё найдены)
  const canUseCell = useCallback((r: number, c: number): boolean => {
    const key = `${r}-${c}`;
    // Если клетка уже полностью "найдена" (все слова через неё), нельзя использовать
    if (foundCellsRegistry.has(key)) return false;
    return true;
  }, [foundCellsRegistry]);

  // Обработчики указателя
  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    e.preventDefault();
    if (e.button !== 0) return;
    if (!canUseCell(r, c)) return;

    setIsSelecting(true);
    setSelectedPath([{ r, c }]);
  };

  const handlePointerUp = useCallback(() => {
    setIsSelecting(false);
    if (selectedPath.length === 0) return;

    const wordString = selectedPath.map(c => gridLetters[c.r][c.c]).join('');
    const matchedWord = targetWords.find(w => w.bur === wordString);

    if (matchedWord && !foundWords.includes(matchedWord.bur)) {
      // Слово найдено!
      const now = Date.now();
      const timeSinceLast = now - lastFoundTimeRef.current;
      lastFoundTimeRef.current = now;
      
      // Комбо за быстрые находки (< 5 секунд)
      const newCombo = timeSinceLast < 5000 ? combo + 1 : 1;
      setCombo(newCombo);
      
      // Расчёт очков
      const basePoints = matchedWord.bur.length * 10;
      const comboBonus = newCombo > 1 ? basePoints * (newCombo - 1) * 0.5 : 0;
      const wordScore = Math.round(basePoints + comboBonus);
      setScore(s => s + wordScore);
      
      const newFoundWords = [...foundWords, matchedWord.bur];
      setFoundWords(newFoundWords);
      
      // ВАЖНО: Помечаем клетку как "found" только если ВСЕ слова
      // использующие эту клетку уже найдены
      setFoundCellsRegistry(prev => {
        const newSet = new Set(prev);
        selectedPath.forEach(p => {
          const key = `${p.r}-${p.c}`;
          const wordsUsingCell = cellToWords.get(key);
          
          if (wordsUsingCell) {
            // Проверяем, все ли слова использующие эту клетку найдены
            const allWordsFound = Array.from(wordsUsingCell).every(
              word => newFoundWords.includes(word)
            );
            if (allWordsFound) {
              newSet.add(key);
            }
          } else {
            // Если клетка не в карте (не должно случиться), помечаем как found
            newSet.add(key);
          }
        });
        return newSet;
      });
      
      // Вибрация
      if (state.settings.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Проверка победы
      if (newFoundWords.length === targetWords.length) {
        triggerWin();
      }
    }

    setSelectedPath([]);
  }, [selectedPath, gridLetters, targetWords, foundWords, combo, state.settings.vibrationEnabled, cellToWords]);

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

      const target = document.elementFromPoint(clientX, clientY);
      
      if (target?.hasAttribute('data-r')) {
        const r = parseInt(target.getAttribute('data-r')!, 10);
        const c = parseInt(target.getAttribute('data-c')!, 10);
        
        setSelectedPath(prevPath => {
          if (prevPath.length === 0) return [{r, c}];
          
          const last = prevPath[prevPath.length - 1];
          
          if (prevPath.length > 1) {
            const preLast = prevPath[prevPath.length - 2];
            if (preLast.r === r && preLast.c === c) {
              return prevPath.slice(0, -1);
            }
          }

          if (last.r === r && last.c === c) return prevPath;
          const isNeighbor = Math.abs(last.r - r) + Math.abs(last.c - c) === 1;
          
          const isAlreadySelected = prevPath.some(p => p.r === r && p.c === c);
          // Проверяем можно ли использовать клетку (не все слова через неё найдены)
          const cellUsable = !foundCellsRegistry.has(`${r}-${c}`);
          
          if (isNeighbor && !isAlreadySelected && cellUsable) {
            return [...prevPath, { r, c }];
          }

          return prevPath;
        });
      }
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
  }, [isSelecting, foundCellsRegistry, handlePointerUp]);

  const triggerWin = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    confetti({ 
      particleCount: 150, 
      spread: 70, 
      origin: { y: 0.6 }, 
      colors: ['#0EA5E9', '#FACC15', '#10B981'] 
    });
    
    // Сохранение результатов
    if (category) {
      completeLevel(
        category.id,
        foundWords.concat(targetWords[targetWords.length - 1].bur),
        time,
        targetWords.length
      );
      
      addToLeaderboard({
        playerName: state.settings.playerName,
        score: score + targetWords[targetWords.length - 1].bur.length * 10,
        categoryId: category.id,
        time,
      });
    }
    
    setTimeout(() => setShowWinModal(true), 500);
  };

  const getCellStatus = (r: number, c: number): CellStatus => {
    const key = `${r}-${c}`;
    // Сейчас выбрана - приоритет
    if (selectedPath.some(p => p.r === r && p.c === c)) return 'selected';
    // Полностью найдена (все слова через эту клетку найдены)
    if (foundCellsRegistry.has(key)) return 'found';
    return 'idle';
  };

  // Поделиться результатом
  const shareResult = async () => {
    const stars = targetWords.length === foundWords.length ? 3 : 
                  foundWords.length >= targetWords.length * 0.7 ? 2 : 1;
    
    const text = `🎮 Бурятский Филлворд
📚 ${category?.name} ${category?.emoji}
⭐ ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}
🎯 ${foundWords.length}/${targetWords.length} слов
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

  // Расчёт звёзд
  const calculateStars = (): number => {
    const completion = foundWords.length / targetWords.length;
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
    <div className="min-h-[100dvh] bg-slate-50 font-sans text-slate-800 flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden select-none">
      
      {/* Header */}
      <header className="bg-gradient-to-r from-baikal-700 to-baikal-600 text-white p-4 rounded-b-2xl shadow-lg z-20">
        <div className="flex justify-between items-center mb-3">
          <button 
            onClick={() => navigate('levels')}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-lg">{category.emoji}</span>
            <h1 className="text-lg font-bold">{category.name}</h1>
          </div>
          
          <button 
            onClick={initGame}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 active:rotate-180 transition duration-300"
          >
            <RotateCcw size={18} />
          </button>
        </div>
        
        {/* Stats bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
            <Clock size={16} />
            <span className="font-mono font-medium">{formatTime(time)}</span>
          </div>
          
          {combo > 1 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 bg-sun text-baikal-900 rounded-lg px-3 py-1.5"
            >
              <Zap size={16} />
              <span className="font-bold">x{combo}</span>
            </motion.div>
          )}
          
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
            <Trophy size={16} className="text-sun" />
            <span className="font-bold">{score}</span>
          </div>
        </div>
        
        {/* Progress */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-baikal-900/50 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-sun to-amber-300"
              initial={{ width: 0 }}
              animate={{ width: targetWords.length > 0 ? `${(foundWords.length / targetWords.length) * 100}%` : '0%' }}
              transition={{ type: "spring", stiffness: 50 }}
            />
          </div>
          <span className="text-sm font-medium">{foundWords.length}/{targetWords.length}</span>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center touch-none">
        <div 
          className="grid gap-1.5 p-3 bg-slate-200 rounded-2xl shadow-inner touch-none"
          style={{ 
            touchAction: 'none',
            gridTemplateColumns: `repeat(${category.gridSize}, minmax(0, 1fr))`
          }}
        >
          {gridLetters.map((row, r) => (
            row.map((char, c) => (
              <LetterCell
                key={`${r}-${c}`}
                char={char}
                r={r} c={c}
                status={getCellStatus(r, c)}
                onPointerDown={(e) => handlePointerDown(e, r, c)}
              />
            ))
          ))}
        </div>
      </main>

      {/* Footer - Words to find */}
      <footer className="bg-white border-t border-slate-200 p-4 pb-8 rounded-t-2xl z-10">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Переведи и найди:
        </h3>
        <div className="flex flex-wrap gap-2 content-start max-h-32 overflow-auto">
          {targetWords.map((word) => {
            const isFound = foundWords.includes(word.bur);
            return (
              <motion.div 
                key={word.bur}
                layout
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm border flex items-center gap-2 transition-all duration-500",
                  isFound 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                    : "bg-slate-50 border-slate-200 text-slate-700"
                )}
              >
                <span className={isFound ? 'line-through opacity-60' : ''}>{word.ru}</span>
                {isFound && <Check size={14} />}
              </motion.div>
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
            className="absolute inset-0 z-50 flex items-center justify-center bg-baikal-900/80 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }} 
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 text-center w-full max-w-xs shadow-2xl"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-sun to-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Trophy size={40} className="text-baikal-900" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Бэрхэ!</h2>
              <p className="text-slate-500 mb-4">Уровень пройден!</p>
              
              <div className="flex justify-center mb-4">
                <StarsDisplay stars={calculateStars()} size={32} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Время</div>
                  <div className="text-lg font-bold">{formatTime(time)}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Очки</div>
                  <div className="text-lg font-bold">{score}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Слов</div>
                  <div className="text-lg font-bold">{foundWords.length}/{targetWords.length}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Комбо</div>
                  <div className="text-lg font-bold">x{combo}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={shareResult}
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-200"
                >
                  <Share2 size={18} />
                  Поделиться
                </button>
                <button 
                  onClick={initGame}
                  className="w-full py-3 bg-baikal-100 text-baikal-700 rounded-xl font-semibold hover:bg-baikal-200"
                >
                  Играть снова
                </button>
                <button 
                  onClick={() => navigate('levels')}
                  className="w-full py-3 bg-gradient-to-r from-baikal-500 to-baikal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl"
                >
                  К уровням
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameScreen;


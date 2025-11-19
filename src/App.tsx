import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RefreshCcw, Check, Trophy } from 'lucide-react';
import { generateSnakeLevel, type WordData, type Coord } from './gameEngine';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- CONFIG ---
// 6x6 = 36 клеток. Твои слова занимают ~35 клеток. Будет очень плотно и красиво.
const GRID_SIZE = 6; 

const INITIAL_WORDS_POOL: WordData[] = [
  { bur: "САЙН", ru: "Привет/Хорошо" },
  { bur: "ЭЖЫ", ru: "Мама" },
  { bur: "АБА", ru: "Папа" },
  { bur: "НОМ", ru: "Книга" },
  { bur: "НАРАН", ru: "Солнце" },
  { bur: "ҮДЭР", ru: "День" },
  { bur: "ҺУРГУУЛИ", ru: "Школа" },
  { bur: "МОРИН", ru: "Лошадь" },
  { bur: "УҺАН", ru: "Вода" },
  { bur: "ХҮН", ru: "Человек" }
];

// --- TYPES ---
type CellStatus = 'idle' | 'selected' | 'found';

// --- COMPONENT: CELL ---
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
  
  const baseStyle = "select-none touch-none w-full aspect-square flex items-center justify-center text-xl sm:text-2xl font-bold rounded-md transition-all duration-200 user-select-none cursor-pointer";
  
  const statusStyles = {
    idle: "bg-white text-baikal-900 shadow-[0_2px_0_#cbd5e1] border-2 border-slate-200 active:translate-y-[2px] active:shadow-none",
    selected: "bg-baikal-500 text-white border-baikal-600 shadow-none scale-95 rounded-xl z-10",
    found: "bg-emerald-400 text-white border-emerald-500 opacity-90 scale-95 rounded-xl z-0"
  };

  return (
    <motion.div
      layout
      className={cn(baseStyle, statusStyles[status])}
      data-r={r} 
      data-c={c}
      // Блокируем стандартный Drag-and-Drop браузера
      onDragStart={(e) => e.preventDefault()} 
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={onPointerDown}
    >
      {char}
    </motion.div>
  );
});

export default function App() {
  const [gridLetters, setGridLetters] = useState<string[][]>([]);
  const [targetWords, setTargetWords] = useState<WordData[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  
  const [selectedPath, setSelectedPath] = useState<Coord[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  
  const [showWinModal, setShowWinModal] = useState(false);
  const [foundCellsRegistry, setFoundCellsRegistry] = useState<Set<string>>(new Set());

  // --- INIT ---
  const initGame = useCallback(() => {
    const { grid, placedWords } = generateSnakeLevel(GRID_SIZE, INITIAL_WORDS_POOL);
    setGridLetters(grid);
    setTargetWords(placedWords);
    setFoundWords([]);
    setFoundCellsRegistry(new Set());
    setShowWinModal(false);
    setSelectedPath([]);
  }, []);

  useEffect(() => { initGame(); }, [initGame]);

  // --- POINTER HANDLERS ---
  
  // 1. Начало нажатия
  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    e.preventDefault();
    if (e.button !== 0) return; // Только левая кнопка
    if (foundCellsRegistry.has(`${r}-${c}`)) return; // Нельзя трогать уже найденные

    setIsSelecting(true);
    setSelectedPath([{ r, c }]);
  };

  // 2. Конец нажатия (проверка слова)
  const handlePointerUp = useCallback(() => {
    setIsSelecting(false);
    if (selectedPath.length === 0) return;

    const wordString = selectedPath.map(c => gridLetters[c.r][c.c]).join('');
    
    // Ищем слово в списке загаданных
    const matchedWord = targetWords.find(w => w.bur === wordString);

    if (matchedWord && !foundWords.includes(matchedWord.bur)) {
      // Ура, слово найдено!
      setFoundWords(prev => [...prev, matchedWord.bur]);
      
      // Добавляем клетки в реестр найденных
      setFoundCellsRegistry(prev => {
        const newSet = new Set(prev);
        selectedPath.forEach(p => newSet.add(`${p.r}-${p.c}`));
        return newSet;
      });
      
      // Проверка победы
      if (foundWords.length + 1 === targetWords.length) {
        triggerWin();
      }
    }

    setSelectedPath([]); // Сбрас пути
  }, [selectedPath, gridLetters, targetWords, foundWords]);

  // 3. Движение (Глобальный слушатель)
  useEffect(() => {
    const handleMove = (e: Event) => {
      if (!isSelecting) return;

      // Получаем координаты X/Y мыши или пальца
      let clientX, clientY;
      if ((e as TouchEvent).touches && (e as TouchEvent).touches.length > 0) {
        clientX = (e as TouchEvent).touches[0].clientX;
        clientY = (e as TouchEvent).touches[0].clientY;
      } else if ((e as PointerEvent).clientX !== undefined) {
        clientX = (e as PointerEvent).clientX;
        clientY = (e as PointerEvent).clientY;
      } else return;

      // Ищем элемент под курсором
      const target = document.elementFromPoint(clientX, clientY);
      
      if (target && target.hasAttribute('data-r')) {
        const r = parseInt(target.getAttribute('data-r')!, 10);
        const c = parseInt(target.getAttribute('data-c')!, 10);
        
        // Логика добавления клетки в путь (Змейка)
        setSelectedPath(prevPath => {
            if (prevPath.length === 0) return [{r, c}];
            
            const last = prevPath[prevPath.length - 1];
            
            // Если вернулись назад -> убираем хвост (отмена хода)
            if (prevPath.length > 1) {
                const preLast = prevPath[prevPath.length - 2];
                if (preLast.r === r && preLast.c === c) {
                    return prevPath.slice(0, -1);
                }
            }

            // Если та же клетка или не соседняя -> игнор
            if (last.r === r && last.c === c) return prevPath;
            const isNeighbor = Math.abs(last.r - r) + Math.abs(last.c - c) === 1;
            
            // Если клетка уже в текущем пути или уже найдена -> нельзя
            const isAlreadySelected = prevPath.some(p => p.r === r && p.c === c);
            const isFound = foundCellsRegistry.has(`${r}-${c}`);
            
            if (isNeighbor && !isAlreadySelected && !isFound) {
                return [...prevPath, { r, c }];
            }

            return prevPath;
        });
      }
    };

    const handleEnd = () => { if (isSelecting) handlePointerUp(); };

    // Подписываемся на глобальные события окна
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false }); // Важно для iOS
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
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#0EA5E9', '#FACC15'] });
    setTimeout(() => setShowWinModal(true), 500);
  };

  // --- RENDER ---
  const getCellStatus = (r: number, c: number): CellStatus => {
    if (foundCellsRegistry.has(`${r}-${c}`)) return 'found';
    if (selectedPath.some(p => p.r === r && p.c === c)) return 'selected';
    return 'idle';
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans text-slate-800 flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden select-none">
      
      {/* HEADER */}
      <header className="bg-baikal-700 text-white p-4 rounded-b-2xl shadow-lg z-20">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold">Бурятский Филлворд</h1>
          <button onClick={initGame} className="p-2 bg-white/20 rounded-full hover:bg-white/30 active:rotate-180 transition duration-300">
            <RefreshCcw size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-baikal-900/50 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-sun"
              initial={{ width: 0 }}
              animate={{ width: targetWords.length > 0 ? `${(foundWords.length / targetWords.length) * 100}%` : '0%' }}
              transition={{ type: "spring", stiffness: 50 }}
            />
          </div>
          <span className="text-sm font-medium">{foundWords.length} / {targetWords.length}</span>
        </div>
      </header>

      {/* GRID AREA */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center touch-none">
        <div 
          className="grid gap-2 p-3 bg-slate-200 rounded-2xl shadow-inner touch-none"
          style={{ 
            touchAction: 'none',
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
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

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 p-4 pb-8 rounded-t-2xl z-10 min-h-[160px]">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Переведи и найди:</h3>
        <div className="flex flex-wrap gap-2 content-start">
          {targetWords.map((word) => {
            const isFound = foundWords.includes(word.bur);
            return (
              <div 
                key={word.bur}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm border flex items-center gap-2 transition-all duration-500",
                  isFound ? "bg-emerald-50 border-emerald-100 text-emerald-600 opacity-50 scale-95" : "bg-slate-100 border-slate-200 text-slate-700"
                )}
              >
                <span>{word.ru}</span>
                {isFound && <Check size={14} />}
              </div>
            );
          })}
        </div>
      </footer>

      {/* MODAL */}
      <AnimatePresence>
        {showWinModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-baikal-900/80 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 text-center w-full max-w-xs shadow-2xl"
            >
              <div className="w-20 h-20 bg-sun rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Trophy size={40} className="text-baikal-900" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Бэрхэ!</h2>
              <p className="text-slate-500 mb-6">Филлворд полностью разгадан!</p>
              <button onClick={initGame} className="w-full py-3 bg-baikal-600 text-white rounded-xl font-semibold shadow-lg hover:bg-baikal-700">Новая игра</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
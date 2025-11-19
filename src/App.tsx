import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RefreshCcw, Check, Trophy } from 'lucide-react';

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- DATA & CONFIG ---
const GRID_SIZE = 10;
const BURYAT_LETTERS = ['Ө', 'Ү', 'Һ'];
const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ" + BURYAT_LETTERS.join('');

interface WordData {
  bur: string;
  ru: string;
}

const INITIAL_WORDS: WordData[] = [
  { bur: "САЙН", ru: "Привет/Хорошо" },
  { bur: "ЭЖЫ", ru: "Мама" },
  { bur: "АБА", ru: "Папа" },
  { bur: "НОМ", ru: "Книга" },
  { bur: "НАРАН", ru: "Солнце" },
  { bur: "ҮДЭР", ru: "День" },
  { bur: "ҺУРГУУЛИ", ru: "Школа" }
];

// --- TYPES ---
type Coord = { r: number; c: number };
type CellStatus = 'idle' | 'selected' | 'found';

interface CellData {
  char: string;
  status: CellStatus;
  id: string; // `${r}-${c}`
}

// --- ENGINE: GENERATION LOGIC ---
const generateGrid = (size: number, words: WordData[]) => {
  // Создаем пустую сетку
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const placedWords: { word: string, coords: Coord[] }[] = [];

  // Сортируем слова: длинные сначала (их сложнее разместить)
  const sortedWords = [...words].sort((a, b) => b.bur.length - a.bur.length);

  for (const item of sortedWords) {
    const word = item.bur.toUpperCase();
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 100) {
      const direction = Math.random() > 0.5 ? 'H' : 'V';
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);

      // Проверка границ
      if (direction === 'H' && c + word.length > size) { attempts++; continue; }
      if (direction === 'V' && r + word.length > size) { attempts++; continue; }

      // Проверка коллизий
      let fits = true;
      const tempCoords: Coord[] = [];

      for (let i = 0; i < word.length; i++) {
        const cr = direction === 'V' ? r + i : r;
        const cc = direction === 'H' ? c + i : c;
        const cellVal = grid[cr][cc];

        if (cellVal !== '' && cellVal !== word[i]) {
          fits = false;
          break;
        }
        tempCoords.push({ r: cr, c: cc });
      }

      if (fits) {
        // Размещаем
        tempCoords.forEach((coord, i) => {
          grid[coord.r][coord.c] = word[i];
        });
        placedWords.push({ word, coords: tempCoords });
        placed = true;
      }
      attempts++;
    }
    
    if (!placed) {
        console.warn(`Could not place word: ${word}`);
    }
  }

  // Заполняем пустоты
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return grid;
};

// --- COMPONENTS ---

const LetterCell = ({ 
  char, 
  status, 
  onPointerDown, 
  onPointerEnter 
}: { 
  char: string; 
  status: CellStatus; 
  onPointerDown: () => void; 
  onPointerEnter: () => void;
}) => {
  const baseStyle = "select-none touch-none w-full aspect-square flex items-center justify-center text-lg sm:text-xl font-bold rounded-lg transition-colors duration-150";
  
  const statusStyles = {
    idle: "bg-white text-baikal-900 shadow-sm border border-slate-200",
    selected: "bg-baikal-300 text-white scale-105 shadow-md z-10",
    found: "bg-emerald-400 text-white border-emerald-500 animate-pulse-once"
  };

  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
      className={cn(baseStyle, statusStyles[status])}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
    >
      {char}
    </motion.div>
  );
};

export default function App() {
  // --- STATE ---
  const [gridLetters, setGridLetters] = useState<string[][]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selection, setSelection] = useState<{ start: Coord | null, current: Coord | null }>({ start: null, current: null });
  const [isSelecting, setIsSelecting] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Инициализация игры
  const initGame = useCallback(() => {
    const newGrid = generateGrid(GRID_SIZE, INITIAL_WORDS);
    setGridLetters(newGrid);
    setFoundWords([]);
    setShowWinModal(false);
    setSelection({ start: null, current: null });
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // --- LOGIC: COORDINATE MATH ---
  
  // Вычисляем клетки, попадающие в линию выделения
  const getSelectedCells = useCallback((start: Coord, end: Coord): Coord[] => {
    const cells: Coord[] = [];
    const dr = end.r - start.r;
    const dc = end.c - start.c;

    // Определяем направление (горизонталь или вертикаль)
    // Если смещение по диагонали, выбираем доминирующую ось
    const isVertical = Math.abs(dr) > Math.abs(dc);

    if (isVertical) {
      const step = dr > 0 ? 1 : -1;
      for (let i = 0; i <= Math.abs(dr); i++) {
        cells.push({ r: start.r + i * step, c: start.c });
      }
    } else {
      const step = dc > 0 ? 1 : -1;
      for (let i = 0; i <= Math.abs(dc); i++) {
        cells.push({ r: start.r, c: start.c + i * step });
      }
    }
    return cells;
  }, []);

  const currentSelectionCoords = useMemo(() => {
    if (!selection.start || !selection.current) return [];
    return getSelectedCells(selection.start, selection.current);
  }, [selection, getSelectedCells]);

  // Получаем строку из выделенных клеток
  const selectedWordString = useMemo(() => {
    return currentSelectionCoords.map(c => gridLetters[c.r][c.c]).join('');
  }, [currentSelectionCoords, gridLetters]);

  // Все найденные координаты (для отрисовки)
  const foundCoordsSet = useMemo(() => {
    // Это упрощение. В реальном проекте лучше хранить координаты найденных слов отдельно, 
    // чтобы знать, какое слово где, но здесь мы регенерируем их "на лету" или можно хранить в state.
    // Для MVP: мы просто не пересчитываем координаты найденных слов, 
    // а храним список найденных слов, но чтобы подсветить клетки, нам нужно знать их координаты.
    // ПРАВИЛЬНЕЕ: Когда слово найдено, запоминаем его координаты.
    return new Set<string>(); 
  }, []);
  
  // Fix: State to store coordinates of found words specifically
  const [foundCellsRegistry, setFoundCellsRegistry] = useState<Set<string>>(new Set());

  // --- HANDLERS ---

  const handlePointerDown = (r: number, c: number) => {
    setIsSelecting(true);
    setSelection({ start: { r, c }, current: { r, c } });
  };

  const handlePointerEnter = (r: number, c: number) => {
    if (!isSelecting) return;
    setSelection(prev => ({ ...prev, current: { r, c } }));
  };

  const handlePointerUp = () => {
    setIsSelecting(false);
    if (!selectedWordString) return;

    const wordToCheck = selectedWordString;
    // Ищем совпадение с исходными словами
    const matchedWord = INITIAL_WORDS.find(w => w.bur === wordToCheck);

    if (matchedWord && !foundWords.includes(matchedWord.bur)) {
      // Слово найдено!
      const newFound = [...foundWords, matchedWord.bur];
      setFoundWords(newFound);

      // Добавляем координаты в реестр найденных
      const newRegistry = new Set(foundCellsRegistry);
      currentSelectionCoords.forEach(c => newRegistry.add(`${c.r}-${c.c}`));
      setFoundCellsRegistry(newRegistry);

      // Проверка победы
      if (newFound.length === INITIAL_WORDS.length) {
        triggerWin();
      }
    }

    setSelection({ start: null, current: null });
  };

  const triggerWin = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0EA5E9', '#FACC15', '#ffffff'] // Blue, Yellow, White
    });
    setTimeout(() => setShowWinModal(true), 500);
  };

  // Глобальный обработчик pointer up (если отпустили вне клетки)
  useEffect(() => {
    const handleGlobalUp = () => {
      if (isSelecting) handlePointerUp();
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [isSelecting, selectedWordString, foundWords, currentSelectionCoords]);


  // --- RENDERING HELPERS ---
  const getCellStatus = (r: number, c: number): CellStatus => {
    const key = `${r}-${c}`;
    if (foundCellsRegistry.has(key)) return 'found';
    
    if (isSelecting && currentSelectionCoords.some(coord => coord.r === r && coord.c === c)) {
      return 'selected';
    }
    return 'idle';
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans text-slate-800 flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden">
      
      {/* HEADER */}
      <header className="bg-baikal-700 text-white p-4 rounded-b-2xl shadow-lg z-20">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold tracking-wide">Бурятский Филлворд</h1>
          <button onClick={initGame} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
            <RefreshCcw size={18} />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-baikal-900/50 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-sun"
              initial={{ width: 0 }}
              animate={{ width: `${(foundWords.length / INITIAL_WORDS.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 50 }}
            />
          </div>
          <span className="text-sm font-medium">{foundWords.length} / {INITIAL_WORDS.length}</span>
        </div>
      </header>

      {/* MAIN GAME AREA */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center touch-none">
        
        {/* GRID CONTAINER */}
        <div 
          ref={gridRef}
          className="grid grid-cols-10 gap-1 p-2 bg-white rounded-xl shadow-inner border border-slate-200 select-none touch-none"
          style={{ touchAction: 'none' }} // Critical for dragging on mobile
        >
          {gridLetters.map((row, r) => (
            row.map((char, c) => (
              <LetterCell
                key={`${r}-${c}`}
                char={char}
                status={getCellStatus(r, c)}
                onPointerDown={() => handlePointerDown(r, c)}
                onPointerEnter={() => handlePointerEnter(r, c)}
              />
            ))
          ))}
        </div>

      </main>

      {/* FOOTER: WORD LIST */}
      <footer className="bg-white border-t border-slate-200 p-4 pb-8 rounded-t-2xl z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Найди перевод:</h3>
        <div className="flex flex-wrap gap-2">
          {INITIAL_WORDS.map((word) => {
            const isFound = foundWords.includes(word.bur);
            return (
              <div 
                key={word.bur}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm border flex items-center gap-2 transition-all duration-300",
                  isFound 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-600 opacity-70" 
                    : "bg-slate-100 border-slate-200 text-slate-700"
                )}
              >
                <span>{word.ru}</span>
                {isFound && <Check size={14} />}
              </div>
            );
          })}
        </div>
      </footer>

      {/* WIN MODAL */}
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
              className="bg-white rounded-2xl p-8 text-center w-full max-w-xs shadow-2xl"
            >
              <div className="w-20 h-20 bg-sun rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Trophy size={40} className="text-baikal-900" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Бэрхэ!</h2>
              <p className="text-slate-500 mb-6">Ты нашел все слова. Отличная работа!</p>
              
              <button 
                onClick={initGame}
                className="w-full py-3 bg-baikal-600 text-white rounded-xl font-semibold shadow-lg hover:bg-baikal-700 active:scale-95 transition-all"
              >
                Играть снова
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
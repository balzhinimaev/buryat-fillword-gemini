// src/screens/DebugGridScreen.tsx
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { GameStore } from '../store/gameStore';
import type { WordData } from '../types';
import { generateSnakeLevel, selectWordsForGrid, getTotalLetters } from '../gameEngine';
import type { PlacedWord } from '../gameEngine';

interface DebugGridScreenProps {
  store: GameStore;
}

// Структура клетки с полной информацией
interface CellInfo {
  char: string;
  wordId: number;      // -1 если шум
  orderIndex: number;  // позиция буквы в слове (-1 если шум)
  wordText?: string;   // само слово (для отладки)
  isNoise: boolean;
}

// Цвета для разных слов
const WORD_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#64748b', '#0d9488', '#7c3aed',
];

// Большой пул слов для подбора
const WORD_POOL: WordData[] = [
  // Короткие (2-3 буквы)
  { bur: 'ГАЛ', ru: 'Огонь' },
  { bur: 'ОЙ', ru: 'Лес' },
  { bur: 'ГОЛ', ru: 'Река' },
  { bur: 'САЙ', ru: 'Чай' },
  { bur: 'НОМ', ru: 'Книга' },
  { bur: 'ГЭР', ru: 'Дом' },
  { bur: 'ГАР', ru: 'Рука' },
  { bur: 'АМА', ru: 'Рот' },
  { bur: 'АБА', ru: 'Папа' },
  { bur: 'АХА', ru: 'Брат' },
  { bur: 'ЭЖЫ', ru: 'Мама' },
  { bur: 'ЭГЭ', ru: 'Сестра' },
  { bur: 'ДҮҮ', ru: 'Младший' },
  { bur: 'ХҮҮ', ru: 'Сын' },
  { bur: 'ҮГЫ', ru: 'Нет' },
  { bur: 'МУУ', ru: 'Плохо' },
  { bur: 'АЙЛ', ru: 'Семья' },
  
  // Средние (4-5 букв)
  { bur: 'УҺАН', ru: 'Вода' },
  { bur: 'САЙН', ru: 'Привет' },
  { bur: 'ТИИМЭ', ru: 'Да' },
  { bur: 'НАРАН', ru: 'Солнце' },
  { bur: 'ҺАРА', ru: 'Луна' },
  { bur: 'ОДОН', ru: 'Звезда' },
  { bur: 'МОДОН', ru: 'Дерево' },
  { bur: 'СЭСЭГ', ru: 'Цветок' },
  { bur: 'ГАЗАР', ru: 'Земля' },
  { bur: 'МОРИН', ru: 'Лошадь' },
  { bur: 'ҮХЭР', ru: 'Корова' },
  { bur: 'ХОНИН', ru: 'Овца' },
  { bur: 'НОХОЙ', ru: 'Собака' },
  { bur: 'ШОНО', ru: 'Волк' },
  { bur: 'НЭГЭН', ru: 'Один' },
  { bur: 'ХОЁР', ru: 'Два' },
  { bur: 'ТАБАН', ru: 'Пять' },
  { bur: 'АРБАН', ru: 'Десять' },
  { bur: 'НЮДЭН', ru: 'Глаз' },
  { bur: 'ХАМАР', ru: 'Нос' },
  { bur: 'ШЭХЭН', ru: 'Ухо' },
  { bur: 'ХҮЛ', ru: 'Нога' },
  { bur: 'ЭДЕЭН', ru: 'Еда' },
  { bur: 'МЯХАН', ru: 'Мясо' },
  { bur: 'ҺҮНЭ', ru: 'Молоко' },
  { bur: 'БУДАА', ru: 'Рис' },
  { bur: 'ТАРАГ', ru: 'Творог' },
  { bur: 'БООБО', ru: 'Буузы' },
  { bur: 'ҮҮДЭН', ru: 'Дверь' },
  { bur: 'СОНХО', ru: 'Окно' },
  { bur: 'ОРОН', ru: 'Кровать' },
  { bur: 'ШЭРЭЭ', ru: 'Стол' },
  { bur: 'ҮДЭР', ru: 'День' },
  { bur: 'ҺҮНИ', ru: 'Ночь' },
  { bur: 'МҮНӨӨ', ru: 'Сейчас' },
  { bur: 'УЛААН', ru: 'Красный' },
  { bur: 'ХҮХЭ', ru: 'Синий' },
  { bur: 'НОГООН', ru: 'Зелёный' },
  { bur: 'ШАРА', ru: 'Жёлтый' },
  { bur: 'ХАРА', ru: 'Чёрный' },
  { bur: 'БОРО', ru: 'Серый' },
  { bur: 'ХОТО', ru: 'Город' },
  { bur: 'ДАЛАЙ', ru: 'Море' },
  { bur: 'УУЛА', ru: 'Гора' },
  { bur: 'ЭЖЫ', ru: 'Бабушка' },
  
  // Длинные (6-7 букв)
  { bur: 'ШУЛУУН', ru: 'Камень' },
  { bur: 'ХАРГЫЫ', ru: 'Дорога' },
  { bur: 'ШУБУУН', ru: 'Птица' },
  { bur: 'ҮНЭГЭН', ru: 'Лиса' },
  { bur: 'ГУРБАН', ru: 'Три' },
  { bur: 'ДҮРБЭН', ru: 'Четыре' },
  { bur: 'ДОЛООН', ru: 'Семь' },
  { bur: 'НАЙМАН', ru: 'Восемь' },
  { bur: 'ТОЛГОЙ', ru: 'Голова' },
  { bur: 'ЗҮРХЭН', ru: 'Сердце' },
  { bur: 'ҮГЛӨӨ', ru: 'Утро' },
  { bur: 'ҮДЭШЭ', ru: 'Вечер' },
  { bur: 'САГААН', ru: 'Белый' },
  { bur: 'ТОСХОН', ru: 'Деревня' },
  { bur: 'ЯБАХА', ru: 'Идти' },
  { bur: 'ЭДИХЭ', ru: 'Есть' },
  { bur: 'УНТАХА', ru: 'Спать' },
  { bur: 'ҮЗЭХЭ', ru: 'Видеть' },
  { bur: 'ТААБАЙ', ru: 'Дедушка' },
  { bur: 'ЗУРГААН', ru: 'Шесть' },
  { bur: 'ТЭНГЭРИ', ru: 'Небо' },
  { bur: 'ЗАГАҺАН', ru: 'Рыба' },
  { bur: 'БААБГАЙ', ru: 'Медведь' },
  { bur: 'МИИСГЭЙ', ru: 'Кошка' },
  { bur: 'БАСАГАН', ru: 'Дочь' },
  { bur: 'БАЯРТАЙ', ru: 'До свидания' },
  { bur: 'БАЯРЛАА', ru: 'Спасибо' },
  { bur: 'ЗҮГӨӨР', ru: 'Пожалуйста' },
  { bur: 'ҺАНДАЛИ', ru: 'Стул' },
  { bur: 'ҺУРГУУЛИ', ru: 'Школа' },
  { bur: 'ДУУЛАХА', ru: 'Слышать' },
  { bur: 'ХЭЛЭХЭ', ru: 'Говорить' },
  { bur: 'ҺУРАХА', ru: 'Учиться' },
  { bur: 'ХИЛЭЭМЭН', ru: 'Хлеб' },
  { bur: 'МАРГААША', ru: 'Завтра' },
  { bur: 'ҮСЭГЭЛДЭР', ru: 'Вчера' },
];

// Построение карты клеток с полной информацией
const buildCellInfoGrid = (
  grid: string[][],
  placedWords: PlacedWord[],
  size: number
): CellInfo[][] => {
  const cellGrid: CellInfo[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      char: grid[r][c],
      wordId: -1,
      orderIndex: -1,
      isNoise: true,
    }))
  );

  placedWords.forEach((pw, wordId) => {
    pw.path.forEach((coord, orderIndex) => {
      cellGrid[coord.r][coord.c] = {
        char: grid[coord.r][coord.c],
        wordId,
        orderIndex,
        wordText: pw.word.bur,
        isNoise: false,
      };
    });
  });

  return cellGrid;
};

export const DebugGridScreen: React.FC<DebugGridScreenProps> = ({ store }) => {
  const { goBack } = store;

  const [gridSize, setGridSize] = useState(5);
  const [showWordId, setShowWordId] = useState(true);
  const [showOrderIndex, setShowOrderIndex] = useState(true);
  const [highlightWord, setHighlightWord] = useState<number | null>(null);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [exactFillMode, setExactFillMode] = useState(true);

  // Подбор слов для точного заполнения
  const selectedWords = useMemo(() => {
    if (exactFillMode) {
      return selectWordsForGrid(WORD_POOL, gridSize, 2, 12) || [];
    }
    // Случайный выбор слов
    return WORD_POOL.slice(0, 8).sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize, regenerateKey, exactFillMode]);

  // Генерация поля
  const gameState = useMemo(() => {
    if (selectedWords.length === 0) {
      return { grid: [], placedWords: [], size: gridSize };
    }
    return generateSnakeLevel(gridSize, selectedWords, exactFillMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWords, gridSize, regenerateKey, exactFillMode]);

  // Построение информационной карты
  const cellInfoGrid = useMemo(() => {
    if (gameState.grid.length === 0) return [];
    return buildCellInfoGrid(gameState.grid, gameState.placedWords, gameState.size);
  }, [gameState]);

  // Статистика
  const stats = useMemo(() => {
    const totalCells = gridSize * gridSize;
    const wordCells = gameState.placedWords.reduce((sum, pw) => sum + pw.path.length, 0);
    const noiseCells = totalCells - wordCells;
    const fillPercent = ((wordCells / totalCells) * 100).toFixed(1);
    const selectedLetters = getTotalLetters(selectedWords);

    return {
      totalCells,
      wordCells,
      noiseCells,
      fillPercent,
      wordsPlaced: gameState.placedWords.length,
      wordsSelected: selectedWords.length,
      selectedLetters,
      isPerfect: noiseCells === 0 && wordCells === totalCells,
    };
  }, [gameState, gridSize, selectedWords]);

  const handleRegenerate = () => {
    setHighlightWord(null);
    setRegenerateKey(k => k + 1);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-white p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => goBack()}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600"
        >
          ← Назад
        </button>
        <h1 className="text-xl font-bold text-cyan-400">🔧 Debug Grid</h1>
        <button
          onClick={handleRegenerate}
          className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500"
        >
          🔄
        </button>
      </div>

      {/* Mode Toggle */}
      <div 
        onClick={() => setExactFillMode(!exactFillMode)}
        className={`mb-4 p-3 rounded-lg cursor-pointer transition-all ${
          exactFillMode 
            ? 'bg-emerald-600 ring-2 ring-emerald-400' 
            : 'bg-slate-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">
              {exactFillMode ? '✅ Точное заполнение' : '❌ С шумом'}
            </div>
            <div className="text-xs opacity-70">
              {exactFillMode 
                ? `Подбор слов для ${gridSize}×${gridSize} = ${gridSize * gridSize} букв` 
                : 'Случайные слова + шум'}
            </div>
          </div>
          <div className="text-2xl">
            {exactFillMode ? '🎯' : '🎲'}
          </div>
        </div>
      </div>

      {/* Grid Size Control */}
      <div className="bg-slate-800 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-slate-300">
            Размер: <span className="font-bold text-cyan-400">{gridSize}×{gridSize}</span>
          </label>
          <span className="text-sm text-slate-400">
            = {gridSize * gridSize} клеток
          </span>
        </div>
        <input
          type="range"
          min={3}
          max={8}
          value={gridSize}
          onChange={e => {
            setGridSize(Number(e.target.value));
            setHighlightWord(null);
          }}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>3×3</span>
          <span>4×4</span>
          <span>5×5</span>
          <span>6×6</span>
          <span>7×7</span>
          <span>8×8</span>
        </div>
      </div>

      {/* Statistics */}
      <div className={`rounded-lg p-3 mb-4 grid grid-cols-4 gap-2 text-center text-xs ${
        stats.isPerfect ? 'bg-emerald-900/50 ring-2 ring-emerald-500' : 'bg-slate-800'
      }`}>
        <div>
          <div className="text-slate-400">Слов</div>
          <div className="text-lg font-bold text-emerald-400">
            {stats.wordsPlaced}
          </div>
        </div>
        <div>
          <div className="text-slate-400">Букв</div>
          <div className="text-lg font-bold text-cyan-400">
            {stats.wordCells}/{stats.totalCells}
          </div>
        </div>
        <div>
          <div className="text-slate-400">Заполнение</div>
          <div className={`text-lg font-bold ${stats.isPerfect ? 'text-emerald-400' : 'text-amber-400'}`}>
            {stats.fillPercent}%
          </div>
        </div>
        <div>
          <div className="text-slate-400">Шум</div>
          <div className={`text-lg font-bold ${stats.noiseCells === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.noiseCells}
          </div>
        </div>
      </div>

      {stats.isPerfect && (
        <div className="bg-emerald-600 text-white text-center py-2 px-4 rounded-lg mb-4 font-bold">
          🎉 Идеальное заполнение! 0 шума!
        </div>
      )}

      {/* View Toggles */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div
          onClick={() => setShowWordId(!showWordId)}
          className={`bg-slate-800 rounded-lg p-2 cursor-pointer transition text-center text-sm ${
            showWordId ? 'ring-2 ring-cyan-500' : ''
          }`}
        >
          {showWordId ? '✅' : '❌'} wordId
        </div>
        <div
          onClick={() => setShowOrderIndex(!showOrderIndex)}
          className={`bg-slate-800 rounded-lg p-2 cursor-pointer transition text-center text-sm ${
            showOrderIndex ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          {showOrderIndex ? '✅' : '❌'} orderIndex
        </div>
      </div>

      {/* Grid */}
      {cellInfoGrid.length > 0 && (
        <div
          className="grid gap-1 mb-4 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${gameState.size}, 1fr)`,
            maxWidth: `${Math.min(gameState.size * 52, 350)}px`,
          }}
        >
          {cellInfoGrid.map((row, r) =>
            row.map((cell, c) => {
              const isHighlighted = highlightWord !== null && cell.wordId === highlightWord;
              const wordColor = cell.isNoise
                ? '#475569'
                : WORD_COLORS[cell.wordId % WORD_COLORS.length];

              return (
                <motion.div
                  key={`${r}-${c}-${regenerateKey}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: (r * gameState.size + c) * 0.01 }}
                  className={`
                    relative aspect-square rounded-md flex flex-col items-center justify-center
                    text-white font-bold cursor-pointer transition-all
                    ${isHighlighted ? 'ring-2 ring-white scale-110 z-10' : ''}
                    ${cell.isNoise ? 'bg-slate-700' : ''}
                  `}
                  style={{ backgroundColor: cell.isNoise ? undefined : wordColor }}
                  onClick={() => {
                    if (!cell.isNoise) {
                      setHighlightWord(highlightWord === cell.wordId ? null : cell.wordId);
                    }
                  }}
                >
                  <span className="text-base leading-none">{cell.char}</span>

                  {showWordId && !cell.isNoise && (
                    <span className="absolute top-0 left-0.5 text-[7px] opacity-60">
                      {cell.wordId}
                    </span>
                  )}

                  {showOrderIndex && !cell.isNoise && (
                    <span className="absolute bottom-0 right-0.5 text-[7px] opacity-60">
                      {cell.orderIndex}
                    </span>
                  )}

                  {cell.isNoise && (
                    <span className="absolute bottom-0 right-0.5 text-[7px] text-slate-500">~</span>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Selected Words Info */}
      {exactFillMode && selectedWords.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <h3 className="text-sm font-bold text-slate-300 mb-2">
            Подобранные слова ({selectedWords.length} слов, {stats.selectedLetters} букв):
          </h3>
          <div className="flex flex-wrap gap-1">
            {selectedWords.map((w, idx) => (
              <span 
                key={idx} 
                className="px-2 py-0.5 bg-slate-700 rounded text-xs"
              >
                {w.bur} <span className="opacity-50">({w.bur.length})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Word List */}
      <div className="bg-slate-800 rounded-lg p-3">
        <h3 className="text-sm font-bold text-slate-300 mb-2">Размещённые слова:</h3>
        <div className="flex flex-wrap gap-2">
          {gameState.placedWords.map((pw, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => setHighlightWord(highlightWord === idx ? null : idx)}
              className={`
                px-2 py-1 rounded-md text-xs font-mono cursor-pointer transition
                ${highlightWord === idx ? 'ring-2 ring-white scale-105' : ''}
              `}
              style={{ backgroundColor: WORD_COLORS[idx % WORD_COLORS.length] }}
            >
              <span className="opacity-50">#{idx}</span> {pw.word.bur}
              <span className="opacity-50 ml-1">({pw.word.ru})</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Path visualization */}
      {highlightWord !== null && gameState.placedWords[highlightWord] && (
        <div className="mt-4 bg-slate-800 rounded-lg p-3 text-xs">
          <h3 className="font-bold text-slate-300 mb-2">
            Путь: "{gameState.placedWords[highlightWord].word.bur}"
          </h3>
          <div className="flex flex-wrap gap-1 font-mono">
            {gameState.placedWords[highlightWord].path.map((coord, idx) => (
              <span key={idx} className="px-1.5 py-0.5 bg-slate-700 rounded">
                ({coord.r},{coord.c})
                {idx < gameState.placedWords[highlightWord].path.length - 1 && (
                  <span className="text-cyan-400 ml-1">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugGridScreen;

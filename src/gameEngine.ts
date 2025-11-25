// src/gameEngine.ts
import type { WordData, Coord } from './types';

export type { WordData, Coord };

// Путь слова на сетке
export interface PlacedWord {
  word: WordData;
  path: Coord[];  // Точные координаты каждой буквы
}

export interface GameState {
  grid: string[][];
  placedWords: PlacedWord[];  // Теперь храним слова с их путями!
  size: number;
}

// Соседи: Верх, Вниз, Влево, Вправо (без диагоналей)
const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

// Алфавит для "шума" (заполнения пустот) - бурятский
const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯӨҮҺ";

// Проверка валидности координат
const isValid = (r: number, c: number, size: number) =>
  r >= 0 && r < size && c >= 0 && c < size;

// Рекурсивная функция размещения слова змейкой
const placeWordSnake = (
  grid: string[][],
  word: string,
  currentR: number,
  currentC: number,
  index: number,
  path: Coord[]
): boolean => {
  if (index === word.length) return true;

  const shuffledDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5);

  for (const { dr, dc } of shuffledDirs) {
    const nextR = currentR + dr;
    const nextC = currentC + dc;

    if (isValid(nextR, nextC, grid.length) && grid[nextR][nextC] === '') {
      grid[nextR][nextC] = word[index];
      path.push({ r: nextR, c: nextC });

      if (placeWordSnake(grid, word, nextR, nextC, index + 1, path)) {
        return true;
      }

      grid[nextR][nextC] = '';
      path.pop();
    }
  }
  return false;
};

// Рассчитать оптимальный размер сетки
const calculateGridSize = (words: WordData[], minSize: number): number => {
  const totalLetters = words.reduce((sum, w) => sum + w.bur.length, 0);
  // Нужно место для всех букв + ~30% запаса для шума
  const neededCells = Math.ceil(totalLetters * 1.3);
  const calculatedSize = Math.ceil(Math.sqrt(neededCells));
  return Math.max(minSize, calculatedSize);
};

// Основная функция генерации уровня
export const generateSnakeLevel = (minGridSize: number, allWords: WordData[]): GameState => {
  // Рассчитываем оптимальный размер
  const size = calculateGridSize(allWords, minGridSize);
  
  let bestResult: GameState | null = null;
  let maxWordsCount = 0;

  // 100 попыток для лучшего результата
  for (let attempt = 0; attempt < 100; attempt++) {
    const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
    const placedWords: PlacedWord[] = [];

    // Сортируем: длинные слова первыми
    const wordsToPlace = [...allWords].sort((a, b) => b.bur.length - a.bur.length);

    // Все клетки для случайного выбора стартовой позиции
    const allCells: Coord[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        allCells.push({ r, c });
      }
    }

    for (const wordObj of wordsToPlace) {
      const word = wordObj.bur.toUpperCase();
      
      // Перемешиваем клетки для случайности
      const shuffledCells = [...allCells].sort(() => Math.random() - 0.5);

      for (const startCell of shuffledCells) {
        if (grid[startCell.r][startCell.c] === '') {
          grid[startCell.r][startCell.c] = word[0];
          const path: Coord[] = [{ r: startCell.r, c: startCell.c }];

          if (placeWordSnake(grid, word, startCell.r, startCell.c, 1, path)) {
            placedWords.push({ word: wordObj, path: [...path] });
            break;
          } else {
            grid[startCell.r][startCell.c] = '';
          }
        }
      }
    }

    // Если разместили больше слов - сохраняем как лучший результат
    if (placedWords.length > maxWordsCount) {
      maxWordsCount = placedWords.length;

      // Заполняем пустоты случайными буквами
      const filledGrid = grid.map(row => [...row]);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (filledGrid[r][c] === '') {
            filledGrid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
          }
        }
      }

      bestResult = { grid: filledGrid, placedWords: [...placedWords], size };
    }

    // Если разместили все - идеально!
    if (placedWords.length === allWords.length) break;
  }

  return bestResult || {
    grid: Array.from({ length: size }, () => Array(size).fill('Ө')),
    placedWords: [],
    size
  };
};

// Проверка совпадения путей (для проверки найденного слова)
export const pathsMatch = (path1: Coord[], path2: Coord[]): boolean => {
  if (path1.length !== path2.length) return false;
  return path1.every((coord, i) => coord.r === path2[i].r && coord.c === path2[i].c);
};

// Найти слово по пути
export const findWordByPath = (placedWords: PlacedWord[], selectedPath: Coord[]): PlacedWord | undefined => {
  return placedWords.find(pw => pathsMatch(pw.path, selectedPath));
};

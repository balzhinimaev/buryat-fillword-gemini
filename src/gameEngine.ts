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
  placedWords: PlacedWord[];
  size: number;
}

// Соседи: Верх, Вниз, Влево, Вправо (без диагоналей)
const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

// Проверка валидности координат
const isValid = (r: number, c: number, size: number) =>
  r >= 0 && r < size && c >= 0 && c < size;

// DFS для размещения одного слова змейкой (с backtracking внутри слова)
const placeWordDFS = (
  grid: string[][],
  word: string,
  pos: number,
  r: number,
  c: number,
  path: Coord[],
  usedInPath: Set<string>
): boolean => {
  // Слово полностью размещено
  if (pos === word.length) return true;

  // Проверка границ и занятости
  if (!isValid(r, c, grid.length)) return false;
  
  const cellKey = `${r},${c}`;
  if (usedInPath.has(cellKey)) return false;
  if (grid[r][c] !== '') return false;

  // Размещаем букву
  grid[r][c] = word[pos];
  path.push({ r, c });
  usedInPath.add(cellKey);

  // Перемешиваем направления для разнообразия
  const shuffledDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5);

  // Пробуем продолжить в каждом направлении
  for (const { dr, dc } of shuffledDirs) {
    if (placeWordDFS(grid, word, pos + 1, r + dr, c + dc, path, usedInPath)) {
      return true;
    }
  }

  // Backtracking: откат буквы
  grid[r][c] = '';
  path.pop();
  usedInPath.delete(cellKey);

  return false;
};

// Удаление слова с поля
const removeWordFromGrid = (grid: string[][], path: Coord[]): void => {
  for (const { r, c } of path) {
    grid[r][c] = '';
  }
};

// Полный backtracking: размещение всех слов с откатом между словами
const placeAllWordsBacktracking = (
  grid: string[][],
  words: WordData[],
  wordIndex: number,
  placedWords: PlacedWord[],
  startCellsOrder: Coord[][]
): boolean => {
  // Все слова размещены — успех!
  if (wordIndex === words.length) return true;

  const wordObj = words[wordIndex];
  const word = wordObj.bur.toUpperCase();

  // Получаем перемешанный список стартовых позиций для этого слова
  const startCells = startCellsOrder[wordIndex];

  // Перебираем все возможные стартовые позиции
  for (const { r, c } of startCells) {
    if (grid[r][c] !== '') continue;

    const path: Coord[] = [];
    const usedInPath = new Set<string>();

    if (placeWordDFS(grid, word, 0, r, c, path, usedInPath)) {
      placedWords.push({ word: wordObj, path: [...path] });

      if (placeAllWordsBacktracking(grid, words, wordIndex + 1, placedWords, startCellsOrder)) {
        return true;
      }

      placedWords.pop();
      removeWordFromGrid(grid, path);
    }
  }

  return false;
};

// ============================================================================
// ПОДБОР СЛОВ ДЛЯ ТОЧНОГО ЗАПОЛНЕНИЯ СЕТКИ (без шума)
// ============================================================================

/**
 * Подбирает комбинацию слов, сумма букв которых равна targetSum
 * Использует backtracking для поиска подходящей комбинации
 */
const findWordsWithExactSum = (
  words: WordData[],
  targetSum: number,
  currentIndex: number,
  currentSum: number,
  selectedWords: WordData[],
  minWords: number,
  maxWords: number
): WordData[] | null => {
  // Нашли точное совпадение!
  if (currentSum === targetSum && selectedWords.length >= minWords && selectedWords.length <= maxWords) {
    return [...selectedWords];
  }

  // Превысили сумму или закончились слова
  if (currentSum > targetSum || currentIndex >= words.length) {
    return null;
  }

  // Слишком много слов
  if (selectedWords.length >= maxWords) {
    return null;
  }

  // Пробуем взять текущее слово
  const word = words[currentIndex];
  selectedWords.push(word);
  const withWord = findWordsWithExactSum(
    words, targetSum, currentIndex + 1,
    currentSum + word.bur.length, selectedWords,
    minWords, maxWords
  );
  if (withWord) return withWord;
  selectedWords.pop();

  // Пробуем не брать текущее слово
  const withoutWord = findWordsWithExactSum(
    words, targetSum, currentIndex + 1,
    currentSum, selectedWords,
    minWords, maxWords
  );
  if (withoutWord) return withoutWord;

  return null;
};

/**
 * Подбирает слова для точного заполнения сетки заданного размера
 */
export const selectWordsForGrid = (
  allWords: WordData[],
  gridSize: number,
  minWords: number = 3,
  maxWords: number = 15
): WordData[] | null => {
  const targetCells = gridSize * gridSize;
  
  // Сортируем слова по длине (длинные первыми) для лучшего поиска
  const sortedWords = [...allWords].sort((a, b) => b.bur.length - a.bur.length);
  
  // Перемешиваем слова одинаковой длины для разнообразия
  const shuffledWords = sortedWords.sort((a, b) => {
    if (a.bur.length === b.bur.length) return Math.random() - 0.5;
    return b.bur.length - a.bur.length;
  });

  return findWordsWithExactSum(shuffledWords, targetCells, 0, 0, [], minWords, maxWords);
};

/**
 * Быстрый жадный подбор слов (для случаев когда backtracking слишком долгий)
 */
const selectWordsGreedy = (
  allWords: WordData[],
  targetCells: number
): WordData[] => {
  const shuffled = [...allWords].sort(() => Math.random() - 0.5);
  const selected: WordData[] = [];
  let currentSum = 0;

  for (const word of shuffled) {
    if (currentSum + word.bur.length <= targetCells) {
      selected.push(word);
      currentSum += word.bur.length;
    }
    if (currentSum === targetCells) break;
  }

  return selected;
};

// ============================================================================
// ОСНОВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ
// ============================================================================

/**
 * Генерирует уровень с точным заполнением сетки (без шума)
 * @param gridSize - размер сетки (например, 4 для 4x4 = 16 клеток)
 * @param allWords - пул слов для выбора
 * @param exactFill - если true, подбирает слова для 100% заполнения
 */
export const generateSnakeLevel = (
  gridSize: number,
  allWords: WordData[],
  exactFill: boolean = true
): GameState => {
  const targetCells = gridSize * gridSize;

  let wordsToPlace: WordData[];

  if (exactFill) {
    // Подбираем слова для точного заполнения
    const selectedWords = selectWordsForGrid(allWords, gridSize, 2, 12);
    
    if (selectedWords) {
      wordsToPlace = selectedWords;
    } else {
      // Fallback: жадный подбор
      wordsToPlace = selectWordsGreedy(allWords, targetCells);
    }
  } else {
    // Старое поведение: берём все слова
    wordsToPlace = [...allWords];
  }

  // Сортируем: длинные слова первыми
  wordsToPlace = wordsToPlace.sort((a, b) => b.bur.length - a.bur.length);

  const MAX_ATTEMPTS = 20;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
    const placedWords: PlacedWord[] = [];

    // Генерируем перемешанные стартовые позиции
    const startCellsOrder: Coord[][] = wordsToPlace.map(() => {
      const cells: Coord[] = [];
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          cells.push({ r, c });
        }
      }
      return cells.sort(() => Math.random() - 0.5);
    });

    if (placeAllWordsBacktracking(grid, wordsToPlace, 0, placedWords, startCellsOrder)) {
      // Проверяем, что сетка полностью заполнена
      const isEmpty = grid.some(row => row.some(cell => cell === ''));
      
      if (!isEmpty || !exactFill) {
        return { grid, placedWords, size: gridSize };
      }
    }

    // Если не удалось разместить все слова, пробуем другую комбинацию
    if (exactFill && attempt < MAX_ATTEMPTS - 1) {
      const newSelection = selectWordsForGrid(allWords, gridSize, 2, 12);
      if (newSelection) {
        wordsToPlace = newSelection.sort((a, b) => b.bur.length - a.bur.length);
      }
    }
  }

  // Последний fallback: заполняем шумом если не получилось
  return generateWithNoise(gridSize, wordsToPlace);
};

/**
 * Генерация с шумом (fallback)
 */
const generateWithNoise = (gridSize: number, words: WordData[]): GameState => {
  const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯӨҮҺ";
  
  const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
  const placedWords: PlacedWord[] = [];

  const allCells: Coord[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      allCells.push({ r, c });
    }
  }

  for (const wordObj of words) {
    const word = wordObj.bur.toUpperCase();
    const shuffledCells = [...allCells].sort(() => Math.random() - 0.5);

    for (const { r, c } of shuffledCells) {
      if (grid[r][c] !== '') continue;

      const path: Coord[] = [];
      const usedInPath = new Set<string>();

      if (placeWordDFS(grid, word, 0, r, c, path, usedInPath)) {
        placedWords.push({ word: wordObj, path: [...path] });
        break;
      }
    }
  }

  // Заполняем пустоты шумом
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return { grid, placedWords, size: gridSize };
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

// Проверка совпадения путей
export const pathsMatch = (path1: Coord[], path2: Coord[]): boolean => {
  if (path1.length !== path2.length) return false;
  return path1.every((coord, i) => coord.r === path2[i].r && coord.c === path2[i].c);
};

// Найти слово по пути
export const findWordByPath = (placedWords: PlacedWord[], selectedPath: Coord[]): PlacedWord | undefined => {
  return placedWords.find(pw => pathsMatch(pw.path, selectedPath));
};

// Подсчёт общего количества букв в словах
export const getTotalLetters = (words: WordData[]): number => {
  return words.reduce((sum, w) => sum + w.bur.length, 0);
};

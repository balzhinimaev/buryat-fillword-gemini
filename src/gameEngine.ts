// src/gameEngine.ts
import type { WordData, Coord } from './types';

export type { WordData, Coord };

// Путь слова с координатами
export interface WordPath {
  word: WordData;
  path: Coord[];
}

export interface GameState {
  grid: string[][];
  placedWords: WordData[];
  wordPaths: WordPath[]; // Пути всех слов для отслеживания пересечений
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

// Рекурсивная функция попытки уложить слово змейкой
// ВАЖНО: Теперь разрешаем пересечение на ОДИНАКОВЫХ буквах!
const placeWordSnake = (
  grid: string[][],
  word: string,
  currentR: number,
  currentC: number,
  index: number,
  path: Coord[],
  usedInThisWord: Set<string> // Отслеживаем использованные клетки ТЕКУЩИМ словом
): boolean => {
  // Условие выхода: слово полностью размещено
  if (index === word.length) return true;

  // Перемешиваем направления для случайности формы
  const shuffledDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5);

  for (const { dr, dc } of shuffledDirs) {
    const nextR = currentR + dr;
    const nextC = currentC + dc;
    const cellKey = `${nextR}-${nextC}`;

    if (!isValid(nextR, nextC, grid.length)) continue;
    
    // Не используем одну клетку дважды в одном слове
    if (usedInThisWord.has(cellKey)) continue;

    const currentChar = grid[nextR][nextC];
    const neededChar = word[index];

    // Можно ставить если: клетка пустая ИЛИ там уже стоит ТАКАЯ ЖЕ буква
    if (currentChar === '' || currentChar === neededChar) {
      const wasEmpty = currentChar === '';
      
      // Ставим букву (или оставляем существующую)
      grid[nextR][nextC] = neededChar;
      path.push({ r: nextR, c: nextC });
      usedInThisWord.add(cellKey);

      // Рекурсия дальше
      if (placeWordSnake(grid, word, nextR, nextC, index + 1, path, usedInThisWord)) {
        return true;
      }

      // Если тупик — откатываем (Backtracking)
      // Очищаем только если клетка была пустой до нас
      if (wasEmpty) {
        grid[nextR][nextC] = '';
      }
      path.pop();
      usedInThisWord.delete(cellKey);
    }
  }
  return false;
};

export const generateSnakeLevel = (targetSize: number, allWords: WordData[]): GameState => {
  let bestResult: GameState | null = null;
  let maxWordsCount = 0;

  // Делаем 50 попыток генерации, чтобы найти самую плотную упаковку
  for (let attempt = 0; attempt < 50; attempt++) {
    const size = targetSize;
    const grid = Array.from({ length: size }, () => Array(size).fill(''));
    const placedWords: WordData[] = [];
    const wordPaths: WordPath[] = []; // Сохраняем пути для каждого слова
    
    // Сортируем: длинные первыми, их сложнее разместить
    const wordsToPlace = [...allWords].sort((a, b) => b.bur.length - a.bur.length);

    // Создаем список всех клеток и перемешиваем их (стартовые точки)
    const allCells: Coord[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        allCells.push({ r, c });
      }
    }
    allCells.sort(() => Math.random() - 0.5);

    for (const wordObj of wordsToPlace) {
      const word = wordObj.bur.toUpperCase();

      // Сначала пробуем начать с клеток где уже есть нужная буква (для пересечений)
      const cellsWithMatchingLetter = allCells.filter(
        cell => grid[cell.r][cell.c] === word[0]
      );
      const emptyCells = allCells.filter(
        cell => grid[cell.r][cell.c] === ''
      );
      
      // Приоритет: сначала пересечения, потом пустые клетки
      const cellsToTry = [...cellsWithMatchingLetter, ...emptyCells];

      for (const startCell of cellsToTry) {
        const currentChar = grid[startCell.r][startCell.c];
        
        // Можно начать если клетка пустая ИЛИ там нужная буква
        if (currentChar === '' || currentChar === word[0]) {
          const wasEmpty = currentChar === '';
          const usedInThisWord = new Set<string>([`${startCell.r}-${startCell.c}`]);
          
          // Ставим первую букву
          grid[startCell.r][startCell.c] = word[0];
          const path = [{ r: startCell.r, c: startCell.c }];

          // Запускаем змейку для остальных букв
          if (placeWordSnake(grid, word, startCell.r, startCell.c, 1, path, usedInThisWord)) {
            placedWords.push(wordObj);
            wordPaths.push({ word: wordObj, path: [...path] });
            break; // Слово влезло, переходим к следующему слову
          } else {
            // Не влезло, очищаем первую букву только если была пустой
            if (wasEmpty) {
              grid[startCell.r][startCell.c] = '';
            }
          }
        }
      }
    }

    // Если текущая попытка лучше предыдущих (больше слов влезло)
    if (placedWords.length >= maxWordsCount) {
      maxWordsCount = placedWords.length;
      
      // ВАЖНО: Заполняем оставшиеся пустоты случайными буквами
      // Используем копию сетки, чтобы не портить текущую итерацию
      const filledGrid = grid.map(row => [...row]);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (filledGrid[r][c] === '') {
            filledGrid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
          }
        }
      }

      bestResult = { 
        grid: filledGrid, 
        placedWords: [...placedWords], 
        wordPaths: [...wordPaths],
        size 
      };
    }
    
    // Если разместили все слова - идеально, останавливаем перебор
    if (placedWords.length === allWords.length) break;
  }

  // Возврат результата или пустой сетки (safety fallback)
  return bestResult || { 
    grid: Array.from({ length: targetSize }, () => Array(targetSize).fill('Ө')), 
    placedWords: [], 
    wordPaths: [],
    size: targetSize 
  };
};

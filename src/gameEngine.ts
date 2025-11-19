// src/gameEngine.ts

export interface WordData {
  bur: string;
  ru: string;
}

export interface GameState {
  grid: string[][];
  placedWords: WordData[];
  size: number;
}

export type Coord = { r: number; c: number };

// Соседи: Верх, Вниз, Влево, Вправо (без диагоналей)
const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

// Алфавит для "шума" (заполнения пустот)
const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯӨҮҺ";

// Проверка валидности координат
const isValid = (r: number, c: number, size: number) => 
  r >= 0 && r < size && c >= 0 && c < size;

// Рекурсивная функция попытки уложить слово змейкой
const placeWordSnake = (
  grid: string[][],
  word: string,
  currentR: number,
  currentC: number,
  index: number,
  path: Coord[]
): boolean => {
  // Условие выхода: слово полностью размещено
  if (index === word.length) return true;

  // Перемешиваем направления для случайности формы
  const shuffledDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5);

  for (const { dr, dc } of shuffledDirs) {
    const nextR = currentR + dr;
    const nextC = currentC + dc;

    // Проверяем: в границах ли и пустая ли клетка
    if (isValid(nextR, nextC, grid.length) && grid[nextR][nextC] === '') {
      // Ставим букву
      grid[nextR][nextC] = word[index];
      path.push({ r: nextR, c: nextC });

      // Рекурсия дальше
      if (placeWordSnake(grid, word, nextR, nextC, index + 1, path)) {
        return true;
      }

      // Если тупик — откатываем (Backtracking)
      grid[nextR][nextC] = '';
      path.pop();
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

      // Пробуем начать слово с каждой свободной клетки
      for (const startCell of allCells) {
        if (grid[startCell.r][startCell.c] === '') {
          // Ставим первую букву
          grid[startCell.r][startCell.c] = word[0];
          const path = [{ r: startCell.r, c: startCell.c }];

          // Запускаем змейку для остальных букв
          if (placeWordSnake(grid, word, startCell.r, startCell.c, 1, path)) {
            placedWords.push(wordObj);
            break; // Слово влезло, переходим к следующему слову
          } else {
            // Не влезло, очищаем первую букву
            grid[startCell.r][startCell.c] = '';
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

      bestResult = { grid: filledGrid, placedWords: [...placedWords], size };
    }
    
    // Если разместили все слова - идеально, останавливаем перебор
    if (placedWords.length === allWords.length) break;
  }

  // Возврат результата или пустой сетки (safety fallback)
  return bestResult || { 
    grid: Array.from({ length: targetSize }, () => Array(targetSize).fill('Ө')), 
    placedWords: [], 
    size: targetSize 
  };
};
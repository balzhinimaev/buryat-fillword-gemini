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

// ============================================================================
// НОРМАЛИЗАЦИЯ СЛОВ ДЛЯ СЕТКИ
// ============================================================================

/**
 * Нормализуем строку бурятского слова для размещения на сетке:
 * - trim
 * - upper-case
 * - убираем любые пробельные/невидимые разделители внутри слова
 *
 * Важно: уровни кампании должны давать ровный квадрат по числу букв.
 * Поэтому пробелы (и NBSP/ZWSP) не должны влиять на длину.
 */
const normalizeBurForGrid = (s: string): string => {
  const normalized = String(s ?? '')
    .normalize('NFC')
    .trim()
    .toUpperCase();

  // Берём только буквенные символы (и кириллица, и латиница, и т.д.).
  // Это автоматически убирает:
  // - пробелы/разделители (в т.ч. NBSP)
  // - формат-символы (ZWJ/ZWNJ/WORD JOINER/FEFF и др.)
  // - пунктуацию/дефисы и прочий "мусор", который ломает длину
  const parts = normalized.match(/\p{L}+/gu);
  return parts ? parts.join('') : '';
};

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
// Добавили bias на "завитушки": чаще поворачиваем, чем идём прямо.
const placeWordDFS = (
  grid: string[][],
  word: string,
  pos: number,
  r: number,
  c: number,
  path: Coord[],
  usedInPath: Set<string>,
  prevDir: { dr: number; dc: number } | null = null
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

  // Подбираем направления так, чтобы чаще "закручивать" путь:
  // - не ходим назад (backDir) если есть альтернативы
  // - с бОльшим шансом выбираем поворот, а не продолжение по прямой
  const shuffledDirs = (() => {
    const dirs = [...DIRECTIONS];
    if (!prevDir) return dirs.sort(() => Math.random() - 0.5);

    const backDir = { dr: -prevDir.dr, dc: -prevDir.dc };
    const straight = prevDir;

    const isSame = (a: { dr: number; dc: number }, b: { dr: number; dc: number }) => a.dr === b.dr && a.dc === b.dc;
    const turns = dirs.filter(d => !isSame(d, straight) && !isSame(d, backDir)).sort(() => Math.random() - 0.5);
    const preferTurn = Math.random() < 0.7;

    // Строим порядок попыток: повороты, затем прямой ход, затем "назад" (последним)
    const ordered: { dr: number; dc: number }[] = [];
    if (preferTurn) {
      ordered.push(...turns);
      ordered.push(straight);
    } else {
      ordered.push(straight);
      ordered.push(...turns);
    }
    ordered.push(backDir);
    return ordered;
  })();

  // Пробуем продолжить в каждом направлении
  for (const { dr, dc } of shuffledDirs) {
    if (placeWordDFS(grid, word, pos + 1, r + dr, c + dc, path, usedInPath, { dr, dc })) {
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

// ============================================================================
// ГЕНЕРАТОР ДЛЯ КАМПАНИИ (ФИКСИРОВАННЫЕ СЛОВА)
// ============================================================================

type Corner = 'tl' | 'tr' | 'bl' | 'br';
type SnakeAxis = 'row' | 'col';

/**
 * Генерация "змейки" (Гамильтонов путь по всем клеткам) от выбранного угла.
 * Даёт 100% заполнение без дыр и при этом позволяет делать уровень менее предсказуемым
 * (выбирая разные углы/ось).
 */
const generateSnakeCellsFromCorner = (gridSize: number, corner: Corner, axis: SnakeAxis): Coord[] => {
  const cells: Coord[] = [];

  const pushRowSnake = (rowIndex: number, leftToRight: boolean) => {
    if (leftToRight) {
      for (let c = 0; c < gridSize; c++) cells.push({ r: rowIndex, c });
    } else {
      for (let c = gridSize - 1; c >= 0; c--) cells.push({ r: rowIndex, c });
    }
  };

  const pushColSnake = (colIndex: number, topToBottom: boolean) => {
    if (topToBottom) {
      for (let r = 0; r < gridSize; r++) cells.push({ r, c: colIndex });
    } else {
      for (let r = gridSize - 1; r >= 0; r--) cells.push({ r, c: colIndex });
    }
  };

  // Базовая змейка из TL, затем трансформируем координаты под угол/ось
  if (axis === 'row') {
    for (let r = 0; r < gridSize; r++) {
      pushRowSnake(r, r % 2 === 0);
    }
  } else {
    for (let c = 0; c < gridSize; c++) {
      pushColSnake(c, c % 2 === 0);
    }
  }

  // Трансформация под угол: отражаем по вертикали/горизонтали
  const transform = (p: Coord): Coord => {
    const rr = (corner === 'bl' || corner === 'br') ? (gridSize - 1 - p.r) : p.r;
    const cc = (corner === 'tr' || corner === 'br') ? (gridSize - 1 - p.c) : p.c;
    return { r: rr, c: cc };
  };

  return cells.map(transform);
};

/**
 * Генерирует уровень для кампании с ФИКСИРОВАННЫМИ словами
 * Размер сетки вычисляется автоматически как sqrt(суммы букв)
 * @param words - фиксированный список слов уровня
 */
export const generateCampaignLevel = (words: WordData[]): GameState => {
  // Нормализуем слова (убираем пробелы/невидимые разделители) и фильтруем валидные
  const normalizedWords: WordData[] = (words ?? [])
    .map(w => ({
      bur: normalizeBurForGrid(w?.bur ?? ''),
      ru: String(w?.ru ?? '').trim(),
    }))
    .filter(w => w.bur.length >= 2);

  if (normalizedWords.length === 0) {
    return { grid: [[]], placedWords: [], size: 1 };
  }

  // Точное количество букв (без пробелов!)
  const totalLetters = normalizedWords.reduce((sum, w) => sum + w.bur.length, 0);

  // Размер сетки: если сумма — точный квадрат, делаем ровно N×N (N² === totalLetters)
  const exactSqrt = Math.sqrt(totalLetters);
  const isPerfectSquare = Number.isInteger(exactSqrt);
  const gridSize = isPerfectSquare ? exactSqrt : Math.ceil(exactSqrt);

  if (!isPerfectSquare) {
    console.warn(
      `Campaign level: total letters is not a perfect square. Letters: ${totalLetters}, Grid: ${gridSize}x${gridSize}. ` +
      `Consider adjusting campaign words to make total letters = N^2 for clean square levels. ` +
      `Words: ${normalizedWords.map(w => `${w.bur}(${w.bur.length})`).join(', ')}`
    );
  }

  // Хочется "завитушек" и непредсказуемости: кладём каждое слово отдельным путём,
  // не в одну общую цепочку. Это усложняет "угадайку" (следующее слово не начинается
  // автоматически из конца предыдущего).
  //
  // Для идеальных квадратов (N^2) стараемся заполнить всё без шума.
  // Для неидеальных — заполняем оставшиеся клетки шумом.
  const sortedWords = [...normalizedWords].sort((a, b) => b.bur.length - a.bur.length);
  const MAX_ATTEMPTS = 120;

  const allCells: Coord[] = [];
  for (let r = 0; r < gridSize; r++) for (let c = 0; c < gridSize; c++) allCells.push({ r, c });

  const corners: Corner[] = ['tl', 'tr', 'bl', 'br'];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
    const placedWords: PlacedWord[] = [];

    // Выбираем "опорный" угол попытки, но не фиксируем всё строго — это даёт разнообразие.
    const anchorCorner = corners[Math.floor(Math.random() * corners.length)];
    const anchor = (() => {
      switch (anchorCorner) {
        case 'tl': return { r: 0, c: 0 };
        case 'tr': return { r: 0, c: gridSize - 1 };
        case 'bl': return { r: gridSize - 1, c: 0 };
        case 'br': return { r: gridSize - 1, c: gridSize - 1 };
      }
    })();

    // Порядок стартовых клеток для каждого слова:
    // - слегка тянем к углу (для "грамотного" заполнения)
    // - но добавляем рандомизацию, чтобы не было одинаково
    const startCellsOrder: Coord[][] = sortedWords.map((_, idx) => {
      const jitter = (idx === 0 ? 0.15 : 0.35); // первое слово чуть более "структурное"
      return [...allCells].sort((a, b) => {
        const da = Math.abs(a.r - anchor.r) + Math.abs(a.c - anchor.c);
        const db = Math.abs(b.r - anchor.r) + Math.abs(b.c - anchor.c);
        if (da !== db) return da - db;
        return Math.random() - 0.5 + (Math.random() - 0.5) * jitter;
      });
    });

    const ok = placeAllWordsBacktracking(grid, sortedWords, 0, placedWords, startCellsOrder);
    if (!ok) continue;

    // Если нужен идеальный квадрат — проверяем, что не осталось пустот
    const emptyCells = grid.flat().filter(c => c === '').length;
    if (isPerfectSquare) {
      if (emptyCells === 0) return { grid, placedWords, size: gridSize };
      continue;
    }

    // Неидеальный квадрат: докидываем шумом остаток
    if (emptyCells > 0) {
      const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯӨҮҺ";
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (grid[r][c] === '') {
            grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
          }
        }
      }
    }

    // Дополнительно перемешаем порядок words в UI (чтобы подсказка/список не шли в том же порядке)
    const shuffledPlaced = [...placedWords].sort(() => Math.random() - 0.5);
    return { grid, placedWords: shuffledPlaced, size: gridSize };
  }

  // Фолбек: если внезапно не получилось — делаем гарантированное заполнение змейкой,
  // но тоже не всегда одной и той же.
  const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
  const placedWords: PlacedWord[] = [];
  const axes: SnakeAxis[] = ['row', 'col'];
  const chosenCorner = corners[Math.floor(Math.random() * corners.length)];
  const chosenAxis = axes[Math.floor(Math.random() * axes.length)];
  const cells = generateSnakeCellsFromCorner(gridSize, chosenCorner, chosenAxis);

  let cursor = 0;
  for (const w of normalizedWords) {
    const word = w.bur;
    if (cursor + word.length > cells.length) break;
    const path = cells.slice(cursor, cursor + word.length);
    for (let i = 0; i < word.length; i++) {
      const { r, c } = path[i];
      grid[r][c] = word[i];
    }
    placedWords.push({ word: w, path });
    cursor += word.length;
  }

  // Шум в пустоты (если есть)
  const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯӨҮҺ";
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }

  return { grid, placedWords, size: gridSize };
};

// ============================================================================
// БЫСТРЫЙ ГЕНЕРАТОР ДЛЯ СЕРВЕРНЫХ РЕЖИМОВ (Daily, Level Mode)
// ============================================================================

/**
 * Генерирует уровень для серверных режимов (Филлворд дня, уровневый режим).
 *
 * Ключевое отличие от generateSnakeLevel / generateCampaignLevel:
 * — НЕ использует placeAllWordsBacktracking (NP-hard межсловный бэктрекинг)
 * — Каждое слово размещается ОТДЕЛЬНО через DFS (без отката между словами)
 * — Если не удалось — мгновенный fallback на гамильтонову змейку O(n)
 *
 * Гарантированное время: O(attempts × words × gridSize² × 4^maxWordLen)
 * На практике — десятки миллисекунд даже на больших сетках.
 *
 * @param gridSize - размер сетки (из API)
 * @param serverWords - список слов от сервера
 */
export const generateServerLevel = (
  gridSize: number,
  serverWords: WordData[]
): GameState => {
  const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯӨҮҺ";
  const corners: Corner[] = ['tl', 'tr', 'bl', 'br'];
  const axes: SnakeAxis[] = ['row', 'col'];

  // Нормализуем слова
  const normalizedWords: WordData[] = (serverWords ?? [])
    .map(w => ({
      bur: normalizeBurForGrid(w?.bur ?? ''),
      ru: String(w?.ru ?? '').trim(),
    }))
    .filter(w => w.bur.length >= 2);

  if (normalizedWords.length === 0) {
    return { grid: [[]], placedWords: [], size: gridSize || 1 };
  }

  // Сортируем: длинные слова первыми (им труднее найти путь)
  const sortedWords = [...normalizedWords].sort((a, b) => b.bur.length - a.bur.length);

  const allCells: Coord[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      allCells.push({ r, c });
    }
  }

  // ────────────────────────────────────────────────────────────
  // Фаза 1: Красивые «завитушки» — индивидуальный DFS для каждого слова
  // Без межсловного бэктрекинга: если слово не разместилось, пробуем заново
  // ────────────────────────────────────────────────────────────
  const MAX_PRETTY_ATTEMPTS = 3;

  for (let attempt = 0; attempt < MAX_PRETTY_ATTEMPTS; attempt++) {
    const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
    const placedWords: PlacedWord[] = [];
    let allPlaced = true;

    for (const wordObj of sortedWords) {
      const word = wordObj.bur.toUpperCase();
      // Перемешанные стартовые позиции
      const shuffledCells = [...allCells].sort(() => Math.random() - 0.5);
      let placed = false;

      for (const { r, c } of shuffledCells) {
        if (grid[r][c] !== '') continue;

        const path: Coord[] = [];
        const usedInPath = new Set<string>();

        if (placeWordDFS(grid, word, 0, r, c, path, usedInPath)) {
          placedWords.push({ word: wordObj, path: [...path] });
          placed = true;
          break;
        }
      }

      if (!placed) {
        allPlaced = false;
        break;
      }
    }

    if (allPlaced) {
      // Заполняем пустые клетки шумом
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (grid[r][c] === '') {
            grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
          }
        }
      }
      // Перемешиваем порядок слов в UI
      const shuffledPlaced = [...placedWords].sort(() => Math.random() - 0.5);
      return { grid, placedWords: shuffledPlaced, size: gridSize };
    }
  }

  // ────────────────────────────────────────────────────────────
  // Фаза 2 (fallback): Гамильтонова змейка — гарантированно O(n)
  // Слова кладутся вдоль зигзагообразного пути по всей сетке
  // ────────────────────────────────────────────────────────────
  console.warn(
    `[generateServerLevel] DFS не смог разместить все слова за ${MAX_PRETTY_ATTEMPTS} попыток. ` +
    `Используем гамильтонову змейку. Слова: ${normalizedWords.map(w => `${w.bur}(${w.bur.length})`).join(', ')}, ` +
    `сетка: ${gridSize}×${gridSize} = ${gridSize * gridSize} клеток`
  );

  const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
  const placedWords: PlacedWord[] = [];
  const chosenCorner = corners[Math.floor(Math.random() * corners.length)];
  const chosenAxis = axes[Math.floor(Math.random() * axes.length)];
  const cells = generateSnakeCellsFromCorner(gridSize, chosenCorner, chosenAxis);

  let cursor = 0;
  for (const w of normalizedWords) {
    const word = w.bur;
    if (cursor + word.length > cells.length) break;
    const path = cells.slice(cursor, cursor + word.length);
    for (let i = 0; i < word.length; i++) {
      grid[path[i].r][path[i].c] = word[i];
    }
    placedWords.push({ word: w, path });
    cursor += word.length;
  }

  // Шум в пустоты
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return { grid, placedWords, size: gridSize };
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

// Палиндром: одинаково читается слева-направо и справа-налево (после нормализации)
export const isPalindromeWord = (bur: string): boolean => {
  const s = normalizeBurForGrid(bur);
  if (s.length < 2) return false;
  for (let i = 0, j = s.length - 1; i < j; i++, j--) {
    if (s[i] !== s[j]) return false;
  }
  return true;
};

// Найти слово по пути
// Обобщённая проверка: принимает любой порядок обхода тех же клеток,
// если прочитанная последовательность букв даёт правильное слово.
// Это покрывает:
//   - полные палиндромы (обратный путь)
//   - палиндромные окончания/начала (например, «ДУУЛАХА» → суффикс «АХА»)
//   - любые перестановки в участках с одинаковыми буквами
export const findWordByPath = (placedWords: PlacedWord[], selectedPath: Coord[]): PlacedWord | undefined => {
  for (const pw of placedWords) {
    // Быстрая проверка: точное совпадение путей (наиболее частый случай)
    if (pathsMatch(pw.path, selectedPath)) return pw;

    // Длины путей должны совпадать
    if (pw.path.length !== selectedPath.length) continue;

    // Строим карту «клетка → буква» из размещённого слова
    const wordUpper = pw.word.bur.toUpperCase();
    const cellToLetter = new Map<string, string>();
    for (let i = 0; i < pw.path.length; i++) {
      cellToLetter.set(`${pw.path[i].r},${pw.path[i].c}`, wordUpper[i]);
    }

    // Проверяем: все выбранные клетки принадлежат этому слову
    // и прочитанное по ним даёт то же самое слово
    let match = true;
    let spelled = '';
    for (const c of selectedPath) {
      const letter = cellToLetter.get(`${c.r},${c.c}`);
      if (letter === undefined) { match = false; break; }
      spelled += letter;
    }

    if (match && spelled === wordUpper) {
      // Логируем альтернативный путь: определяем, какая часть была обведена иначе
      const placedKeys = pw.path.map(p => `${p.r},${p.c}`);
      const selectedKeys = selectedPath.map(p => `${p.r},${p.c}`);

      // Находим первый индекс, где пути расходятся
      let divergeIdx = 0;
      while (divergeIdx < placedKeys.length && placedKeys[divergeIdx] === selectedKeys[divergeIdx]) {
        divergeIdx++;
      }
      // И последний (с конца)
      let divergeEnd = placedKeys.length - 1;
      while (divergeEnd > divergeIdx && placedKeys[divergeEnd] === selectedKeys[divergeEnd]) {
        divergeEnd--;
      }

      const altSegment = wordUpper.slice(divergeIdx, divergeEnd + 1);
      const isFullReverse = divergeIdx === 0 && divergeEnd === placedKeys.length - 1;

      console.log(
        `[findWordByPath] Альтернативный путь принят для «${wordUpper}»:`,
        isFullReverse
          ? `полный палиндром (обратный обход)`
          : `палиндромный участок «${altSegment}» (позиции ${divergeIdx}–${divergeEnd})`,
        `\n  Размещённый путь: [${placedKeys.join(' → ')}]`,
        `\n  Выбранный путь:   [${selectedKeys.join(' → ')}]`
      );

      return pw;
    }
  }
  return undefined;
};

// Подсчёт общего количества букв в словах
export const getTotalLetters = (words: WordData[]): number => {
  return words.reduce((sum, w) => sum + w.bur.length, 0);
};

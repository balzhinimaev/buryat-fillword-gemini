// src/data/words.ts
import type { Category, WordData } from '../types';

// Базовые слова по категориям
const familyWords: WordData[] = [
  { bur: "ЭЖЫ", ru: "Мама" },
  { bur: "АБА", ru: "Папа" },
  { bur: "АХА", ru: "Старший брат" },
  { bur: "ДҮҮ", ru: "Младший" },
  { bur: "ЭГЭ", ru: "Сестра" },
  { bur: "ЭБИИ", ru: "Бабушка" },
  { bur: "ТААБАЙ", ru: "Дедушка" },
  { bur: "ХҮҮ", ru: "Сын" },
  { bur: "БАСАГАН", ru: "Дочь" },
  { bur: "АЙЛ", ru: "Семья" },
];

const greetingsWords: WordData[] = [
  { bur: "САЙН", ru: "Привет" },
  { bur: "БАЯРТАЙ", ru: "До свидания" },
  { bur: "ҺАЙН", ru: "Хорошо" },
  { bur: "МУУ", ru: "Плохо" },
  { bur: "ТИИМ", ru: "Да" },
  { bur: "ҮГЫ", ru: "Нет" },
  { bur: "БАЯРЛАА", ru: "Спасибо" },
  { bur: "ЗҮГӨӨР", ru: "Пожалуйста" },
];

const natureWords: WordData[] = [
  { bur: "НАРАН", ru: "Солнце" },
  { bur: "ҺАРА", ru: "Луна" },
  { bur: "ОДОН", ru: "Звезда" },
  { bur: "УҺАН", ru: "Вода" },
  { bur: "ГАЛ", ru: "Огонь" },
  { bur: "ШУЛУУН", ru: "Камень" },
  { bur: "МОДОН", ru: "Дерево" },
  { bur: "СЭСЭГ", ru: "Цветок" },
  { bur: "ТЭНГЭРИ", ru: "Небо" },
  { bur: "ГАЗАР", ru: "Земля" },
];

const animalsWords: WordData[] = [
  { bur: "МОРИН", ru: "Лошадь" },
  { bur: "ҮХЭР", ru: "Корова" },
  { bur: "ХОНИН", ru: "Овца" },
  { bur: "НОХОЙ", ru: "Собака" },
  { bur: "МИИСГЭЙ", ru: "Кошка" },
  { bur: "ШУБУУН", ru: "Птица" },
  { bur: "ЗАГАҺАН", ru: "Рыба" },
  { bur: "БААБГАЙ", ru: "Медведь" },
  { bur: "ШОНО", ru: "Волк" },
  { bur: "ҮНЭГЭН", ru: "Лиса" },
];

const numbersWords: WordData[] = [
  { bur: "НЭГЭН", ru: "Один" },
  { bur: "ХОЁР", ru: "Два" },
  { bur: "ГУРБАН", ru: "Три" },
  { bur: "ДҮРБЭН", ru: "Четыре" },
  { bur: "ТАБАН", ru: "Пять" },
  { bur: "ЗУРГААН", ru: "Шесть" },
  { bur: "ДОЛООН", ru: "Семь" },
  { bur: "НАЙМАН", ru: "Восемь" },
  { bur: "ЮҺЭН", ru: "Девять" },
  { bur: "АРБАН", ru: "Десять" },
];

const bodyWords: WordData[] = [
  { bur: "ТОЛГОЙ", ru: "Голова" },
  { bur: "НЮДЭН", ru: "Глаз" },
  { bur: "ХАМАР", ru: "Нос" },
  { bur: "ШЭХЭН", ru: "Ухо" },
  { bur: "АМА", ru: "Рот" },
  { bur: "ГАР", ru: "Рука" },
  { bur: "ХҮЛЭ", ru: "Нога" },
  { bur: "ЗҮРХЭН", ru: "Сердце" },
];

const foodWords: WordData[] = [
  { bur: "ЭДЕЭН", ru: "Еда" },
  { bur: "МЯХАН", ru: "Мясо" },
  { bur: "ҺҮНЭ", ru: "Молоко" },
  { bur: "САЙ", ru: "Чай" },
  { bur: "ХИЛЭЭМЭН", ru: "Хлеб" },
  { bur: "БУДАА", ru: "Рис" },
  { bur: "ТАРАГ", ru: "Простокваша" },
  { bur: "БООБО", ru: "Буузы" },
];

const homeWords: WordData[] = [
  { bur: "ГЭР", ru: "Дом/Юрта" },
  { bur: "ҮҮДЭН", ru: "Дверь" },
  { bur: "СОНХО", ru: "Окно" },
  { bur: "ОРОН", ru: "Кровать" },
  { bur: "ШЭРЭЭ", ru: "Стол" },
  { bur: "ҺАНДАЛИ", ru: "Стул" },
  { bur: "НОМ", ru: "Книга" },
];

const timeWords: WordData[] = [
  { bur: "ҮДЭР", ru: "День" },
  { bur: "ҺҮНИ", ru: "Ночь" },
  { bur: "ҮГЛӨӨ", ru: "Утро" },
  { bur: "ҮДЭШЭ", ru: "Вечер" },
  { bur: "МҮНӨӨ", ru: "Сейчас" },
  { bur: "ҮСЭГЭЛДЭР", ru: "Вчера" },
  { bur: "МАРГААША", ru: "Завтра" },
  { bur: "ЖЭЛ", ru: "Год" },
];

const colorsWords: WordData[] = [
  { bur: "УЛААН", ru: "Красный" },
  { bur: "ХҮХЭ", ru: "Синий" },
  { bur: "НОГООН", ru: "Зелёный" },
  { bur: "ШАРА", ru: "Жёлтый" },
  { bur: "САГААН", ru: "Белый" },
  { bur: "ХАРА", ru: "Чёрный" },
  { bur: "БОРО", ru: "Серый" },
];

const placesWords: WordData[] = [
  { bur: "ҺУРГУУЛИ", ru: "Школа" },
  { bur: "ХОТО", ru: "Город" },
  { bur: "ТОСХОН", ru: "Деревня" },
  { bur: "ДАЛАЙ", ru: "Море" },
  { bur: "УУЛА", ru: "Гора" },
  { bur: "ОЙ", ru: "Лес" },
  { bur: "ГОЛ", ru: "Река" },
  { bur: "ЗАМА", ru: "Дорога" },
];

const verbsWords: WordData[] = [
  { bur: "ЯБАХА", ru: "Идти" },
  { bur: "ЭДИХЭ", ru: "Есть" },
  { bur: "УУХА", ru: "Пить" },
  { bur: "УНТАХА", ru: "Спать" },
  { bur: "ҮЗЭХЭ", ru: "Видеть" },
  { bur: "ДУУЛАХА", ru: "Слышать" },
  { bur: "ХЭЛЭХЭ", ru: "Говорить" },
  { bur: "ҺУРАХА", ru: "Учиться" },
];

// Экспорт категорий
export const categories: Category[] = [
  {
    id: 'greetings',
    name: 'Приветствия',
    emoji: '👋',
    description: 'Базовые слова для общения',
    words: greetingsWords,
    difficulty: 'easy',
    gridSize: 5,
    unlockRequirement: 0,
  },
  {
    id: 'family',
    name: 'Семья',
    emoji: '👨‍👩‍👧‍👦',
    description: 'Члены семьи',
    words: familyWords,
    difficulty: 'easy',
    gridSize: 5,
    unlockRequirement: 0,
  },
  {
    id: 'numbers',
    name: 'Числа',
    emoji: '🔢',
    description: 'Счёт от 1 до 10',
    words: numbersWords,
    difficulty: 'easy',
    gridSize: 6,
    unlockRequirement: 3,
  },
  {
    id: 'colors',
    name: 'Цвета',
    emoji: '🎨',
    description: 'Основные цвета',
    words: colorsWords,
    difficulty: 'easy',
    gridSize: 5,
    unlockRequirement: 5,
  },
  {
    id: 'animals',
    name: 'Животные',
    emoji: '🐴',
    description: 'Домашние и дикие животные',
    words: animalsWords,
    difficulty: 'medium',
    gridSize: 6,
    unlockRequirement: 8,
  },
  {
    id: 'nature',
    name: 'Природа',
    emoji: '🌿',
    description: 'Мир вокруг нас',
    words: natureWords,
    difficulty: 'medium',
    gridSize: 6,
    unlockRequirement: 12,
  },
  {
    id: 'body',
    name: 'Тело',
    emoji: '🫀',
    description: 'Части тела человека',
    words: bodyWords,
    difficulty: 'medium',
    gridSize: 6,
    unlockRequirement: 15,
  },
  {
    id: 'food',
    name: 'Еда',
    emoji: '🥘',
    description: 'Традиционная кухня',
    words: foodWords,
    difficulty: 'medium',
    gridSize: 6,
    unlockRequirement: 18,
  },
  {
    id: 'home',
    name: 'Дом',
    emoji: '🏠',
    description: 'Предметы в доме',
    words: homeWords,
    difficulty: 'medium',
    gridSize: 5,
    unlockRequirement: 21,
  },
  {
    id: 'time',
    name: 'Время',
    emoji: '⏰',
    description: 'Время суток и дни',
    words: timeWords,
    difficulty: 'hard',
    gridSize: 7,
    unlockRequirement: 24,
  },
  {
    id: 'places',
    name: 'Места',
    emoji: '🗺️',
    description: 'География и локации',
    words: placesWords,
    difficulty: 'hard',
    gridSize: 7,
    unlockRequirement: 27,
  },
  {
    id: 'verbs',
    name: 'Глаголы',
    emoji: '🏃',
    description: 'Действия',
    words: verbsWords,
    difficulty: 'hard',
    gridSize: 7,
    unlockRequirement: 30,
  },
];

export const getCategoryById = (id: string): Category | undefined => {
  return categories.find(c => c.id === id);
};

export const getAllWords = (): WordData[] => {
  return categories.flatMap(c => c.words);
};

// Генерация слов для уровневого режима
// Количество слов и сложность растёт с уровнем
export const getWordsForEndlessLevel = (level: number): { words: WordData[]; gridSize: number } => {
  const allWords = getAllWords();
  
  // Сложность растёт с уровнем
  // Уровни 1-50: 4-6 слов, сетка 5x5
  // Уровни 51-100: 5-7 слов, сетка 6x6
  // Уровни 101-150: 6-8 слов, сетка 7x7
  // Уровни 151-200: 7-9 слов, сетка 7x7
  
  let wordCount: number;
  let gridSize: number;
  
  if (level <= 50) {
    wordCount = 4 + Math.floor(level / 17); // 4-6 слов
    gridSize = 5;
  } else if (level <= 100) {
    wordCount = 5 + Math.floor((level - 50) / 17); // 5-7 слов
    gridSize = 6;
  } else if (level <= 150) {
    wordCount = 6 + Math.floor((level - 100) / 25); // 6-8 слов
    gridSize = 7;
  } else {
    wordCount = 7 + Math.floor((level - 150) / 25); // 7-9 слов
    gridSize = 7;
  }
  
  // Используем уровень как seed для псевдо-рандома
  // Это гарантирует, что один и тот же уровень всегда даёт одни и те же слова
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };
  
  // Перемешиваем слова с сидом на основе уровня
  const shuffled = [...allWords].sort((a, b) => {
    const seedA = level * 1000 + allWords.indexOf(a);
    const seedB = level * 1000 + allWords.indexOf(b);
    return seededRandom(seedA) - seededRandom(seedB);
  });
  
  // Берём нужное количество слов, фильтруя слишком длинные для сетки
  const maxWordLength = gridSize + 1;
  const selectedWords = shuffled
    .filter(w => w.bur.length <= maxWordLength && w.bur.length >= 2)
    .slice(0, wordCount);
  
  return { words: selectedWords, gridSize };
};


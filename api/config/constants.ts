// api/config/constants.ts
// Константы и конфигурация для API

// ============================================================================
// ВЕРИФИКАЦИЯ СЛОВ
// ============================================================================

export const VERIFICATION = {
  // Сколько голосов нужно для автоматической верификации
  MIN_UPVOTES_TO_VERIFY: 3,
  
  // Сколько голосов против для автоматического отклонения
  MIN_DOWNVOTES_TO_REJECT: 3,
  
  // Минимальный скор доверия для участия в верификации
  MIN_TRUST_SCORE_TO_VOTE: 20,
  
  // Бонус к trust score за правильную верификацию
  TRUST_SCORE_BONUS_CORRECT: 2,
  
  // Штраф к trust score за неправильную верификацию
  TRUST_SCORE_PENALTY_WRONG: 5,
  
  // Вес голоса trusted пользователя
  TRUSTED_VOTE_WEIGHT: 2,
  
  // Вес голоса модератора
  MODERATOR_VOTE_WEIGHT: 5,
};

// ============================================================================
// ЛИМИТЫ
// ============================================================================

export const LIMITS = {
  // Максимум слов от одного пользователя в день
  MAX_WORDS_PER_DAY: 50,
  
  // Максимум голосов от одного пользователя в день
  MAX_VOTES_PER_DAY: 100,
  
  // Максимум жалоб от одного пользователя в день
  MAX_REPORTS_PER_DAY: 10,
  
  // Минимальная длина слова
  MIN_WORD_LENGTH: 2,
  
  // Максимальная длина слова
  MAX_WORD_LENGTH: 30,
  
  // Максимальная длина перевода
  MAX_TRANSLATION_LENGTH: 100,
  
  // Максимальная длина примера
  MAX_EXAMPLE_LENGTH: 500,
};

// ============================================================================
// РОЛИ И РАЗРЕШЕНИЯ
// ============================================================================

export const ROLES = {
  user: {
    canAddWords: true,
    canVote: true,
    canReport: true,
    canModerate: false,
    canBan: false,
    canExport: false,
    canManageCategories: false,
  },
  trusted: {
    canAddWords: true,
    canVote: true,
    canReport: true,
    canModerate: false,
    canBan: false,
    canExport: true,
    canManageCategories: false,
    voteWeight: 2,
  },
  moderator: {
    canAddWords: true,
    canVote: true,
    canReport: true,
    canModerate: true,
    canBan: false,
    canExport: true,
    canManageCategories: false,
    voteWeight: 5,
    canVerifyInstantly: true,
  },
  admin: {
    canAddWords: true,
    canVote: true,
    canReport: true,
    canModerate: true,
    canBan: true,
    canExport: true,
    canManageCategories: true,
    voteWeight: 10,
    canVerifyInstantly: true,
  },
};

// ============================================================================
// КАТЕГОРИИ (дефолтные)
// ============================================================================

export const DEFAULT_CATEGORIES = [
  { id: 'greetings', name: 'Приветствия', nameBur: 'Мэндэшэлгэ', emoji: '👋', difficulty: 'easy', gridSize: 5, order: 1 },
  { id: 'family', name: 'Семья', nameBur: 'Гэр бүлэ', emoji: '👨‍👩‍👧‍👦', difficulty: 'easy', gridSize: 5, order: 2 },
  { id: 'numbers', name: 'Числа', nameBur: 'Тоо', emoji: '🔢', difficulty: 'easy', gridSize: 6, order: 3 },
  { id: 'colors', name: 'Цвета', nameBur: 'Үнгэ', emoji: '🎨', difficulty: 'easy', gridSize: 5, order: 4 },
  { id: 'animals', name: 'Животные', nameBur: 'Амитад', emoji: '🐴', difficulty: 'medium', gridSize: 6, order: 5 },
  { id: 'nature', name: 'Природа', nameBur: 'Байгаали', emoji: '🌿', difficulty: 'medium', gridSize: 6, order: 6 },
  { id: 'body', name: 'Тело', nameBur: 'Бэе', emoji: '🫀', difficulty: 'medium', gridSize: 6, order: 7 },
  { id: 'food', name: 'Еда', nameBur: 'Эдеэн', emoji: '🥘', difficulty: 'medium', gridSize: 6, order: 8 },
  { id: 'home', name: 'Дом', nameBur: 'Гэр', emoji: '🏠', difficulty: 'medium', gridSize: 5, order: 9 },
  { id: 'time', name: 'Время', nameBur: 'Саг', emoji: '⏰', difficulty: 'hard', gridSize: 7, order: 10 },
  { id: 'places', name: 'Места', nameBur: 'Газар', emoji: '🗺️', difficulty: 'hard', gridSize: 7, order: 11 },
  { id: 'verbs', name: 'Глаголы', nameBur: 'Үйлэ үгэ', emoji: '🏃', difficulty: 'hard', gridSize: 7, order: 12 },
  { id: 'adjectives', name: 'Прилагательные', nameBur: 'Тэмдэгэй нэрэ', emoji: '✨', difficulty: 'hard', gridSize: 7, order: 13 },
  { id: 'other', name: 'Другое', nameBur: 'Бусад', emoji: '📝', difficulty: 'medium', gridSize: 6, order: 99 },
];

// ============================================================================
// БУРЯТСКИЙ АЛФАВИТ
// ============================================================================

export const BURYAT_ALPHABET = {
  // Стандартные русские буквы + бурятские
  letters: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯҮҺӨ',
  
  // Специальные бурятские буквы
  special: ['Ү', 'Һ', 'Ө'],
  
  // Буквы, которых нет в бурятском (для валидации)
  excluded: ['Ф', 'Ц', 'Ч', 'Щ', 'Ъ', 'Ь'],  // Редко используются
  
  // Частотность букв (для генерации филвордов)
  frequency: {
    'А': 12, 'Б': 3, 'В': 2, 'Г': 4, 'Д': 4, 'Е': 8, 'Ё': 1, 
    'Ж': 2, 'З': 3, 'И': 6, 'Й': 2, 'К': 1, 'Л': 5, 'М': 4, 
    'Н': 8, 'О': 7, 'П': 1, 'Р': 5, 'С': 4, 'Т': 4, 'У': 5, 
    'Х': 4, 'Ш': 2, 'Ы': 3, 'Э': 4, 'Ю': 1, 'Я': 3,
    'Ү': 3, 'Һ': 3, 'Ө': 2,
  },
};

// ============================================================================
// ПРИЧИНЫ ОТКЛОНЕНИЯ
// ============================================================================

export const REJECTION_REASONS = {
  incorrect_translation: {
    ru: 'Неправильный перевод',
    bur: 'Буруу оршуулга',
  },
  spelling_error: {
    ru: 'Орфографическая ошибка',
    bur: 'Бэшэгэй алдуу',
  },
  not_buryat: {
    ru: 'Не бурятское слово',
    bur: 'Буряад үгэ бэшэ',
  },
  duplicate: {
    ru: 'Слово уже существует',
    bur: 'Үгэ бии',
  },
  inappropriate: {
    ru: 'Неприемлемое содержание',
    bur: 'Тааруу бэшэ',
  },
  other: {
    ru: 'Другая причина',
    bur: 'Ондоо шалтагаан',
  },
};

// ============================================================================
// API ОТВЕТЫ
// ============================================================================

export const API_MESSAGES = {
  // Успех
  WORD_CREATED: 'Слово успешно добавлено',
  WORD_VOTED: 'Голос учтён',
  WORD_VERIFIED: 'Слово верифицировано',
  WORD_REJECTED: 'Слово отклонено',
  
  // Ошибки
  WORD_EXISTS: 'Это слово уже есть в базе',
  WORD_NOT_FOUND: 'Слово не найдено',
  ALREADY_VOTED: 'Вы уже голосовали за это слово',
  CANNOT_VOTE_OWN: 'Нельзя голосовать за своё слово',
  RATE_LIMIT: 'Превышен лимит запросов',
  INVALID_WORD: 'Некорректное слово',
  BANNED: 'Ваш аккаунт заблокирован',
  LOW_TRUST: 'Недостаточный уровень доверия',
};


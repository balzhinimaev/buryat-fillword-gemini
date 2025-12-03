// api/models/index.ts
// Mongoose модели для API бурятского филворда
// База данных: MongoDB

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// 1. CONTRIBUTOR (Контрибьютор / Участник)
// ============================================================================

export interface IContributor extends Document {
  // Идентификация
  name: string;                    // Отображаемое имя
  telegramId?: number;             // Telegram user ID (для авторизации)
  telegramUsername?: string;       // @username в Telegram
  
  // Статистика вклада
  stats: {
    wordsAdded: number;            // Сколько слов добавил
    wordsVerified: number;         // Сколько слов проверил (проголосовал)
    wordsApproved: number;         // Сколько его слов прошли верификацию
    wordsRejected: number;         // Сколько его слов отклонено
    verificationAccuracy: number;  // Точность верификации (0-100%)
  };
  
  // Роль и доверие
  role: 'user' | 'trusted' | 'moderator' | 'admin';
  trustScore: number;              // Уровень доверия (0-100), влияет на вес голоса
  isBanned: boolean;               // Забанен ли
  banReason?: string;              // Причина бана
  
  // Метаданные
  deviceFingerprint?: string;      // Для предотвращения мультиаккаунтов
  lastIp?: string;                 // Последний IP (хешированный)
  locale?: string;                 // Язык интерфейса (ru/bur)
  
  // Временные метки
  createdAt: Date;
  lastActiveAt: Date;
  
  // Виртуальные поля (вычисляемые)
  totalContributions?: number;
}

const ContributorSchema = new Schema<IContributor>({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: 2,
    maxlength: 50 
  },
  telegramId: { 
    type: Number, 
    unique: true, 
    sparse: true,  // Позволяет null + unique
    index: true 
  },
  telegramUsername: { 
    type: String, 
    trim: true,
    lowercase: true 
  },
  
  stats: {
    wordsAdded: { type: Number, default: 0 },
    wordsVerified: { type: Number, default: 0 },
    wordsApproved: { type: Number, default: 0 },
    wordsRejected: { type: Number, default: 0 },
    verificationAccuracy: { type: Number, default: 50, min: 0, max: 100 },
  },
  
  role: { 
    type: String, 
    enum: ['user', 'trusted', 'moderator', 'admin'],
    default: 'user' 
  },
  trustScore: { type: Number, default: 50, min: 0, max: 100 },
  isBanned: { type: Boolean, default: false },
  banReason: String,
  
  deviceFingerprint: String,
  lastIp: String,
  locale: { type: String, default: 'ru' },
  
  lastActiveAt: { type: Date, default: Date.now },
}, {
  timestamps: true,  // Автоматически добавляет createdAt и updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Виртуальное поле: общий вклад
ContributorSchema.virtual('totalContributions').get(function() {
  return this.stats.wordsAdded + this.stats.wordsVerified;
});

// Индексы для быстрого поиска
ContributorSchema.index({ 'stats.wordsAdded': -1 });  // Для рейтинга
ContributorSchema.index({ trustScore: -1 });
ContributorSchema.index({ name: 'text' });  // Текстовый поиск


// ============================================================================
// 2. WORD (Слово)
// ============================================================================

export interface IWord extends Document {
  // Основные данные слова
  bur: string;                     // Бурятское слово (в верхнем регистре)
  ru: string;                      // Русский перевод
  categoryId: string;              // ID категории (greetings, family, etc.)
  
  // Дополнительная информация
  example?: string;                // Пример использования
  pronunciation?: string;          // Произношение (транскрипция)
  audioUrl?: string;               // URL аудио произношения
  imageUrl?: string;               // URL картинки-иллюстрации
  synonyms?: string[];             // Синонимы на бурятском
  antonyms?: string[];             // Антонимы
  dialect?: string;                // Диалект (западный, восточный, и т.д.)
  
  // Грамматика
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'numeral' | 'other';
  grammaticalInfo?: string;        // Дополнительная грамматическая информация
  
  // Контрибуция
  contributor: {
    id: Schema.Types.ObjectId;     // Ссылка на Contributor
    name: string;                  // Денормализованное имя (для быстрого отображения)
  };
  
  // Статус и верификация
  status: 'pending' | 'verified' | 'rejected' | 'archived';
  verificationScore: number;       // Сумма голосов (положительные минус отрицательные)
  verifiedAt?: Date;               // Когда было верифицировано
  verifiedBy?: Schema.Types.ObjectId;  // Кто окончательно одобрил (модератор)
  
  // Голоса
  upvotes: Schema.Types.ObjectId[];    // Кто подтвердил
  downvotes: Schema.Types.ObjectId[];  // Кто отклонил
  
  // Модерация
  moderatorNotes?: string;         // Заметки модератора
  editHistory?: {
    editedAt: Date;
    editedBy: Schema.Types.ObjectId;
    changes: Record<string, { old: string; new: string }>;
  }[];
  
  // Использование в игре
  isActiveInGame: boolean;         // Используется ли в филвордах
  usageCount: number;              // Сколько раз появилось в играх
  successRate: number;             // Процент успешного нахождения игроками
  
  // Сложность (автоматически вычисляемая)
  difficulty: number;              // 1-10 на основе длины и редкости букв
  
  // Временные метки
  createdAt: Date;
  updatedAt: Date;
}

const WordSchema = new Schema<IWord>({
  bur: { 
    type: String, 
    required: true, 
    trim: true,
    uppercase: true,
    minlength: 2,
    maxlength: 30,
    index: true,
  },
  ru: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: 1,
    maxlength: 100,
  },
  categoryId: { 
    type: String, 
    required: true,
    index: true,
    enum: [
      'greetings', 'family', 'numbers', 'colors', 'animals', 
      'nature', 'body', 'food', 'home', 'time', 'places', 
      'verbs', 'adjectives', 'other'
    ],
  },
  
  example: { type: String, maxlength: 500 },
  pronunciation: String,
  audioUrl: String,
  imageUrl: String,
  synonyms: [String],
  antonyms: [String],
  dialect: { 
    type: String, 
    enum: ['standard', 'western', 'eastern', 'southern', 'other'] 
  },
  
  partOfSpeech: { 
    type: String, 
    enum: ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'numeral', 'other'] 
  },
  grammaticalInfo: String,
  
  contributor: {
    id: { type: Schema.Types.ObjectId, ref: 'Contributor', required: true },
    name: { type: String, required: true },
  },
  
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected', 'archived'],
    default: 'pending',
    index: true,
  },
  verificationScore: { type: Number, default: 0 },
  verifiedAt: Date,
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'Contributor' },
  
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'Contributor' }],
  downvotes: [{ type: Schema.Types.ObjectId, ref: 'Contributor' }],
  
  moderatorNotes: String,
  editHistory: [{
    editedAt: { type: Date, default: Date.now },
    editedBy: { type: Schema.Types.ObjectId, ref: 'Contributor' },
    changes: Schema.Types.Mixed,
  }],
  
  isActiveInGame: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
  successRate: { type: Number, default: 0, min: 0, max: 100 },
  
  difficulty: { type: Number, default: 5, min: 1, max: 10 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Уникальный индекс: одно бурятское слово = одна запись
WordSchema.index({ bur: 1 }, { unique: true });

// Составной индекс для фильтрации
WordSchema.index({ status: 1, categoryId: 1, createdAt: -1 });

// Текстовый поиск по бурятскому и русскому
WordSchema.index({ bur: 'text', ru: 'text' });

// Middleware: автоматический расчёт сложности перед сохранением
WordSchema.pre('save', function(next) {
  if (this.isModified('bur')) {
    // Сложность на основе длины и редких букв
    const rareBuryatLetters = ['Ү', 'Һ', 'Ө'];
    let difficulty = Math.min(this.bur.length, 7);
    
    for (const letter of rareBuryatLetters) {
      if (this.bur.includes(letter)) {
        difficulty += 1;
      }
    }
    
    this.difficulty = Math.min(difficulty, 10);
  }
  next();
});


// ============================================================================
// 3. VOTE (Голос за слово) - отдельная коллекция для детальной аналитики
// ============================================================================

export interface IVote extends Document {
  word: Schema.Types.ObjectId;          // Ссылка на слово
  contributor: Schema.Types.ObjectId;   // Кто голосовал
  type: 'upvote' | 'downvote';          // Тип голоса
  reason?: string;                      // Причина (особенно для downvote)
  createdAt: Date;
}

const VoteSchema = new Schema<IVote>({
  word: { 
    type: Schema.Types.ObjectId, 
    ref: 'Word', 
    required: true,
    index: true,
  },
  contributor: { 
    type: Schema.Types.ObjectId, 
    ref: 'Contributor', 
    required: true,
    index: true,
  },
  type: { 
    type: String, 
    enum: ['upvote', 'downvote'], 
    required: true 
  },
  reason: { 
    type: String, 
    maxlength: 200,
    // Причины отклонения
    enum: [
      'incorrect_translation',    // Неправильный перевод
      'spelling_error',          // Орфографическая ошибка
      'not_buryat',              // Не бурятское слово
      'duplicate',               // Дубликат
      'inappropriate',           // Неприемлемое содержание
      'other',                   // Другое
      null
    ],
  },
}, {
  timestamps: true,
});

// Уникальный индекс: один голос от пользователя на слово
VoteSchema.index({ word: 1, contributor: 1 }, { unique: true });


// ============================================================================
// 4. CATEGORY (Категория) - для динамического управления категориями
// ============================================================================

export interface ICategory extends Document {
  id: string;                      // Уникальный slug (greetings, family, etc.)
  name: string;                    // Название на русском
  nameBur?: string;                // Название на бурятском
  emoji: string;                   // Эмодзи
  description: string;             // Описание
  
  // Настройки для игры
  difficulty: 'easy' | 'medium' | 'hard';
  gridSize: number;                // Размер сетки филворда
  unlockRequirement: number;       // Сколько звёзд нужно
  
  // Статистика
  wordCount: number;               // Количество верифицированных слов
  isActive: boolean;               // Активна ли категория
  
  // Порядок отображения
  order: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  id: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: { type: String, required: true },
  nameBur: String,
  emoji: { type: String, required: true },
  description: { type: String, required: true },
  
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  gridSize: { type: Number, default: 6, min: 4, max: 10 },
  unlockRequirement: { type: Number, default: 0 },
  
  wordCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  
  order: { type: Number, default: 0 },
}, {
  timestamps: true,
});

CategorySchema.index({ order: 1 });
CategorySchema.index({ isActive: 1 });


// ============================================================================
// 5. REPORT (Жалобы/сообщения об ошибках)
// ============================================================================

export interface IReport extends Document {
  word?: Schema.Types.ObjectId;        // На какое слово жалоба
  contributor?: Schema.Types.ObjectId; // На какого пользователя
  reporter: Schema.Types.ObjectId;     // Кто подал жалобу
  
  type: 'word_error' | 'spam' | 'abuse' | 'suggestion' | 'bug' | 'other';
  message: string;                     // Текст жалобы/предложения
  
  status: 'open' | 'in_progress' | 'resolved' | 'rejected';
  resolution?: string;                 // Как разрешили
  resolvedBy?: Schema.Types.ObjectId;  // Кто разрешил
  resolvedAt?: Date;
  
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>({
  word: { type: Schema.Types.ObjectId, ref: 'Word' },
  contributor: { type: Schema.Types.ObjectId, ref: 'Contributor' },
  reporter: { type: Schema.Types.ObjectId, ref: 'Contributor', required: true },
  
  type: { 
    type: String, 
    enum: ['word_error', 'spam', 'abuse', 'suggestion', 'bug', 'other'],
    required: true,
  },
  message: { type: String, required: true, maxlength: 1000 },
  
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'resolved', 'rejected'],
    default: 'open',
  },
  resolution: String,
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'Contributor' },
  resolvedAt: Date,
}, {
  timestamps: true,
});

ReportSchema.index({ status: 1, createdAt: -1 });


// ============================================================================
// 6. ACTIVITY LOG (Лог активности для аналитики)
// ============================================================================

export interface IActivityLog extends Document {
  contributor?: Schema.Types.ObjectId;
  action: string;                      // Тип действия
  target?: {
    type: 'word' | 'contributor' | 'category';
    id: Schema.Types.ObjectId;
  };
  details?: Record<string, any>;       // Дополнительные данные
  ip?: string;                         // Хешированный IP
  userAgent?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  contributor: { type: Schema.Types.ObjectId, ref: 'Contributor' },
  action: { 
    type: String, 
    required: true,
    enum: [
      'word_created', 'word_voted', 'word_verified', 'word_rejected',
      'contributor_registered', 'contributor_login', 'contributor_banned',
      'report_created', 'report_resolved',
      'export_requested',
    ],
  },
  target: {
    type: { type: String, enum: ['word', 'contributor', 'category'] },
    id: Schema.Types.ObjectId,
  },
  details: Schema.Types.Mixed,
  ip: String,
  userAgent: String,
}, {
  timestamps: true,
  // Автоматическое удаление старых логов через 90 дней
  expireAfterSeconds: 90 * 24 * 60 * 60,
});

ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ contributor: 1, createdAt: -1 });


// ============================================================================
// ЭКСПОРТ МОДЕЛЕЙ
// ============================================================================

export const Contributor = mongoose.model<IContributor>('Contributor', ContributorSchema);
export const Word = mongoose.model<IWord>('Word', WordSchema);
export const Vote = mongoose.model<IVote>('Vote', VoteSchema);
export const Category = mongoose.model<ICategory>('Category', CategorySchema);
export const Report = mongoose.model<IReport>('Report', ReportSchema);
export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

// Типы для использования в API
export type ContributorDoc = IContributor;
export type WordDoc = IWord;
export type VoteDoc = IVote;
export type CategoryDoc = ICategory;
export type ReportDoc = IReport;
export type ActivityLogDoc = IActivityLog;


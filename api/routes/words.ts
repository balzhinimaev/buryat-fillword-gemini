// api/routes/words.ts
// API эндпоинты для работы со словами
// Примеры роутов для Express.js

import { Router, Request, Response } from 'express';
import { Word, Contributor, Vote, ActivityLog } from '../models';
import { VERIFICATION, LIMITS, API_MESSAGES } from '../config/constants';

const router = Router();

// ============================================================================
// GET /api/words - Получить список слов
// ============================================================================

interface GetWordsQuery {
  status?: 'pending' | 'verified' | 'rejected';
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'verificationScore' | 'difficulty';
  sortOrder?: 'asc' | 'desc';
}

router.get('/', async (req: Request<{}, {}, {}, GetWordsQuery>, res: Response) => {
  try {
    const {
      status = 'verified',
      categoryId,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: any = { status };
    
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [words, total] = await Promise.all([
      Word.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Math.min(limit, 100))
        .select('-editHistory -upvotes -downvotes')
        .lean(),
      Word.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: words,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ============================================================================
// GET /api/words/pending - Получить слова для верификации
// ============================================================================

router.get('/pending', async (req: Request, res: Response) => {
  try {
    const contributorId = req.headers['x-contributor-id'];
    
    // Исключаем свои слова и уже проголосованные
    const query: any = {
      status: 'pending',
      'contributor.id': { $ne: contributorId },
    };
    
    if (contributorId) {
      query.upvotes = { $ne: contributorId };
      query.downvotes = { $ne: contributorId };
    }

    const words = await Word.find(query)
      .sort({ createdAt: 1 }) // Старые сначала
      .limit(20)
      .lean();

    res.json({ success: true, data: words });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ============================================================================
// POST /api/words - Добавить новое слово
// ============================================================================

interface CreateWordBody {
  bur: string;
  ru: string;
  categoryId: string;
  example?: string;
  pronunciation?: string;
  partOfSpeech?: string;
}

router.post('/', async (req: Request<{}, {}, CreateWordBody>, res: Response) => {
  try {
    const contributorId = req.headers['x-contributor-id'] as string;
    
    if (!contributorId) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }

    const contributor = await Contributor.findById(contributorId);
    
    if (!contributor) {
      return res.status(404).json({ success: false, error: 'Контрибьютор не найден' });
    }
    
    if (contributor.isBanned) {
      return res.status(403).json({ success: false, error: API_MESSAGES.BANNED });
    }

    const { bur, ru, categoryId, example, pronunciation, partOfSpeech } = req.body;

    // Валидация
    const normalizedBur = bur.toUpperCase().trim();
    
    if (normalizedBur.length < LIMITS.MIN_WORD_LENGTH || 
        normalizedBur.length > LIMITS.MAX_WORD_LENGTH) {
      return res.status(400).json({ 
        success: false, 
        error: `Длина слова должна быть от ${LIMITS.MIN_WORD_LENGTH} до ${LIMITS.MAX_WORD_LENGTH} символов` 
      });
    }

    // Проверка на дубликат
    const existing = await Word.findOne({ bur: normalizedBur });
    if (existing) {
      return res.status(409).json({ success: false, error: API_MESSAGES.WORD_EXISTS });
    }

    // Проверка лимита на день
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await Word.countDocuments({
      'contributor.id': contributorId,
      createdAt: { $gte: today },
    });
    
    if (todayCount >= LIMITS.MAX_WORDS_PER_DAY) {
      return res.status(429).json({ success: false, error: API_MESSAGES.RATE_LIMIT });
    }

    // Создание слова
    const word = new Word({
      bur: normalizedBur,
      ru: ru.trim(),
      categoryId,
      example: example?.trim(),
      pronunciation: pronunciation?.trim(),
      partOfSpeech,
      contributor: {
        id: contributor._id,
        name: contributor.name,
      },
    });

    await word.save();

    // Обновляем статистику контрибьютора
    await Contributor.findByIdAndUpdate(contributorId, {
      $inc: { 'stats.wordsAdded': 1 },
      lastActiveAt: new Date(),
    });

    // Логируем активность
    await ActivityLog.create({
      contributor: contributorId,
      action: 'word_created',
      target: { type: 'word', id: word._id },
      details: { bur: normalizedBur, categoryId },
    });

    res.status(201).json({ 
      success: true, 
      message: API_MESSAGES.WORD_CREATED,
      data: word,
    });
  } catch (error) {
    console.error('Error creating word:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ============================================================================
// POST /api/words/:id/vote - Голосование за слово
// ============================================================================

interface VoteBody {
  type: 'upvote' | 'downvote';
  reason?: string;
}

router.post('/:id/vote', async (req: Request<{ id: string }, {}, VoteBody>, res: Response) => {
  try {
    const { id } = req.params;
    const { type, reason } = req.body;
    const contributorId = req.headers['x-contributor-id'] as string;

    if (!contributorId) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }

    const [word, contributor] = await Promise.all([
      Word.findById(id),
      Contributor.findById(contributorId),
    ]);

    if (!word) {
      return res.status(404).json({ success: false, error: API_MESSAGES.WORD_NOT_FOUND });
    }

    if (!contributor) {
      return res.status(404).json({ success: false, error: 'Контрибьютор не найден' });
    }

    if (contributor.isBanned) {
      return res.status(403).json({ success: false, error: API_MESSAGES.BANNED });
    }

    if (contributor.trustScore < VERIFICATION.MIN_TRUST_SCORE_TO_VOTE) {
      return res.status(403).json({ success: false, error: API_MESSAGES.LOW_TRUST });
    }

    // Нельзя голосовать за своё слово
    if (word.contributor.id.toString() === contributorId) {
      return res.status(400).json({ success: false, error: API_MESSAGES.CANNOT_VOTE_OWN });
    }

    // Проверка: уже голосовал?
    const hasUpvoted = word.upvotes.some(v => v.toString() === contributorId);
    const hasDownvoted = word.downvotes.some(v => v.toString() === contributorId);
    
    if (hasUpvoted || hasDownvoted) {
      return res.status(400).json({ success: false, error: API_MESSAGES.ALREADY_VOTED });
    }

    // Определяем вес голоса
    let voteWeight = 1;
    if (contributor.role === 'trusted') voteWeight = VERIFICATION.TRUSTED_VOTE_WEIGHT;
    if (contributor.role === 'moderator') voteWeight = VERIFICATION.MODERATOR_VOTE_WEIGHT;
    if (contributor.role === 'admin') voteWeight = 10;

    // Применяем голос
    if (type === 'upvote') {
      word.upvotes.push(contributor._id);
      word.verificationScore += voteWeight;
    } else {
      word.downvotes.push(contributor._id);
      word.verificationScore -= voteWeight;
    }

    // Проверяем порог верификации/отклонения
    if (word.upvotes.length >= VERIFICATION.MIN_UPVOTES_TO_VERIFY && word.status === 'pending') {
      word.status = 'verified';
      word.verifiedAt = new Date();
      word.isActiveInGame = true;
      
      // Бонус автору за верифицированное слово
      await Contributor.findByIdAndUpdate(word.contributor.id, {
        $inc: { 'stats.wordsApproved': 1, trustScore: 5 },
      });
    }

    if (word.downvotes.length >= VERIFICATION.MIN_DOWNVOTES_TO_REJECT && word.status === 'pending') {
      word.status = 'rejected';
      
      // Штраф автору за отклонённое слово
      await Contributor.findByIdAndUpdate(word.contributor.id, {
        $inc: { 'stats.wordsRejected': 1, trustScore: -3 },
      });
    }

    await word.save();

    // Сохраняем голос отдельно для аналитики
    await Vote.create({
      word: word._id,
      contributor: contributorId,
      type,
      reason: type === 'downvote' ? reason : undefined,
    });

    // Обновляем статистику голосующего
    await Contributor.findByIdAndUpdate(contributorId, {
      $inc: { 'stats.wordsVerified': 1 },
      lastActiveAt: new Date(),
    });

    // Логируем
    await ActivityLog.create({
      contributor: contributorId,
      action: 'word_voted',
      target: { type: 'word', id: word._id },
      details: { voteType: type, reason },
    });

    res.json({ 
      success: true, 
      message: API_MESSAGES.WORD_VOTED,
      data: {
        newStatus: word.status,
        verificationScore: word.verificationScore,
        upvotesCount: word.upvotes.length,
        downvotesCount: word.downvotes.length,
      },
    });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ============================================================================
// GET /api/words/export - Экспорт верифицированных слов
// ============================================================================

router.get('/export', async (req: Request, res: Response) => {
  try {
    const { categoryId, format = 'json' } = req.query;
    
    const query: any = { status: 'verified', isActiveInGame: true };
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const words = await Word.find(query)
      .select('bur ru categoryId example difficulty')
      .lean();

    // Группируем по категориям
    const byCategory: Record<string, { bur: string; ru: string }[]> = {};
    
    words.forEach(word => {
      if (!byCategory[word.categoryId]) {
        byCategory[word.categoryId] = [];
      }
      byCategory[word.categoryId].push({
        bur: word.bur,
        ru: word.ru,
      });
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      totalWords: words.length,
      byCategory,
    };

    if (format === 'ts') {
      // TypeScript формат для прямой вставки в код
      let tsContent = '// Автоматически сгенерировано из API\n';
      tsContent += `// Дата экспорта: ${new Date().toISOString()}\n\n`;
      tsContent += 'import type { WordData } from "../types";\n\n';
      
      for (const [catId, catWords] of Object.entries(byCategory)) {
        tsContent += `export const ${catId}Words: WordData[] = [\n`;
        for (const w of catWords) {
          tsContent += `  { bur: "${w.bur}", ru: "${w.ru}" },\n`;
        }
        tsContent += '];\n\n';
      }
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename=words.ts');
      return res.send(tsContent);
    }

    res.json({ success: true, data: exportData });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ============================================================================
// GET /api/words/stats - Статистика слов
// ============================================================================

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalWords,
      pendingWords,
      verifiedWords,
      rejectedWords,
      byCategory,
      topContributors,
    ] = await Promise.all([
      Word.countDocuments(),
      Word.countDocuments({ status: 'pending' }),
      Word.countDocuments({ status: 'verified' }),
      Word.countDocuments({ status: 'rejected' }),
      Word.aggregate([
        { $match: { status: 'verified' } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ]),
      Contributor.find()
        .sort({ 'stats.wordsAdded': -1 })
        .limit(10)
        .select('name stats.wordsAdded stats.wordsApproved')
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        totalWords,
        pendingWords,
        verifiedWords,
        rejectedWords,
        byCategory: byCategory.reduce((acc, c) => {
          acc[c._id] = c.count;
          return acc;
        }, {} as Record<string, number>),
        topContributors: topContributors.map(c => ({
          name: c.name,
          wordsAdded: c.stats.wordsAdded,
          wordsApproved: c.stats.wordsApproved,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

export default router;

